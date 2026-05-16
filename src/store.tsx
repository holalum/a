import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import type { Device, Plan, Profile, ServerNode, Subscription } from './api';

interface StoreState {
  profile: Profile | null;
  subscription: Subscription | null;
  devices: Device[];
  servers: ServerNode[];
  plans: Plan[];
  loading: boolean;
}

interface StoreValue extends StoreState {
  reload: () => Promise<void>;
  removeDevice: (id: string) => Promise<void>;
  renameDevice: (id: string, name: string) => Promise<void>;
  setAutoRenew: (value: boolean) => Promise<void>;
  purchasePlan: (planId: string) => Promise<void>;
  applyReward: (kind: string, amount: number) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({
    profile: null,
    subscription: null,
    devices: [],
    servers: [],
    plans: [],
    loading: true,
  });

  const reload = useCallback(async () => {
    const [profile, subscription, devices, servers, plans] = await Promise.all([
      api.getProfile(),
      api.getSubscription(),
      api.getDevices(),
      api.getServers(),
      api.getPlans(),
    ]);
    setState({ profile, subscription, devices, servers, plans, loading: false });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const removeDevice = useCallback(async (id: string) => {
    await api.removeDevice(id);
    setState((s) => ({ ...s, devices: s.devices.filter((d) => d.id !== id) }));
  }, []);

  const renameDevice = useCallback(async (id: string, name: string) => {
    await api.renameDevice(id, name);
    setState((s) => ({
      ...s,
      devices: s.devices.map((d) => (d.id === id ? { ...d, name } : d)),
    }));
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
    setState((s) => ({ ...s, subscription }));
  }, []);

  const applyReward = useCallback(
    async (kind: string, amount: number) => {
      await api.applyReward(kind, amount);
      const [profile, subscription] = await Promise.all([
        api.getProfile(),
        api.getSubscription(),
      ]);
      setState((s) => ({ ...s, profile, subscription }));
    },
    [],
  );

  const value: StoreValue = {
    ...state,
    reload,
    removeDevice,
    renameDevice,
    setAutoRenew,
    purchasePlan,
    applyReward,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore должен использоваться внутри StoreProvider');
  return ctx;
}
