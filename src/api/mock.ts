import { getTelegramUser } from '../telegram';
import type { Device, Plan, Profile, Referral, ServerNode, Subscription, Transaction } from './types';

const delay = (ms = 420) => new Promise((r) => setTimeout(r, ms));

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

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
  referralEarnings: 149.80,
  referralCommission: 20,
  balance: 249.00,
};

let subscription: Subscription = {
  plan: 'Aurora Pro',
  status: 'active',
  startedAt: daysFromNow(-12),
  expiresAt: daysFromNow(18),
  totalDays: 30,
  autoRenew: true,
  subscriptionUrl: 'https://sub.aurora-vpn.example/c/8f3a9c2e1b',
};

let devices: Device[] = [
  { id: 'd1', name: 'iPhone 15 Pro', platform: 'ios',     lastSeen: daysFromNow(0),  isCurrent: true,  ipCountry: '🇳🇱 Нидерланды' },
  { id: 'd2', name: 'MacBook Air',   platform: 'macos',   lastSeen: daysFromNow(-1), isCurrent: false, ipCountry: '🇩🇪 Германия'  },
  { id: 'd3', name: 'Роутер дома',   platform: 'router',  lastSeen: daysFromNow(-3), isCurrent: false, ipCountry: '🇫🇮 Финляндия' },
];

const servers: ServerNode[] = [
  { id: 's1', city: 'Амстердам',  country: 'Нидерланды',     flag: '🇳🇱', pingMs: 24,  loadPercent: 38, premium: false },
  { id: 's2', city: 'Франкфурт', country: 'Германия',        flag: '🇩🇪', pingMs: 31,  loadPercent: 52, premium: false },
  { id: 's3', city: 'Хельсинки', country: 'Финляндия',       flag: '🇫🇮', pingMs: 19,  loadPercent: 27, premium: false },
  { id: 's4', city: 'Лондон',    country: 'Великобритания',  flag: '🇬🇧', pingMs: 44,  loadPercent: 61, premium: true  },
  { id: 's5', city: 'Нью-Йорк', country: 'США',              flag: '🇺🇸', pingMs: 112, loadPercent: 73, premium: true  },
  { id: 's6', city: 'Токио',    country: 'Япония',           flag: '🇯🇵', pingMs: 168, loadPercent: 41, premium: true  },
];

const plans: Plan[] = [
  { id: 'month',   name: 'Месяц',     priceRub: 199,  durationDays: 30,  devices: 3,  features: ['Все локации', '3 устройства', 'Безлимитный трафик'] },
  { id: 'quarter', name: '3 месяца',  priceRub: 499,  oldPriceRub: 597,  durationDays: 90,  devices: 5,  features: ['Все локации', '5 устройств', 'Безлимитный трафик', 'Premium-сервера'], popular: true },
  { id: 'year',    name: 'Год',       priceRub: 1490, oldPriceRub: 2388, durationDays: 365, devices: 10, features: ['Все локации', '10 устройств', 'Безлимитный трафик', 'Premium-сервера', 'Приоритетная поддержка'] },
];

let transactions: Transaction[] = [
  { id: 't1', type: 'topup',    amount: 500,   description: 'Пополнение баланса',        at: daysFromNow(-20) },
  { id: 't2', type: 'spend',    amount: -199,  description: 'Тариф «Месяц»',             at: daysFromNow(-20) },
  { id: 't3', type: 'referral', amount: 39.8,  description: 'Реферал @user_one',         at: daysFromNow(-15) },
  { id: 't4', type: 'referral', amount: 39.8,  description: 'Реферал @user_two',         at: daysFromNow(-10) },
  { id: 't5', type: 'bonus',    amount: 50,    description: 'Приз с колеса фортуны',     at: daysFromNow(-7) },
  { id: 't6', type: 'spend',    amount: -199,  description: 'Тариф «Месяц»',             at: daysFromNow(-5) },
  { id: 't7', type: 'referral', amount: 70.2,  description: 'Реферал @user_three',       at: daysFromNow(-2) },
];

const referrals: Referral[] = [
  { telegramId: 111222333, username: 'user_one',   firstName: 'Алексей', joinedAt: daysFromNow(-45), earnedRub: 39.8 },
  { telegramId: 444555666, username: 'user_two',   firstName: 'Мария',   joinedAt: daysFromNow(-30), earnedRub: 39.8 },
  { telegramId: 777888999, username: 'user_three', firstName: 'Дмитрий', joinedAt: daysFromNow(-10), earnedRub: 70.2 },
];

const PROMO_CODES: Record<string, { amount: number; description: string }> = {
  'AURORA10': { amount: 10,  description: 'Промо-код AURORA10' },
  'WELCOME':  { amount: 50,  description: 'Промо-код WELCOME'  },
  'VIP100':   { amount: 100, description: 'Промо-код VIP100'   },
};
const usedPromos = new Set<string>();

export const api = {
  async getProfile(): Promise<Profile> { await delay(); return { ...profile }; },
  async getSubscription(): Promise<Subscription> { await delay(); return { ...subscription }; },
  async getDevices(): Promise<Device[]> { await delay(); return devices.map((d) => ({ ...d })); },
  async getServers(): Promise<ServerNode[]> { await delay(300); return servers.map((s) => ({ ...s })); },
  async getPlans(): Promise<Plan[]> { await delay(250); return plans.map((p) => ({ ...p })); },
  async getTransactions(): Promise<Transaction[]> { await delay(350); return [...transactions]; },
  async getReferrals(): Promise<Referral[]> { await delay(300); return [...referrals]; },

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
    transactions = [
      { id: 't' + Date.now(), type: 'spend', amount: -plan.priceRub, description: `Тариф «${plan.name}»`, at: new Date().toISOString() },
      ...transactions,
    ];
    profile = { ...profile, balance: Math.max(0, profile.balance - plan.priceRub) };
    subscription = {
      ...subscription,
      plan: 'Aurora ' + plan.name,
      status: 'active',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + plan.durationDays * 86_400_000).toISOString(),
      totalDays: plan.durationDays,
    };
    return { ...subscription };
  },

  async applyPromo(code: string): Promise<number> {
    await delay(700);
    const upper = code.trim().toUpperCase();
    if (usedPromos.has(upper)) throw new Error('Промокод уже использован');
    const promo = PROMO_CODES[upper];
    if (!promo) throw new Error('Промокод не найден');
    usedPromos.add(upper);
    profile = { ...profile, balance: profile.balance + promo.amount };
    transactions = [
      { id: 't' + Date.now(), type: 'bonus', amount: promo.amount, description: promo.description, at: new Date().toISOString() },
      ...transactions,
    ];
    return promo.amount;
  },

  async topUp(_amount: number): Promise<void> {
    // Заглушка. Реальная оплата подключается через платёжный шлюз.
    await delay(800);
    throw new Error('Оплата ещё не подключена — используй промокод');
  },

  async applyReward(kind: string, amount: number): Promise<void> {
    await delay(300);
    if (kind === 'days') {
      const base = new Date(subscription.expiresAt).getTime();
      subscription = { ...subscription, expiresAt: new Date(base + amount * 86_400_000).toISOString() };
    }
    if (kind === 'balance') {
      profile = { ...profile, balance: profile.balance + amount };
      transactions = [
        { id: 't' + Date.now(), type: 'bonus', amount, description: 'Приз с колеса фортуны', at: new Date().toISOString() },
        ...transactions,
      ];
    }
  },
};

export type Api = typeof api;
