"""
GET /me              — профиль
GET /me/subscription — статус подписки из Remnawave
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..deps import get_current_user
from ..models import Transaction, User
from ..remnawave import get_user_by_telegram_id
from ..schemas import ProfileResponse, SubscriptionResponse

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=ProfileResponse)
async def get_me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Кол-во рефералов
    ref_count = await db.scalar(select(func.count()).where(User.referred_by_id == user.id))
    # Заработок с рефералов
    ref_earnings = await db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(Transaction.user_id == user.id, Transaction.type == "referral")
    )
    return ProfileResponse(
        telegram_id=user.telegram_id,
        first_name=user.first_name,
        last_name=user.last_name,
        username=user.username,
        balance=user.balance,
        referral_code=user.referral_code,
        referral_commission=user.referral_commission,
        referrals_count=ref_count or 0,
        referral_earnings=ref_earnings or 0,
    )


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.remnawave_uuid:
        raise HTTPException(status_code=404, detail="Remnawave user not found")

    rw = await get_user_by_telegram_id(user.telegram_id)
    if rw is None:
        raise HTTPException(status_code=404, detail="Remnawave user not found")

    expire_at = datetime.fromisoformat(rw["expireAt"].replace("Z", "+00:00"))
    created_at = datetime.fromisoformat(rw["createdAt"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)

    if rw["status"] == "ACTIVE" and expire_at > now:
        sub_status = "active"
    elif rw["status"] == "ACTIVE" and expire_at <= now:
        sub_status = "expired"
    else:
        sub_status = "expired"

    total_days = max(1, (expire_at - created_at).days)

    return SubscriptionResponse(
        plan="Harmony VPN",
        status=sub_status,
        expire_at=expire_at,
        started_at=created_at,
        subscription_url=rw.get("subscriptionUrl", ""),
        total_days=total_days,
        auto_renew=False,
    )
