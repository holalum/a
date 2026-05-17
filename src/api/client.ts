/**
 * Real HTTP client for the Harmony VPN backend.
 * Falls back to mock when no backend URL is configured or auth fails.
 */
import type { Device, Plan, Profile, Referral, ServerNode, Subscription, Transaction } from './types';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

let _token: string | null = null;

async function _authenticate(): Promise<string | null> {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData || !BASE_URL) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ init_data: initData }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token as string;
  } catch {
    return null;
  }
}

async function _token_(): Promise<string | null> {
  if (_token) return _token;
  _token = await _authenticate();
  return _token;
}

async function _get<T>(path: string): Promise<T> {
  const token = await _token_();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

async function _post<T>(path: string, body?: unknown): Promise<T> {
  const token = await _token_();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

async function _delete(path: string): Promise<void> {
  const token = await _token_();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
}

// ---- Mapping helpers ----

function _mapProfile(r: Record<string, unknown>): Profile {
  return {
    id: r.telegram_id as number,
    firstName: r.first_name as string,
    lastName: r.last_name as string | undefined,
    username: r.username as string | undefined,
    referralCode: r.referral_code as string,
    referralsCount: r.referrals_count as number,
    referralEarnings: Number(r.referral_earnings),
    referralCommission: r.referral_commission as number,
    balance: Number(r.balance),
  };
}

function _mapSubscription(r: Record<string, unknown>): Subscription {
  return {
    plan: r.plan as string,
    status: r.status as Subscription['status'],
    expiresAt: r.expire_at as string,
    startedAt: r.started_at as string,
    totalDays: r.total_days as number,
    autoRenew: r.auto_renew as boolean,
    subscriptionUrl: r.subscription_url as string,
  };
}

function _mapDevice(d: Record<string, unknown>): Device {
  const platform = (d.platform as string | null) ?? 'router';
  const model = (d.device_model as string | null) ?? '';
  return {
    id: d.hwid as string,
    name: model || platform,
    platform: platform as Device['platform'],
    lastSeen: new Date().toISOString(),
    isCurrent: (d.is_current as boolean | null) ?? false,
    ipCountry: '',
  };
}

function _mapNode(n: Record<string, unknown>): ServerNode {
  return {
    id: n.uuid as string,
    city: n.name as string,
    country: n.country_code as string,
    flag: n.flag as string,
    pingMs: 0,
    loadPercent: 0,
    premium: false,
  };
}

function _mapPlan(p: Record<string, unknown>): Plan {
  return {
    id: p.id as string,
    name: p.name as string,
    priceRub: p.price_rub as number,
    oldPriceRub: p.old_price_rub as number | undefined,
    durationDays: p.duration_days as number,
    devices: p.devices as number,
    features: p.features as string[],
    popular: p.popular as boolean | undefined,
  };
}

function _mapTransaction(t: Record<string, unknown>): Transaction {
  return {
    id: String(t.id),
    type: t.type as Transaction['type'],
    amount: Number(t.amount),
    description: t.description as string,
    at: t.created_at as string,
  };
}

function _mapReferral(r: Record<string, unknown>): Referral {
  return {
    telegramId: r.telegram_id as number,
    username: r.username as string | undefined,
    firstName: r.first_name as string,
    joinedAt: r.joined_at as string,
    earnedRub: Number(r.earned_rub),
  };
}

// ---- Public API (same shape as mock) ----

export const httpApi = {
  async getProfile(): Promise<Profile> {
    return _mapProfile(await _get('/me'));
  },

  async getSubscription(): Promise<Subscription> {
    return _mapSubscription(await _get('/me/subscription'));
  },

  async getDevices(): Promise<Device[]> {
    const data = await _get<Record<string, unknown>[]>('/devices');
    return data.map(_mapDevice);
  },

  async getServers(): Promise<ServerNode[]> {
    const data = await _get<Record<string, unknown>[]>('/nodes');
    return data.map(_mapNode);
  },

  async getPlans(): Promise<Plan[]> {
    const data = await _get<Record<string, unknown>[]>('/plans');
    return data.map(_mapPlan);
  },

  async getTransactions(): Promise<Transaction[]> {
    const data = await _get<{ transactions: Record<string, unknown>[] }>('/balance');
    return data.transactions.map(_mapTransaction);
  },

  async getReferrals(): Promise<Referral[]> {
    const data = await _get<{ referrals: Record<string, unknown>[] }>('/referrals');
    return data.referrals.map(_mapReferral);
  },

  async removeDevice(hwid: string): Promise<void> {
    await _delete(`/devices/${encodeURIComponent(hwid)}`);
  },

  async renameDevice(_id: string, _name: string): Promise<void> {
    // Remnawave doesn't support device names — no-op
  },

  async setAutoRenew(_value: boolean): Promise<void> {
    // Not yet implemented server-side — no-op
  },

  async purchasePlan(planId: string): Promise<Subscription> {
    const r = await _post<Record<string, unknown>>('/plans/purchase', { plan_id: planId });
    return _mapSubscription(r);
  },

  async applyPromo(code: string): Promise<number> {
    const r = await _post<{ amount: number }>('/balance/promo', { code });
    return Number(r.amount);
  },

  async topUp(amount: number): Promise<void> {
    await _post('/balance/topup', { amount });
  },

  async applyReward(_kind: string, _amount: number): Promise<void> {
    // Server-side spin already applied reward — store reloads after spinWheel()
  },

  async spinWheel(): Promise<{ prizeIndex: number; prizeKind: string; prizeAmount: number }> {
    const r = await _post<{ prize: { id: string; kind: string; amount: number }; prize_index: number }>('/wheel/spin');
    return { prizeIndex: r.prize_index, prizeKind: r.prize.kind, prizeAmount: Number(r.prize.amount) };
  },

  async getWheelStatus(): Promise<{ canSpin: boolean; nextSpinAt: string | null }> {
    const r = await _get<{ can_spin: boolean; next_spin_at: string | null }>('/wheel');
    return { canSpin: r.can_spin, nextSpinAt: r.next_spin_at };
  },
};

export type HttpApi = typeof httpApi;
