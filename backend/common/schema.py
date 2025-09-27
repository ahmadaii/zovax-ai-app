from datetime import datetime
from typing import Optional
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
        orm_mode = True


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
        orm_mode = True


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
        orm_mode = True


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
        orm_mode = True


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
        orm_mode = True
