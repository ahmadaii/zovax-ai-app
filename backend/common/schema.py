from datetime import datetime
from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

# ------------------------
# SQLAlchemy Models
# ------------------------

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    logo = Column(String, nullable=True)

    users = relationship("User", back_populates="tenant")


class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, nullable=False)
    email_address = Column(String, unique=True, nullable=False)
    phone_number = Column(String, nullable=True)
    password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    role = Column(String, nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))

    tenant = relationship("Tenant", back_populates="users")
    sessions = relationship("Session", back_populates="user")


class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    message_count = Column(Integer, default=0)
    topic = Column(String, nullable=True)
    status = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))

    user = relationship("User", back_populates="sessions")
    conversations = relationship("Conversation", back_populates="session")


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    text = Column(String, nullable=False)
    owner = Column(String, nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"))

    session = relationship("Session", back_populates="conversations")


class Resource(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)
    category = Column(String, nullable=True)
    author = Column(String, nullable=True)
    size = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    file_url = Column(String, nullable=False)


# ------------------------
# Pydantic Models
# ------------------------

# Tenant
class TenantBase(BaseModel):
    name: str
    logo: Optional[str] = None

class TenantCreate(TenantBase):
    pass

class TenantRead(TenantBase):
    id: int
    class Config:
        from_attributes = True


# User
class UserBase(BaseModel):
    user_name: str
    email_address: EmailStr
    phone_number: Optional[str] = None
    role: str
    tenant_id: Optional[int] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserRead(UserBase):
    user_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


# Session
class SessionBase(BaseModel):
    topic: Optional[str] = None
    status: Optional[str] = None

class SessionCreate(SessionBase):
    user_id: int

class SessionRead(SessionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    message_count: int
    class Config:
        from_attributes = True


# Conversation
class ConversationBase(BaseModel):
    text: str
    owner: str

class ConversationCreate(ConversationBase):
    session_id: int

class ConversationRead(ConversationBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# Resource
class ResourceBase(BaseModel):
    title: str
    type: str
    category: Optional[str] = None
    author: Optional[str] = None
    size: Optional[str] = None
    file_url: str

class ResourceCreate(ResourceBase):
    pass

class ResourceRead(ResourceBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class SignUpRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    company_name: str = Field(..., min_length=2, max_length=150)
    whatsapp_business_phone: Optional[str] = Field(None, pattern=r"^\+?[0-9\-()\s]{7,20}$")
    accept_terms: bool = Field(..., description="Must be True to create an account")

class AuthUser(BaseModel):
    user_id: int
    user_name: str
    email_address: EmailStr
    role: str
    tenant_id: Optional[int] = None
    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser

class SignInRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

class ConversationTurn(BaseModel):
    role: Literal["user", "assistant"] = Field(
        ...,
        description="Who sent this message: user or assistant."
    )
    message: str = Field(
        ...,
        description="The text content of the message."
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Extra details like timestamp, channel, attachments."
    )

class ConversationRequest(BaseModel):
    tenant_id: Optional[int] = Field(
        default=None,
        description="Tenant identifier (required in multi-tenant setups)."
    )
    user_id: int = Field(
        ...,
        description="Unique identifier of the user within the tenant."
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Existing session ID to continue. If not provided, a new session will be created."
    )
    message: str = Field(
        ...,
        description="User's latest message to the assistant."
    )
    reset_context: bool = Field(
        default=False,
        description="If true, ignore provided history and start fresh."
    )

class ConversationResponse(BaseModel):
    session_id: str = Field(..., description="Conversation session ID")
    user_id: str = Field(..., description="User identifier")
    tenant_id: Optional[str] = Field(None, description="Tenant identifier if multi-tenant")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When this event was created")

    type: Literal["log", "first_token", "token", "final_token", "error"] = Field(
        ..., description="Type of streaming event"
    )
    content: str = Field(..., description="Payload for this event (empty string for first_token/final_token)")


