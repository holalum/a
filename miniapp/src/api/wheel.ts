import type { Prize, SpinResult } from './types';

export const SPIN_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const STORAGE_LAST_SPIN = 'harmony.wheel.lastSpin';
const STORAGE_HISTORY = 'harmony.wheel.history';

export const PRIZES: Prize[] = [
  { id: 'd7',    label: '7 дней подписки',      shortLabel: '+7 дней',   kind: 'days',     amount: 7,   weight: 14, color: '#7c5cff' },
  { id: 'nope1', label: 'Повезёт в следующий раз', shortLabel: 'Мимо',  kind: 'nothing',  amount: 0,   weight: 26, color: '#3a3a52' },
  { id: 'bal50', label: '50 ₽ на баланс',        shortLabel: '+50 ₽',   kind: 'balance',  amount: 50,  weight: 18, color: '#2bd9c4' },
  { id: 'disc30',label: 'Скидка 30% на тариф',   shortLabel: '−30%',    kind: 'discount', amount: 30,  weight: 12, color: '#ff8a3d' },
  { id: 'd1',    label: '1 день подписки',        shortLabel: '+1 день', kind: 'days',     amount: 1,   weight: 20, color: '#5c8cff' },
  { id: 'nope2', label: 'Почти получилось',       shortLabel: 'Мимо',   kind: 'nothing',  amount: 0,   weight: 22, color: '#3a3a52' },
  { id: 'bal200',label: '200 ₽ на баланс',        shortLabel: '+200 ₽', kind: 'balance',  amount: 200, weight: 9,  color: '#2bd9c4' },
  { id: 'd30',   label: 'ДЖЕКПОТ: 30 дней!',     shortLabel: '+30 дней',kind: 'days',     amount: 30,  weight: 3,  color: '#ffd23d' },
];

export function getLastSpinAt(): number | null {
  const raw = localStorage.getItem(STORAGE_LAST_SPIN);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getNextSpinAt(): number | null {
  const last = getLastSpinAt();
  return last == null ? null : last + SPIN_COOLDOWN_MS;
}

export function canSpin(): boolean {
  const next = getNextSpinAt();
  return next == null || Date.now() >= next;
}

export function getHistory(): SpinResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY);
    return raw ? (JSON.parse(raw) as SpinResult[]) : [];
  } catch {
    return [];
  }
}

export function pickPrize(): number {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < PRIZES.length; i++) {
    roll -= PRIZES[i].weight;
    if (roll <= 0) return i;
  }
  return PRIZES.length - 1;
}

export function commitSpin(prizeIndex: number): SpinResult {
  const result: SpinResult = { prize: PRIZES[prizeIndex], at: new Date().toISOString() };
  localStorage.setItem(STORAGE_LAST_SPIN, String(Date.now()));
  const history = [result, ...getHistory()].slice(0, 20);
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
  return result;
}