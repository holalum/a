import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import type { Device, Plan, Profile, Referral, ServerNode, Subscription, Transaction } from './api';

interface StoreState {
  profile: Profile | null;
  subscription: Subscription | null;
  devices: Device[];
  servers: ServerNode[];
  plans: Plan[];
  transactions: Transaction[];
  referrals: Referral[];
  loading: boolean;
}

interface StoreValue extends StoreState {
  reload: () => Promise<void>;
  reloadBalance: () => Promise<void>;
  removeDevice: (id: string) => Promise<void>;
  renameDevice: (id: string, name: string) => Promise<void>;
  setAutoRenew: (value: boolean) => Promise<void>;
  purchasePlan: (planId: string) => Promise<void>;
  applyPromo: (code: string) => Promise<number>;
  applyReward: (kind: string, amount: number) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({
    profile: null, subscription: null, devices: [], servers: [],
    plans: [], transactions: [], referrals: [], loading: true,
  });

  const reload = useCallback(async () => {
    const [profile, subscription, devices, servers, plans, transactions, referrals] =
      await Promise.all([
        api.getProfile(), api.getSubscription(), api.getDevices(),
        api.getServers(), api.getPlans(), api.getTransactions(), api.getReferrals(),
      ]);
    setState({ profile, subscription, devices, servers, plans, transactions, referrals, loading: false });
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const reloadBalance = useCallback(async () => {
    const [profile, transactions] = await Promise.all([api.getProfile(), api.getTransactions()]);
    setState((s) => ({ ...s, profile, transactions }));
  }, []);

  const removeDevice = useCallback(async (id: string) => {
    await api.removeDevice(id);
    setState((s) => ({ ...s, devices: s.devices.filter((d) => d.id !== id) }));
  }, []);

  const renameDevice = useCallback(async (id: string, name: string) => {
    await api.renameDevice(id, name);
    setState((s) => ({ ...s, devices: s.devices.map((d) => (d.id === id ? { ...d, name } : d)) }));
  }, []);

  const setAutoRenew = useCallback(async (value: boolean) => {
    await api.setAutoRenew(value);
    setState((s) => ({
      ...s,
      subscription: s.subscription ? { ...s.subscription, autoRenew: value } : s.subscription,
    }));
  }, []);

  const purchasePlan = useCallback(async (planId: string) => {
    const subscription = await api.purchasePlan(planId);
    const [profile, transactions] = await Promise.all([api.getProfile(), api.getTransactions()]);
    setState((s) => ({ ...s, profile, subscription, transactions }));
  }, []);

  const applyPromo = useCallback(async (code: string): Promise<number> => {
    const amount = await api.applyPromo(code);
    await reloadBalance();
    return amount;
  }, [reloadBalance]);

  const applyReward = useCallback(async (kind: string, amount: number) => {
    await api.applyReward(kind, amount);
    const [profile, subscription, transactions] = await Promise.all([
      api.getProfile(), api.getSubscription(), api.getTransactions(),
    ]);
    setState((s) => ({ ...s, profile, subscription, transactions }));
  }, []);

  return (
    <StoreContext.Provider value={{ ...state, reload, reloadBalance, removeDevice, renameDevice, setAutoRenew, purchasePlan, applyPromo, applyReward }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore внутри StoreProvider');
  return ctx;
}
