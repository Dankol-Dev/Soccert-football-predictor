"""Authentication service — register, login, token refresh."""

from datetime import timedelta

import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas import UserCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def register_user(db: Session, payload: UserCreate) -> User:
    if get_user_by_email(db, payload.email):
        raise ValueError("An account with this email already exists")
    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_tokens(user: User) -> tuple[str, str]:
    extra = {"email": user.email, "role": user.role}
    access = create_access_token(user.id, extra)
    refresh = create_refresh_token(user.id, extra)
    return access, refresh


def refresh_tokens(refresh_token: str, db: Session) -> tuple[str, str]:
    try:
        payload = decode_token(refresh_token)
    except jwt.PyJWTError as exc:
        raise ValueError("Invalid or expired refresh token") from exc

    if payload.get("type") != "refresh":
        raise ValueError("Invalid refresh token type")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise ValueError("User not found or inactive")

    return create_tokens(user)


def token_lifetime_seconds() -> int:
    return timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES).total_seconds()
