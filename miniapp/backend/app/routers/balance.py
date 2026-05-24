from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..deps import get_current_user
from ..models import PromoCode, PromoUse, Transaction, User
from ..schemas import BalanceResponse, PromoRequest, PromoResponse, TopUpRequest, TransactionResponse

router = APIRouter(prefix="/balance", tags=["balance"])


@router.get("", response_model=BalanceResponse)
async def get_balance(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.created_at.desc())
        .limit(50)
    )
    txs = result.scalars().all()
    return BalanceResponse(
        balance=user.balance,
        transactions=[
            TransactionResponse(
                id=t.id,
                type=t.type,
                amount=t.amount,
                description=t.description,
                created_at=t.created_at,
            )
            for t in txs
        ],
    )


@router.post("/promo", response_model=PromoResponse)
async def apply_promo(
    body: PromoRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    code = body.code.strip().upper()

    result = await db.execute(select(PromoCode).where(PromoCode.code == code))
    promo = result.scalar_one_or_none()

    if not promo:
        raise HTTPException(status_code=404, detail="Промокод не найден")

    now = datetime.now(timezone.utc)
    if promo.expires_at and promo.expires_at < now:
        raise HTTPException(status_code=400, detail="Промокод истёк")

    if promo.used_count >= promo.max_uses:
        raise HTTPException(status_code=400, detail="Промокод уже использован")

    already = await db.execute(
        select(PromoUse).where(and_(PromoUse.promo_id == promo.id, PromoUse.user_id == user.id))
    )
    if already.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Вы уже использовали этот промокод")

    user.balance += promo.amount
    promo.used_count += 1
    db.add(PromoUse(promo_id=promo.id, user_id=user.id))
    db.add(Transaction(
        user_id=user.id,
        type="topup",
        amount=promo.amount,
        description=f"Промокод {code}",
    ))
    await db.commit()

    return PromoResponse(amount=promo.amount, message=f"Начислено {promo.amount} ₽")


@router.post("/topup")
async def topup(body: TopUpRequest, user: User = Depends(get_current_user)):
    if body.amount < 50 or body.amount > 50000:
        raise HTTPException(status_code=400, detail="Сумма от 50 до 50 000 ₽")
    return {"message": "Оплата пока недоступна", "amount": body.amount}