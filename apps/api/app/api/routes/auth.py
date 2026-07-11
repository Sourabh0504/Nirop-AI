from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import AUTH_COOKIE_NAME, CurrentUser
from app.core.config import get_settings
from app.core.db import async_session_factory
from app.core.security import create_access_token, verify_password
from app.models.models import User
from app.schemas.auth import LoginRequest, UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


@router.post("/login", response_model=UserRead)
async def login(payload: LoginRequest, response: Response) -> User:
    async with async_session_factory() as db:
        user = await db.scalar(select(User).where(User.email == payload.email.lower()))

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    token = create_access_token(subject=user.id, role=user.role)
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.environment != "development",
        max_age=settings.jwt_expire_minutes * 60,
    )
    return user


@router.post("/logout")
async def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(AUTH_COOKIE_NAME)
    return {"ok": True}


@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUser) -> User:
    return current_user
