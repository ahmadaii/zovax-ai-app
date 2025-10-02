from datetime import datetime, timedelta
import re, uuid, json, asyncio
from typing import Optional, Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks

from jose import JWTError, ExpiredSignatureError, jwt
from fastapi.security import OAuth2PasswordBearer

from fastapi.responses import StreamingResponse
from jose import jwt, JWTError, ExpiredSignatureError

from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from common.config import Settings
from common.db_utils import get_db
from common.schema import Tenant, User, Session, Conversation, AuthResponse, SignUpRequest, SignInRequest, ConversationRequest,ConversationResponse,SessionOut

from services.chat.callback_manager import (StreamMessagesCallbackHandler, StreamToolUseCallbackHandler)
from services.chat.chat import createGen

settings = Settings()

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


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


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ----- Dependency to decode JWT -----
def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: Session = Depends(get_db)
    ):

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )

        user_id: str = payload.get("sub")
        tenant_id: str = payload.get("tenant_id")
        role: str = payload.get("role")

        if user_id is None or tenant_id is None:
            raise HTTPException(status_code=401, detail="Invalid token claims")

        #return payload  # you can also fetch User object from DB here
        user = db.query(User).filter(User.user_id == user_id, User.tenant_id == tenant_id).first()

        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    
# Authentication    
auth_router = APIRouter(prefix="/auth", tags=["auth"])
# Conversation
conversation_router = APIRouter(prefix="/conversation", tags=["conversation"])
# Sessions
session_router = APIRouter(prefix="/session", tags=["session"])

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

@auth_router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
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


@auth_router.post("/signin", response_model=AuthResponse)
def signin(payload: SignInRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_address == str(payload.email).lower()).first()
    if not user or not verify_password(payload.password, user.password):
        # Generic message to avoid leaking which part failed
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"sub": str(user.user_id), "tenant_id": user.tenant_id, "role": user.role})

    return AuthResponse(access_token=token, user=user)

@session_router.get("/",response_model=List[SessionOut])
async def get_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: str,
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Get all sessions related to a specific user under a tenant.
    """

    # --- Authorization ---
    if current_user.role != "owner" and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these sessions")

    # --- Check if the user exists in this tenant ---
    user = db.query(User).filter(
        User.user_id == user_id,
        User.tenant_id == tenant_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found in this tenant")

    # --- Fetch all sessions of the user ---
    sessions = db.query(Session).filter(Session.user_id == user_id).all()

    if not sessions:
        raise HTTPException(status_code=404, detail="No sessions found for this user")

    return sessions
    

@conversation_router.post("/chat_response") #response_model=ConversationResponse
async def chat_response(
    request: ConversationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    
    # 1. Verify that the current user exists in the database
    #    and that they belong to the tenant provided in the request.
    #    If not, raise an HTTP 403/404 error.
    db_user = db.query(User).filter(User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if request.tenant_id and db_user.tenant_id != request.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to this tenant"
        )
    
    # 2. Check if request.session_id is provided:
    #    - If yes, try to load the existing session from DB.
    #    - If not found → return 404 (invalid session).
    #    - If no session_id provided → create a new conversation session
    #      and store it in DB.
    session_obj = None
    if request.session_id:
        session_obj = (
            db.query(Session)
            .filter(Session.id == request.session_id)
            .first()
        )
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
    else:
        # Create a new session
        #new_session_id = str(uuid.uuid4())
        session_obj = Session(
            #id=new_session_id,
            user_id=current_user.user_id,
            #tenant_id=request.tenant_id or db_user.tenant_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            topic=request.message,
            status="active"
        )
        db.add(session_obj)
        db.commit()
        db.refresh(session_obj)

    # 3. Append the new user message (request.message) 
    # - as a ConversationTurn (role="user") into the session history.
    user_turn = Conversation(
        session_id=session_obj.id,
        owner="user",
        text=request.message,
        created_at=datetime.utcnow()
    )
    db.add(user_turn)
    db.commit()
    db.refresh(user_turn)

    # 4. If session exists and reset_context=False:
    #    - Load existing conversation history from DB.
    #    - Otherwise, ignore history and start fresh.
    conversation_history = []
    if not request.reset_context:
        # Load conversation turns linked to this session
        conversation_history = (
            db.query(Conversation)
            .filter(Conversation.session_id == session_obj.id)
            .order_by(Conversation.created_at.asc())
            .all()
        )
    else:
        # Reset context: clear previous turns (optional)
        conversation_history = []

    # @TODO : Process history to convert into agent format.
    # Convert to list of dicts
    conversation_history_list = [
        {
            "type": "human" if conv.owner == "user" else "assistant",
            "content": conv.text,
            "metadata": {
                "id": conv.id,
                "session_id": conv.session_id,
                "created_at": conv.created_at.isoformat()
            }
        }
        for conv in conversation_history
    ]

    #return conversation_history_list

    queue = asyncio.Queue()
    llm_stream = StreamMessagesCallbackHandler(queue)
    agent_stream = StreamToolUseCallbackHandler(queue)

    history = [{"role": "user", "content": "hi"}]

    async def generate():

        assistant_buffer = []

        yield '{"type": "log", "content": "Message received, working..."}###END###\n'
        try:
            skip_first_token = True
            async for res in createGen(conversation_history_list,llm_stream,agent_stream,queue):
                if skip_first_token:
                    skip_first_token = False
                    yield f'{json.dumps(res)}###END###\n'
                else:
                    assistant_buffer.append(res)
                    yield f'{json.dumps({"type":"token","content":res})}###END###\n'

            assistant_message = "".join(assistant_buffer)

            assistant_turn = Conversation(
                session_id=session_obj.id,
                owner="assistant",
                text=assistant_message,
                created_at=datetime.utcnow()
            )
            db.add(assistant_turn)
            db.commit()
            db.refresh(assistant_turn)

        except Exception as e:
            yield f'{json.dumps({"type": "success", "content":f"{e}"})}###END###\n'
        yield '{"type": "final_token", "content": ""}###END###\n'

    return StreamingResponse(generate(), media_type="application/json")

