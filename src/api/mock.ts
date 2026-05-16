// Заглушечный «бэкенд». Имитирует сетевые задержки и хранит изменяемое состояние
// в памяти. Когда появится Remnawave — этот файл заменяется реальным API-клиентом
// с тем же набором методов (см. api/index.ts).

import { getTelegramUser } from '../telegram';
import type {
  Device,
  Plan,
  Profile,
  ServerNode,
  Subscription,
} from './types';

const delay = (ms = 420) => new Promise((r) => setTimeout(r, ms));

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

// --- Состояние в памяти ---

const tgUser = getTelegramUser();

let profile: Profile = {
  id: tgUser?.id ?? 100200300,
  firstName: tgUser?.first_name ?? 'Гость',
  lastName: tgUser?.last_name,
  username: tgUser?.username ?? 'aurora_user',
  photoUrl: tgUser?.photo_url,
  isPremium: tgUser?.is_premium,
  referralCode: 'AURORA-' + String(tgUser?.id ?? 100200300).slice(-4),
  referralsCount: 3,
  balanceBonusDays: 0,
};

let subscription: Subscription = {
  plan: 'Aurora Pro',
  status: 'active',
  startedAt: daysFromNow(-12),
  expiresAt: daysFromNow(18),
  trafficUsedGb: 47.3,
  trafficLimitGb: 200,
  autoRenew: true,
  subscriptionUrl: 'https://sub.aurora-vpn.example/c/8f3a9c2e1b',
};

let devices: Device[] = [
  {
    id: 'd1',
    name: 'iPhone 15 Pro',
    platform: 'ios',
    lastSeen: daysFromNow(0),
    isCurrent: true,
    ipCountry: '🇳🇱 Нидерланды',
  },
  {
    id: 'd2',
    name: 'MacBook Air',
    platform: 'macos',
    lastSeen: daysFromNow(-1),
    isCurrent: false,
    ipCountry: '🇩🇪 Германия',
  },
  {
    id: 'd3',
    name: 'Домашний роутер',
    platform: 'router',
    lastSeen: daysFromNow(-3),
    isCurrent: false,
    ipCountry: '🇫🇮 Финляндия',
  },
];

const servers: ServerNode[] = [
  { id: 's1', city: 'Амстердам', country: 'Нидерланды', flag: '🇳🇱', pingMs: 24, loadPercent: 38, premium: false },
  { id: 's2', city: 'Франкфурт', country: 'Германия', flag: '🇩🇪', pingMs: 31, loadPercent: 52, premium: false },
  { id: 's3', city: 'Хельсинки', country: 'Финляндия', flag: '🇫🇮', pingMs: 19, loadPercent: 27, premium: false },
  { id: 's4', city: 'Лондон', country: 'Великобритания', flag: '🇬🇧', pingMs: 44, loadPercent: 61, premium: true },
  { id: 's5', city: 'Нью-Йорк', country: 'США', flag: '🇺🇸', pingMs: 112, loadPercent: 73, premium: true },
  { id: 's6', city: 'Токио', country: 'Япония', flag: '🇯🇵', pingMs: 168, loadPercent: 41, premium: true },
];

const plans: Plan[] = [
  {
    id: 'month',
    name: 'Месяц',
    priceRub: 199,
    durationDays: 30,
    devices: 3,
    trafficGb: 200,
    features: ['Все локации', '3 устройства', '200 ГБ трафика'],
  },
  {
    id: 'quarter',
    name: '3 месяца',
    priceRub: 499,
    oldPriceRub: 597,
    durationDays: 90,
    devices: 5,
    trafficGb: null,
    features: ['Все локации', '5 устройств', 'Безлимитный трафик', 'Premium-сервера'],
    popular: true,
  },
  {
    id: 'year',
    name: 'Год',
    priceRub: 1490,
    oldPriceRub: 2388,
    durationDays: 365,
    devices: 10,
    trafficGb: null,
    features: ['Все локации', '10 устройств', 'Безлимитный трафик', 'Premium-сервера', 'Приоритетная поддержка'],
  },
];

// --- API ---

export const api = {
  async getProfile(): Promise<Profile> {
    await delay();
    return { ...profile };
  },

  async getSubscription(): Promise<Subscription> {
    await delay();
    return { ...subscription };
  },

  async getDevices(): Promise<Device[]> {
    await delay();
    return devices.map((d) => ({ ...d }));
  },

  async getServers(): Promise<ServerNode[]> {
    await delay(300);
    return servers.map((s) => ({ ...s }));
  },

  async getPlans(): Promise<Plan[]> {
    await delay(250);
    return plans.map((p) => ({ ...p }));
  },

  async removeDevice(id: string): Promise<void> {
    await delay(500);
    devices = devices.filter((d) => d.id !== id);
  },

  async renameDevice(id: string, name: string): Promise<void> {
    await delay(400);
    devices = devices.map((d) => (d.id === id ? { ...d, name } : d));
  },

  async setAutoRenew(value: boolean): Promise<void> {
    await delay(350);
    subscription = { ...subscription, autoRenew: value };
  },

  async purchasePlan(planId: string): Promise<Subscription> {
    await delay(900);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) throw new Error('Тариф не найден');
    subscription = {
      ...subscription,
      plan: 'Aurora ' + plan.name,
      status: 'active',
      startedAt: new Date().toISOString(),
      expiresAt: daysFromNow(plan.durationDays),
      trafficLimitGb: plan.trafficGb,
      trafficUsedGb: 0,
    };
    return { ...subscription };
  },

  // Начисление приза с колеса фортуны.
  async applyReward(kind: string, amount: number): Promise<void> {
    await delay(300);
    if (kind === 'days') {
      const base = new Date(subscription.expiresAt).getTime();
      subscription = {
        ...subscription,
        expiresAt: new Date(base + amount * 86_400_000).toISOString(),
      };
      profile = { ...profile, balanceBonusDays: profile.balanceBonusDays + amount };
    }
    if (kind === 'traffic' && subscription.trafficLimitGb != null) {
      subscription = {
        ...subscription,
        trafficLimitGb: subscription.trafficLimitGb + amount,
      };
    }
  },
};

export type Api = typeof api;
