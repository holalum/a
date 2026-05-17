"""
GET /referrals — статистика и список рефералов
"""
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import Transaction, User
from ..schemas import ReferralResponse, ReferralsPageResponse

router = APIRouter(prefix="/referrals", tags=["referrals"])


@router.get("", response_model=ReferralsPageResponse)
async def get_referrals(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Список рефералов
    result = await db.execute(
        select(User).where(User.referred_by_id == user.id).order_by(User.created_at.desc())
    )
    referrals = result.scalars().all()

    # Заработок с каждого реферала
    ref_ids = [r.id for r in referrals]
    earnings_map: dict[int, Decimal] = {}
    if ref_ids:
        rows = await db.execute(
            select(Transaction.description, func.sum(Transaction.amount))
            .where(Transaction.user_id == user.id, Transaction.type == "referral")
            .group_by(Transaction.description)
        )
        # description формат: "Реферал @username" или "Реферал @telegram_id"
        # Нам нужна сумма по реферальному user_id — храним отдельно через username/tg_id
        # Проще — посчитать общий заработок от конкретного реферала через подзапрос
        pass

    # Для каждого реферала считаем заработок
    ref_list: list[ReferralResponse] = []
    total_earnings = Decimal("0")
    for ref in referrals:
        earned_result = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .where(
                Transaction.user_id == user.id,
                Transaction.type == "referral",
                Transaction.description.contains(str(ref.username or ref.telegram_id)),
            )
        )
        earned = Decimal(str(earned_result.scalar() or 0))
        total_earnings += earned
        ref_list.append(ReferralResponse(
            telegram_id=ref.telegram_id,
            username=ref.username,
            first_name=ref.first_name,
            joined_at=ref.created_at,
            earned_rub=earned,
        ))

    referral_link = f"https://t.me/{settings.BOT_USERNAME}?start={user.referral_code}"

    return ReferralsPageResponse(
        count=len(ref_list),
        earnings=total_earnings,
        commission=user.referral_commission,
        referral_link=referral_link,
        referrals=ref_list,
    )
