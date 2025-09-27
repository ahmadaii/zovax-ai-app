from datetime import datetime, timedelta
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from common.config import Settings
from common.db_utils import get_db
from common.schema import Tenant, User, AuthResponse, SignUpRequest, SignInRequest

settings = Settings()

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
)

def hash_password(raw: str) -> str:
    if len(raw) > 512:
        raise ValueError("Password is too long.")
    return pwd_context.hash(raw)

def verify_password(raw: str, hashed: str) -> bool:
    return pwd_context.verify(raw, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.jwt_expire_minutes))
    to_encode = {**data, "exp": expire}
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

router = APIRouter(prefix="/auth", tags=["auth"])

_password_reqs = [
    (re.compile(r"[A-Z]"), "at least one uppercase letter"),
    (re.compile(r"[a-z]"), "at least one lowercase letter"),
    (re.compile(r"[0-9]"), "at least one number"),
    (re.compile(r"[^A-Za-z0-9]"), "at least one special character"),
]

def validate_password_strength(pwd: str):
    failures = [hint for rx, hint in _password_reqs if not rx.search(pwd)]
    if failures:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Password must contain {', '.join(failures)}."
        )

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignUpRequest, db: Session = Depends(get_db)):
    # ...validate terms, password match, regex strength, uniqueness checks...

    try:
        # Anything in this block will auto-rollback on exception
        with db.begin():
            tenant = Tenant(name=payload.company_name, logo=None)
            db.add(tenant)
            db.flush()  # get tenant.id

            user = User(
                user_name=payload.full_name,
                email_address=str(payload.email).lower(),
                phone_number=payload.whatsapp_business_phone,
                password=hash_password(payload.password),  # Argon2 hashes here
                role="owner",
                tenant_id=tenant.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(user)

        # Outside the 'with' block the transaction is committed.
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        # Re-check to send precise message
        if db.query(User).filter(User.email_address == str(payload.email).lower()).first():
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        if db.query(Tenant).filter(Tenant.name.ilike(payload.company_name)).first():
            raise HTTPException(status_code=409, detail="A company with this name already exists.")
        raise HTTPException(status_code=400, detail="Could not create account due to a database constraint.")
    except ValueError as ve:
        # catches our "Password too long" guard if you add one
        db.rollback()
        raise HTTPException(status_code=422, detail=str(ve))

    token = create_access_token({"sub": str(user.user_id), "tenant_id": tenant.id, "role": user.role})
    return AuthResponse(access_token=token, user=user)


@router.post("/signin", response_model=AuthResponse)
def signin(payload: SignInRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_address == str(payload.email).lower()).first()
    if not user or not verify_password(payload.password, user.password):
        # Generic message to avoid leaking which part failed
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"sub": str(user.user_id), "tenant_id": user.tenant_id, "role": user.role})
    return AuthResponse(access_token=token, user=user)
