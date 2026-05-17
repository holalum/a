from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel


# --- Auth ---

class AuthRequest(BaseModel):
    init_data: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Profile / Me ---

class ProfileResponse(BaseModel):
    telegram_id: int
    first_name: str
    last_name: Optional[str]
    username: Optional[str]
    balance: Decimal
    referral_code: str
    referral_commission: int
    referrals_count: int
    referral_earnings: Decimal


# --- Subscription ---

class SubscriptionResponse(BaseModel):
    plan: str
    status: Literal["active", "trial", "expired"]
    expire_at: datetime
    started_at: datetime
    subscription_url: str
    total_days: int
    auto_renew: bool  # хранится у нас в БД


# --- Devices ---

class DeviceResponse(BaseModel):
    hwid: str
    platform: Optional[str]
    device_model: Optional[str]
    os_version: Optional[str]
    is_current: bool = False


# --- Nodes ---

class NodeResponse(BaseModel):
    uuid: str
    name: str
    country_code: str
    flag: str
    is_connected: bool
    is_disabled: bool
    users_online: int


# --- Plans ---

class PlanResponse(BaseModel):
    id: str
    name: str
    price_rub: int
    old_price_rub: Optional[int]
    duration_days: int
    devices: int
    features: list[str]
    popular: bool = False


# --- Balance ---

class TransactionResponse(BaseModel):
    id: int
    type: str
    amount: Decimal
    description: str
    created_at: datetime

class BalanceResponse(BaseModel):
    balance: Decimal
    transactions: list[TransactionResponse]

class PromoRequest(BaseModel):
    code: str

class PromoResponse(BaseModel):
    amount: Decimal
    message: str

class TopUpRequest(BaseModel):
    amount: int


# --- Referrals ---

class ReferralResponse(BaseModel):
    telegram_id: int
    username: Optional[str]
    first_name: str
    joined_at: datetime
    earned_rub: Decimal

class ReferralsPageResponse(BaseModel):
    count: int
    earnings: Decimal
    commission: int
    referral_link: str
    referrals: list[ReferralResponse]


# --- Wheel ---

class PrizeResponse(BaseModel):
    id: str
    label: str
    short_label: str
    kind: str
    amount: Decimal
    color: str

class WheelStatusResponse(BaseModel):
    can_spin: bool
    next_spin_at: Optional[datetime]
    history: list[SpinHistoryItem]

class SpinHistoryItem(BaseModel):
    prize_label: str
    prize_kind: str
    spun_at: datetime

class SpinResponse(BaseModel):
    prize: PrizeResponse
    prize_index: int  # для анимации колеса на фронте

class PurchaseRequest(BaseModel):
    plan_id: str
