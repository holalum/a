"""
POST /auth/telegram  — принимает initData, возвращает JWT.
При первом входе создаёт юзера в нашей БД и в Remnawave.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import User
from ..remnawave import create_user, get_user_by_telegram_id
from ..schemas import AuthRequest, TokenResponse
from ..telegram_auth import validate_init_data

router = APIRouter(prefix="/auth", tags=["auth"])


def _make_jwt(telegram_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_TTL_HOURS)
    return jwt.encode({"sub": str(telegram_id), "exp": exp}, settings.SECRET_KEY, algorithm="HS256")


@router.post("/telegram", response_model=TokenResponse)
async def auth_telegram(body: AuthRequest, db: AsyncSession = Depends(get_db)):
    tg_user = validate_init_data(body.init_data)
    telegram_id: int = tg_user["id"]

    # Ищем юзера в нашей БД
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if user is None:
        # Новый юзер — создаём в Remnawave
        rw_username = f"tg{telegram_id}"
        rw_user = await get_user_by_telegram_id(telegram_id)
        if rw_user is None:
            rw_user = await create_user(
                telegram_id=telegram_id,
                username=rw_username,
                trial_days=settings.TRIAL_DAYS,
                device_limit=settings.DEFAULT_DEVICE_LIMIT,
            )
        user = User(
            telegram_id=telegram_id,
            remnawave_uuid=rw_user["uuid"],
            first_name=tg_user.get("first_name", ""),
            last_name=tg_user.get("last_name"),
            username=tg_user.get("username"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Обновляем имя/username если изменилось
        changed = False
        for field in ("first_name", "last_name", "username"):
            val = tg_user.get(field)
            if getattr(user, field) != val:
                setattr(user, field, val)
                changed = True
        if changed:
            await db.commit()

    return TokenResponse(access_token=_make_jwt(telegram_id))
