"""
GET  /wheel        — статус (можно ли крутить + история)
POST /wheel/spin   — крутануть колесо
"""
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import Transaction, User, WheelSpin
from ..remnawave import extend_user, get_user_by_telegram_id
from ..schemas import PrizeResponse, SpinHistoryItem, SpinResponse, WheelStatusResponse

router = APIRouter(prefix="/wheel", tags=["wheel"])

# Те же призы, что на фронте (id должны совпадать для правильной анимации)
PRIZES = [
    {"id": "days7",    "label": "+7 дней",    "short_label": "7 дней",  "kind": "days",    "amount": Decimal("7"),   "weight": 15, "color": "#6C63FF"},
    {"id": "nothing1", "label": "Мимо",        "short_label": "Мимо",    "kind": "nothing", "amount": Decimal("0"),   "weight": 25, "color": "#2A2A3D"},
    {"id": "rub50",    "label": "+50 ₽",       "short_label": "50 ₽",    "kind": "balance", "amount": Decimal("50"),  "weight": 20, "color": "#FF6584"},
    {"id": "nothing2", "label": "Мимо",        "short_label": "Мимо",    "kind": "nothing", "amount": Decimal("0"),   "weight": 25, "color": "#2A2A3D"},
    {"id": "days1",    "label": "+1 день",     "short_label": "1 день",  "kind": "days",    "amount": Decimal("1"),   "weight": 10, "color": "#43E97B"},
    {"id": "rub200",   "label": "+200 ₽",      "short_label": "200 ₽",   "kind": "balance", "amount": Decimal("200"), "weight": 4,  "color": "#FA8231"},
    {"id": "days30",   "label": "+30 дней",    "short_label": "30 дней", "kind": "days",    "amount": Decimal("30"),  "weight": 1,  "color": "#FFD700"},
]
_PRIZES_BY_ID = {p["id"]: p for p in PRIZES}


def _pick_prize() -> dict:
    weights = [p["weight"] for p in PRIZES]
    return random.choices(PRIZES, weights=weights, k=1)[0]


def _prize_index(prize_id: str) -> int:
    for i, p in enumerate(PRIZES):
        if p["id"] == prize_id:
            return i
    return 0


@router.get("", response_model=WheelStatusResponse)
async def wheel_status(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    last_spin = await _last_spin(user.id, db)
    can_spin, next_spin_at = _cooldown_check(last_spin)

    history_result = await db.execute(
        select(WheelSpin)
        .where(WheelSpin.user_id == user.id)
        .order_by(WheelSpin.spun_at.desc())
        .limit(10)
    )
    history = [
        SpinHistoryItem(prize_label=s.prize_label, prize_kind=s.prize_kind, spun_at=s.spun_at)
        for s in history_result.scalars().all()
    ]

    return WheelStatusResponse(can_spin=can_spin, next_spin_at=next_spin_at, history=history)


@router.post("/spin", response_model=SpinResponse)
async def spin_wheel(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    last_spin = await _last_spin(user.id, db)
    can_spin, next_spin_at = _cooldown_check(last_spin)

    if not can_spin:
        raise HTTPException(
            status_code=429,
            detail=f"Следующий спин доступен в {next_spin_at.isoformat()}",
        )

    prize = _pick_prize()

    spin = WheelSpin(
        user_id=user.id,
        prize_id=prize["id"],
        prize_label=prize["label"],
        prize_kind=prize["kind"],
        prize_amount=prize["amount"],
    )
    db.add(spin)

    if prize["kind"] == "balance" and prize["amount"] > 0:
        user.balance += prize["amount"]
        db.add(Transaction(
            user_id=user.id,
            type="bonus",
            amount=prize["amount"],
            description=f"Колесо фортуны: {prize['label']}",
        ))

    elif prize["kind"] == "days" and prize["amount"] > 0:
        if user.remnawave_uuid:
            rw_user = await get_user_by_telegram_id(user.telegram_id)
            current_expire = rw_user["expireAt"] if rw_user else datetime.now(timezone.utc).isoformat()
            await extend_user(user.remnawave_uuid, int(prize["amount"]), current_expire)

    await db.commit()

    return SpinResponse(
        prize=PrizeResponse(
            id=prize["id"],
            label=prize["label"],
            short_label=prize["short_label"],
            kind=prize["kind"],
            amount=prize["amount"],
            color=prize["color"],
        ),
        prize_index=_prize_index(prize["id"]),
    )


async def _last_spin(user_id: int, db: AsyncSession) -> WheelSpin | None:
    result = await db.execute(
        select(WheelSpin)
        .where(WheelSpin.user_id == user_id)
        .order_by(WheelSpin.spun_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def _cooldown_check(last_spin: WheelSpin | None) -> tuple[bool, datetime | None]:
    if last_spin is None:
        return True, None
    cooldown = timedelta(days=settings.WHEEL_COOLDOWN_DAYS)
    next_at = last_spin.spun_at + cooldown
    if datetime.now(timezone.utc) >= next_at:
        return True, None
    return False, next_at
