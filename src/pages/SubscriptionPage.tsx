import { useEffect, useState } from 'react';
import type { DevicePlatform } from '../api';
import { Empty, Modal, Switch } from '../components/ui';
import { useStore } from '../store';
import { haptic, hapticNotify } from '../telegram';
import { useToast } from '../toast';
import { formatDate, formatRub, relativeTime, timeLeft } from '../utils';

const PLATFORM_ICON: Record<DevicePlatform, string> = {
  ios: '📱', android: '🤖', windows: '🖥️', macos: '💻', linux: '🐧', router: '📡',
};

const STATUS_LABEL: Record<string, string> = { active: 'Активна', trial: 'Пробная', expired: 'Истекла' };

export function SubscriptionPage() {
  const { subscription, devices, plans, setAutoRenew, purchasePlan, removeDevice, renameDevice } = useStore();
  const notify = useToast();
  const [tl, setTl] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [renewBusy, setRenewBusy] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!subscription) return;
    const tick = () => setTl(timeLeft(subscription.expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [subscription]);

  if (!subscription) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  const toggleRenew = async () => {
    if (renewBusy) return;
    haptic();
    setRenewBusy(true);
    await setAutoRenew(!subscription.autoRenew);
    setRenewBusy(false);
  };

  const doRename = async () => {
    if (!renaming || !renaming.name.trim()) return;
    setBusy(true);
    await renameDevice(renaming.id, renaming.name.trim());
    setBusy(false);
    setRenaming(null);
    hapticNotify('success');
    notify('Название обновлено');
  };

  const doRemove = async () => {
    if (!removingId) return;
    setBusy(true);
    await removeDevice(removingId);
    setBusy(false);
    setRemovingId(null);
    hapticNotify('success');
    notify('Устройство отключено');
  };

  const doBuy = async (planId: string) => {
    setBusy(true);
    try {
      await purchasePlan(planId);
      hapticNotify('success');
      const p = plans.find((x) => x.id === planId);
      notify(`Тариф «${p?.name}» активирован 🎉`);
      setShowPlans(false);
      setBuyingId(null);
    } catch (e) {
      hapticNotify('error');
      notify((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Подписка</h1>
      <p className="screen-subtitle">{subscription.plan}</p>

      {/* Большой таймер */}
      <div className="card" style={{ textAlign: 'center', padding: '24px 18px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 10 }}>Осталось</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          {[
            { v: tl.days,    l: 'дн'  },
            { v: tl.hours,   l: 'ч'   },
            { v: tl.minutes, l: 'мин' },
            { v: tl.seconds, l: 'сек' },
          ].map(({ v, l }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {l === 'дн' ? v : pad(v)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, color: 'var(--text-dim)', fontSize: 13 }}>
          до {formatDate(subscription.expiresAt)}
        </div>
        <span className={'badge badge-' + subscription.status} style={{ marginTop: 10, display: 'inline-flex' }}>
          <i className="dot" />{STATUS_LABEL[subscription.status]}
        </span>
      </div>

      {/* Настройки подписки */}
      <div className="section-label">Управление</div>
      <div className="card">
        <div className="row" style={{ paddingTop: 0 }}>
          <div className="row-icon">🔄</div>
          <div className="row-body">
            <div className="row-title">Автопродление</div>
            <div className="row-sub">Списывать оплату автоматически</div>
          </div>
          <Switch on={subscription.autoRenew} onToggle={() => void toggleRenew()} />
        </div>
        <div className="row">
          <div className="row-icon">📅</div>
          <div className="row-body"><div className="row-title">Период</div><div className="row-sub">{formatDate(subscription.startedAt)} — {formatDate(subscription.expiresAt)}</div></div>
        </div>
      </div>

      <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => { haptic('medium'); setShowPlans(true); }}>
        ✨ Продлить / сменить тариф
      </button>

      {/* Устройства */}
      <div className="section-label">Устройства ({devices.length})</div>
      <div className="card">
        {devices.length === 0 ? (
          <Empty emoji="📭" text="Нет подключённых устройств" />
        ) : (
          devices.map((d) => (
            <div className="row" key={d.id}>
              <div className="row-icon">{PLATFORM_ICON[d.platform]}</div>
              <div className="row-body">
                <div className="row-title">
                  {d.name}
                  {d.isCurrent && <span className="badge badge-active" style={{ marginLeft: 8 }}>это устройство</span>}
                </div>
                <div className="row-sub">{d.ipCountry} · {relativeTime(d.lastSeen)}</div>
              </div>
              <div className="row-action flex-row">
                <button className="btn btn-ghost btn-sm" onClick={() => { haptic(); setRenaming({ id: d.id, name: d.name }); }}>✏️</button>
                {!d.isCurrent && (
                  <button className="btn btn-danger btn-sm" onClick={() => { haptic('medium'); setRemovingId(d.id); }}>Убрать</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: 0 }}>
        <p style={{ margin: '0 0 12px', color: 'var(--text-dim)', fontSize: 14 }}>
          Установи VPN-клиент и импортируй ключ подписки — устройство появится автоматически.
        </p>
        <button className="btn btn-ghost" onClick={() => { haptic(); notify('Инструкция появится после подключения панели'); }}>
          📖 Инструкция по подключению
        </button>
      </div>

      {/* Список тарифов */}
      {showPlans && (
        <div className="modal-backdrop" onClick={() => { setShowPlans(false); setBuyingId(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Выбери тариф</h3>
            {buyingId ? (() => {
              const plan = plans.find((p) => p.id === buyingId)!;
              return (
                <>
                  <p style={{ color: 'var(--text-dim)', margin: '0 0 16px' }}>
                    {plan.durationDays} дней, {plan.devices} устройства. Сумма: <b style={{ color: 'var(--text)' }}>{formatRub(plan.priceRub)}</b>
                  </p>
                  <div className="flex-row">
                    <button className="btn btn-ghost" onClick={() => setBuyingId(null)}>Назад</button>
                    <button className="btn btn-primary" disabled={busy} onClick={() => void doBuy(plan.id)}>
                      {busy ? <span className="spinner" /> : 'Оплатить'}
                    </button>
                  </div>
                </>
              );
            })() : (
              plans.map((plan) => (
                <div key={plan.id} className={'plan' + (plan.popular ? ' popular' : '')} style={{ marginTop: 10 }}>
                  {plan.popular && <div className="plan-tag">Выгодно</div>}
                  <div className="plan-head">
                    <div className="plan-name">{plan.name}</div>
                    <div className="plan-price">
                      {plan.oldPriceRub && <span className="plan-old">{plan.oldPriceRub} ₽</span>}
                      {plan.priceRub} <small>₽</small>
                    </div>
                  </div>
                  <button className={'btn btn-sm ' + (plan.popular ? 'btn-primary' : 'btn-ghost')} style={{ marginTop: 10, width: '100%' }}
                    onClick={() => { haptic('medium'); setBuyingId(plan.id); }}>
                    Выбрать
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {renaming && (
        <Modal title="Переименовать устройство" onClose={() => setRenaming(null)}>
          <input className="text-input" value={renaming.name} autoFocus maxLength={32}
            onChange={(e) => setRenaming({ ...renaming, name: e.target.value })} placeholder="Название" />
          <button className="btn btn-primary" disabled={busy} onClick={doRename}>
            {busy ? <span className="spinner" /> : 'Сохранить'}
          </button>
        </Modal>
      )}

      {removingId && (
        <Modal title="Отключить устройство?" onClose={() => setRemovingId(null)}>
          <p style={{ margin: '0 0 16px', color: 'var(--text-dim)' }}>Устройство потеряет доступ к VPN.</p>
          <div className="flex-row">
            <button className="btn btn-ghost" onClick={() => setRemovingId(null)}>Отмена</button>
            <button className="btn btn-danger" disabled={busy} onClick={doRemove}>
              {busy ? <span className="spinner" /> : 'Отключить'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
