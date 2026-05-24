export interface Profile {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  isPremium?: boolean;
  referralCode: string;
  referralsCount: number;
  referralEarnings: number;
  referralCommission: number;
  balance: number;
}

export type SubscriptionStatus = 'active' | 'trial' | 'expired';

export interface Subscription {
  plan: string;
  status: SubscriptionStatus;
  expiresAt: string;
  startedAt: string;
  totalDays: number;
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

export type TransactionType = 'topup' | 'spend' | 'referral' | 'bonus';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  at: string;
}

export interface Referral {
  telegramId: number;
  username?: string;
  firstName: string;
  joinedAt: string;
  earnedRub: number;
}

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