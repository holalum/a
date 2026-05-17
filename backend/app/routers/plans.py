"""
GET  /plans           — список тарифов
POST /plans/purchase  — купить тариф (списать баланс + продлить в Remnawave)
"""
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import Transaction, User
from ..remnawave import extend_user, get_user_by_telegram_id
from ..schemas import PlanResponse, PurchaseRequest, SubscriptionResponse

router = APIRouter(prefix="/plans", tags=["plans"])

PLANS = [
    PlanResponse(id="month",   name="Месяц",    price_rub=199,  duration_days=30,  devices=3,  features=["Все локации", "3 устройства", "Безлимитный трафик"]),
    PlanResponse(id="quarter", name="3 месяца", price_rub=499,  old_price_rub=597, duration_days=90,  devices=5,  features=["Все локации", "5 устройств", "Безлимитный трафик", "Premium-сервера"], popular=True),
    PlanResponse(id="year",    name="Год",      price_rub=1490, old_price_rub=2388, duration_days=365, devices=10, features=["Все локации", "10 устройств", "Безлимитный трафик", "Premium-сервера", "Приоритетная поддержка"]),
]
_PLANS_BY_ID = {p.id: p for p in PLANS}


@router.get("", response_model=list[PlanResponse])
async def list_plans(_: User = Depends(get_current_user)):
    return PLANS


@router.post("/purchase", response_model=SubscriptionResponse)
async def purchase_plan(
    body: PurchaseRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan = _PLANS_BY_ID.get(body.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Тариф не найден")

    price = Decimal(plan.price_rub)
    if user.balance < price:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Недостаточно средств. Нужно {price} ₽, на балансе {user.balance} ₽",
        )

    if not user.remnawave_uuid:
        raise HTTPException(status_code=502, detail="Remnawave user not found")

    # Получаем текущую дату истечения из Remnawave
    rw_user = await get_user_by_telegram_id(user.telegram_id)
    current_expire = rw_user["expireAt"] if rw_user else datetime.now(timezone.utc).isoformat()

    # Продлеваем в Remnawave
    rw_updated = await extend_user(user.remnawave_uuid, plan.duration_days, current_expire)

    # Списываем баланс
    user.balance -= price
    tx = Transaction(user_id=user.id, type="spend", amount=-price, description=f"Тариф «{plan.name}»")
    db.add(tx)

    # Реферальный бонус рефереру
    if user.referred_by_id:
        referrer = await db.get(User, user.referred_by_id)
        if referrer:
            commission = (price * Decimal(referrer.referral_commission) / 100).quantize(Decimal("0.01"))
            referrer.balance += commission
            db.add(Transaction(
                user_id=referrer.id,
                type="referral",
                amount=commission,
                description=f"Реферал @{user.username or user.telegram_id}",
            ))

    await db.commit()

    expire_at = datetime.fromisoformat(rw_updated["expireAt"].replace("Z", "+00:00"))
    created_at = datetime.fromisoformat(rw_updated["createdAt"].replace("Z", "+00:00"))
    return SubscriptionResponse(
        plan=f"Harmony {plan.name}",
        status="active",
        expire_at=expire_at,
        started_at=created_at,
        subscription_url=rw_updated.get("subscriptionUrl", ""),
        total_days=plan.duration_days,
        auto_renew=False,
    )
