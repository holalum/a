// Доменные типы. Соответствуют сущностям, которые позже придут из панели Remnawave.

export interface Profile {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  isPremium?: boolean;
  referralCode: string;
  referralsCount: number;
  balanceBonusDays: number;
}

export type SubscriptionStatus = 'active' | 'trial' | 'expired';

export interface Subscription {
  plan: string;
  status: SubscriptionStatus;
  expiresAt: string; // ISO
  startedAt: string; // ISO
  trafficUsedGb: number;
  trafficLimitGb: number | null; // null = безлимит
  autoRenew: boolean;
  subscriptionUrl: string; // ссылка для импорта в VPN-клиент
}

export type DevicePlatform = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'router';

export interface Device {
  id: string;
  name: string;
  platform: DevicePlatform;
  lastSeen: string; // ISO
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
  trafficGb: number | null;
  features: string[];
  popular?: boolean;
}

// --- Колесо фортуны ---

export type PrizeKind = 'days' | 'discount' | 'traffic' | 'device' | 'nothing';

export interface Prize {
  id: string;
  label: string;
  shortLabel: string;
  kind: PrizeKind;
  amount: number; // дни / проценты / ГБ / слоты
  weight: number; // вес для взвешенного рандома
  color: string;
}

export interface SpinResult {
  prize: Prize;
  at: string; // ISO
}
