export interface Profile {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  isPremium?: boolean;
  referralCode: string;
  referralsCount: number;
  referralEarnings: number; // руб, накоплено всего
  referralCommission: number; // % (по умолчанию 20)
  balance: number; // руб
}

export type SubscriptionStatus = 'active' | 'trial' | 'expired';

export interface Subscription {
  plan: string;
  status: SubscriptionStatus;
  expiresAt: string; // ISO
  startedAt: string; // ISO
  totalDays: number; // продолжительность тарифа
  autoRenew: boolean;
  subscriptionUrl: string;
}

export type DevicePlatform = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'router';

export interface Device {
  id: string;
  name: string;
  platform: DevicePlatform;
  lastSeen: string;
  isCurrent: boolean;
  ipCountry: string;
}

export interface ServerNode {
  id: string;
  city: string;
  country: string;
  flag: string;
  pingMs: number;
  loadPercent: number;
  premium: boolean;
}

export interface Plan {
  id: string;
  name: string;
  priceRub: number;
  oldPriceRub?: number;
  durationDays: number;
  devices: number;
  features: string[];
  popular?: boolean;
}

// --- Баланс ---

export type TransactionType = 'topup' | 'spend' | 'referral' | 'bonus';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // > 0 пополнение, < 0 трата
  description: string;
  at: string; // ISO
}

// --- Рефералы ---

export interface Referral {
  telegramId: number;
  username?: string;
  firstName: string;
  joinedAt: string; // ISO
  earnedRub: number; // сколько ты заработал с него
}

// --- Колесо фортуны ---

export type PrizeKind = 'days' | 'discount' | 'balance' | 'nothing';

export interface Prize {
  id: string;
  label: string;
  shortLabel: string;
  kind: PrizeKind;
  amount: number;
  weight: number;
  color: string;
}

export interface SpinResult {
  prize: Prize;
  at: string;
}
