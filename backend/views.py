from datetime import datetime, timedelta
import re, uuid, json, asyncio
from time import monotonic
from typing import Optional, Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status

from jose import JWTError, ExpiredSignatureError, jwt
from fastapi.security import OAuth2PasswordBearer

from fastapi.responses import StreamingResponse
from jose import jwt, JWTError, ExpiredSignatureError

from passlib.context import CryptContext
from sqlalchemy.orm import Session as OrmSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc

from common.config import Settings
from common.db_utils import get_db
from common.schema import (
    Tenant,
    User,
    Session,
    Conversation,
    AuthResponse,
    SignUpRequest,
    SignInRequest,
    ConversationRequest,
    SavePartialRequest,
    SessionOut,
    MessageOut,
)
from services.chat.callback_manager import (
    StreamMessagesCallbackHandler,
    StreamToolUseCallbackHandler
)
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
    sessions = db.query(Session).filter(Session.user_id == user_id).order_by(desc(Session.created_at)).all()

    if not sessions:
        raise HTTPException(status_code=404, detail="No sessions found for this user")

    return sessions


@session_router.delete("/", response_model=bool)
async def delete_session(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: int,   # use proper types if DB uses ints
    user_id: int,
    session_id: int,
    db: Session = Depends(get_db),  # SQLAlchemy session
):
    """
    Delete a single session (and its conversations) for a user within a tenant.
    """

    # --- Authorization ---
    if current_user.role != "owner":
      if current_user.tenant_id != tenant_id or current_user.user_id != user_id:
          raise HTTPException(status_code=403, detail="Not authorized to delete this session")
    else:
      if current_user.tenant_id != tenant_id:
          raise HTTPException(status_code=403, detail="Not authorized to delete sessions in this tenant")

    # --- Validate user belongs to tenant ---
    user = (
        db.query(User)
        .filter(User.user_id == user_id, User.tenant_id == tenant_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found in this tenant")

    # --- Scope session to both user and tenant ---
    session_q = (
        db.query(Session)
        .filter(
            Session.id == session_id,
            Session.user_id == user_id,
        )
    )
    exists = session_q.first()
    if not exists:
        raise HTTPException(status_code=404, detail="Session not found")

    # --- Delete children then parent (or rely on ON DELETE CASCADE) ---
    db.query(Conversation)\
      .filter(
          Conversation.session_id == session_id,
      )\
      .delete(synchronize_session=False)

    session_q.delete(synchronize_session=False)

    db.commit()
    return True


@session_router.get("/chat",response_model=List[MessageOut])
async def get_session_messages(
    current_user: Annotated[User, Depends(get_current_user)],
    tenant_id: str,
    user_id: str,
    session_id: str,
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

    # --- Fetch all messages of the session ---
    messages = db.query(Conversation).filter(Conversation.session_id == session_id)

    if not messages:
        raise HTTPException(status_code=404, detail="No messages found for this session")

    return messages


@conversation_router.post("/save_partial")
def save_partial(req: SavePartialRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1) validate session belongs to user
    session_obj = db.query(Session).filter(Session.id == req.session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
    # (optional) if you store tenant_id on Session: check it matches current_user.tenant_id
    # (optional) if you store user_id on Session: ensure session_obj.user_id == current_user.user_id

    # 2) idempotent upsert by (session_id, client_req_id, owner='assistant')
    existing = (
        db.query(Conversation)
          .filter(Conversation.session_id == req.session_id,
                  Conversation.owner == "assistant",
                  Conversation.client_req_id == req.client_req_id)
          .order_by(Conversation.id.desc())
          .first()
    )

    # 3) compose message (FE will already append the tail note; server leaves as-is)
    text_to_save = req.message
    status = "cancelled"
    end_reason = req.reason or "client_abort"

    if existing:
        if existing.status != "complete":
            existing.text = text_to_save
            existing.status = status
            existing.end_reason = end_reason
            existing.token_count = len(text_to_save)
            existing.updated_at = datetime.utcnow()
            db.add(existing); db.commit(); db.refresh(existing)
        # if complete, we do nothing (final won the race)
        conv_id = existing.id
    else:
        new_conv = Conversation(
            session_id=req.session_id,
            owner="assistant",
            text=text_to_save,
            status=status,
            end_reason=end_reason,
            token_count=len(text_to_save),
            client_req_id=req.client_req_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(new_conv); db.commit(); db.refresh(new_conv)
        conv_id = new_conv.id

    return {"ok": True, "conversation_id": conv_id}



@conversation_router.post("/chat_response")
async def chat_response(
    request: ConversationRequest,
    current_user: User = Depends(get_current_user),
    db: OrmSession = Depends(get_db),
):
    """
    Streams assistant tokens to the client.
    DB writes:
      - persist user turn immediately
      - persist assistant turn ONLY once at the end (final); if FE saved a partial
        row via /conversation/save_partial with same client_req_id, we "upgrade" it.
    On abort (navigation): FE should call /conversation/save_partial (single write).
    """

    # 1) Validate session ownership or create a new session
    session_obj: Optional[Session] = None
    if request.session_id:
        session_obj = (
            db.query(Session)
            .filter(Session.id == request.session_id)
            .first()
        )
        if not session_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        # Optional: ensure the session belongs to the current user
        if session_obj.user_id != current_user.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    else:
        # Create new session with topic as the user's prompt (trimmed)
        topic_guess = request.message.strip()
        if len(topic_guess) > 60:
            topic_guess = topic_guess[:57].rstrip() + "…"
        session_obj = Session(
            user_id=current_user.user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            topic=topic_guess or "New chat",
            status="active",
            message_count=0,
        )
        db.add(session_obj)
        db.commit()
        db.refresh(session_obj)

    # 2) Persist the user turn immediately
    user_turn = Conversation(
        session_id=session_obj.id,
        owner="user",
        text=request.message,
        status="complete",
        token_count=len(request.message or ""),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(user_turn)
    # bump message_count (user turn)
    session_obj.message_count = (session_obj.message_count or 0) + 1
    session_obj.updated_at = datetime.utcnow()
    db.add(session_obj)
    db.commit()
    db.refresh(user_turn)
    db.refresh(session_obj)

    # 3) Prepare conversation history (unless reset_context)
    if request.reset_context:
        history: List[Dict[str, Any]] = []
    else:
        rows: List[Conversation] = (
            db.query(Conversation)
            .filter(Conversation.session_id == session_obj.id)
            .order_by(Conversation.created_at.asc())
            .all()
        )
        history = [
            {
                "type": "human" if row.owner == "user" else "assistant",
                "content": row.text,
                "metadata": {
                    "id": row.id,
                    "session_id": row.session_id,
                    "created_at": row.created_at.isoformat(),
                    "status": row.status,
                    "client_req_id": getattr(row, "client_req_id", None),
                },
            }
            for row in rows
        ]

    # 4) Set up your streaming handlers (unchanged)
    queue: asyncio.Queue = asyncio.Queue()
    llm_stream = StreamMessagesCallbackHandler(queue)
    agent_stream = StreamToolUseCallbackHandler(queue)

    client_req_id = request.client_req_id  # may be None; FE should send UUID for idempotency
    SEP = "###END###"

    async def generate():
        # Optional: let client know we started
        yield f'{json.dumps({"type":"session","session_id": session_obj.id})}{SEP}\n'
        yield f'{json.dumps({"type": "log", "content": "Message received, working..."})}{SEP}\n'

        assistant_tokens: List[str] = []
        try:
            # Stream from your model/agent
            async for res in createGen(history, llm_stream, agent_stream, queue):
                # Normalize the provider output -> plain token string; drop 'first_token'
                if isinstance(res, dict):
                    if res.get("type") == "first_token":
                        continue
                    token = str(res.get("content", "") or "")
                else:
                    token = str(res or "")

                if not token:
                    continue

                assistant_tokens.append(token)
                # forward to client as a token event
                yield f'{json.dumps({"type": "token", "content": token})}{SEP}\n'

            # DONE: assemble final text
            assistant_message = "".join(assistant_tokens)

            # 5) FINAL SAVE (or upgrade a partial saved by /conversation/save_partial)
            existing = None
            if client_req_id:
                existing = (
                    db.query(Conversation)
                    .filter(
                        Conversation.session_id == session_obj.id,
                        Conversation.owner == "assistant",
                        Conversation.client_req_id == client_req_id,
                    )
                    .order_by(Conversation.id.desc())
                    .first()
                )

            if existing:
                # Upgrade the partial to complete
                existing.text = assistant_message
                existing.status = "complete"
                existing.end_reason = "done"
                existing.token_count = len(assistant_message)
                existing.updated_at = datetime.utcnow()
                db.add(existing)
            else:
                # Insert fresh assistant turn
                assistant_turn = Conversation(
                    session_id=session_obj.id,
                    owner="assistant",
                    text=assistant_message,
                    status="complete",
                    end_reason="done",
                    token_count=len(assistant_message),
                    client_req_id=client_req_id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(assistant_turn)

            # bump message_count (assistant turn)
            session_obj.message_count = (session_obj.message_count or 0) + 1
            session_obj.updated_at = datetime.utcnow()
            db.add(session_obj)

            db.commit()

        except asyncio.CancelledError:
            # Client navigated away / aborted fetch; FE will call /conversation/save_partial
            yield f'{json.dumps({"type": "cancelled", "content": "client_abort"})}{SEP}\n'
            # No DB write here by design (single-write model)
        except Exception as e:
            # Optionally log server-side; keep wire protocol clean
            yield f'{json.dumps({"type": "error", "content": str(e)})}{SEP}\n'
            # You could also persist an error-row if you want a single DB write here.
        finally:
            yield f'{json.dumps({"type": "final_token", "content": ""})}{SEP}\n'
    
    headers = {
        "X-Session-Id": str(session_obj.id),
        "Access-Control-Expose-Headers": "X-Session-Id",
    }

    return StreamingResponse(generate(), media_type="application/json", headers=headers)
