import { useState } from 'react';
import type { Plan } from '../api';
import { Modal } from '../components/ui';
import { useStore } from '../store';
import { haptic, hapticNotify } from '../telegram';
import { useToast } from '../toast';

export function PlansPage() {
  const { plans, subscription, purchasePlan } = useStore();
  const notify = useToast();
  const [selected, setSelected] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    if (!selected) return;
    setBusy(true);
    await purchasePlan(selected.id);
    setBusy(false);
    setSelected(null);
    hapticNotify('success');
    notify(`Тариф «${selected.name}» активирован 🎉`);
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Тарифы</h1>
      <p className="screen-subtitle">
        Текущий план: {subscription?.plan ?? '—'}
      </p>

      {plans.map((plan) => (
        <div key={plan.id} className={'plan' + (plan.popular ? ' popular' : '')}>
          {plan.popular && <div className="plan-tag">Выгодно</div>}
          <div className="plan-head">
            <div className="plan-name">{plan.name}</div>
            <div className="plan-price">
              {plan.oldPriceRub && <span className="plan-old">{plan.oldPriceRub} ₽</span>}
              {plan.priceRub} <small>₽</small>
            </div>
          </div>
          <ul className="plan-features">
            {plan.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <button
            className={'btn ' + (plan.popular ? 'btn-primary' : 'btn-ghost')}
            style={{ marginTop: 14 }}
            onClick={() => {
              haptic('medium');
              setSelected(plan);
            }}
          >
            Оформить за {plan.priceRub} ₽
          </button>
        </div>
      ))}

      <div className="section-label">Оплата</div>
      <div className="card">
        <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 14 }}>
          💳 Приём платежей появится после подключения биллинга. Сейчас оформление
          активирует тариф в демо-режиме.
        </p>
      </div>

      {selected && (
        <Modal title={`Оформить «${selected.name}»`} onClose={() => setSelected(null)}>
          <p style={{ margin: '0 0 16px', color: 'var(--text-dim)' }}>
            Подписка на {selected.durationDays} дней, до {selected.devices} устройств,{' '}
            {selected.trafficGb ? `${selected.trafficGb} ГБ трафика` : 'безлимитный трафик'}.
            Сумма к оплате — <b style={{ color: 'var(--text)' }}>{selected.priceRub} ₽</b>.
          </p>
          <div className="flex-row">
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>
              Отмена
            </button>
            <button className="btn btn-primary" disabled={busy} onClick={buy}>
              {busy ? <span className="spinner" /> : 'Подтвердить'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
