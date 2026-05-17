import { useState } from 'react';
import type { TransactionType } from '../api';
import { useStore } from '../store';
import { haptic, hapticNotify } from '../telegram';
import { useToast } from '../toast';
import { formatDate, formatRub } from '../utils';

const TX_ICON: Record<TransactionType, string> = {
  topup: '💳', spend: '🛒', referral: '👥', bonus: '🎁',
};

const TX_LABEL: Record<TransactionType, string> = {
  topup: 'Пополнение', spend: 'Списание', referral: 'Реферальный бонус', bonus: 'Бонус',
};

const TOP_UP_AMOUNTS = [100, 200, 500, 1000];

export function BalancePage() {
  const { profile, transactions } = useStore();
  const { applyPromo } = useStore();
  const notify = useToast();
  const [promoCode, setPromoCode] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number | null>(null);

  if (!profile) return null;

  const doPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoBusy(true);
    try {
      const amount = await applyPromo(promoCode.trim());
      hapticNotify('success');
      notify(`Промокод принят! Зачислено ${formatRub(amount)} 🎉`);
      setPromoCode('');
    } catch (e) {
      hapticNotify('error');
      notify((e as Error).message);
    }
    setPromoBusy(false);
  };

  const doTopUp = () => {
    hapticNotify('warning');
    notify('Оплата картой появится после подключения биллинга');
    setTopUpAmount(null);
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Баланс</h1>
      <p className="screen-subtitle">Пополнение и история операций</p>

      {/* Баланс */}
      <div className="card" style={{ background: 'var(--accent-grad)', border: 'none', padding: '24px 20px' }}>
        <div style={{ opacity: 0.85, fontSize: 13, fontWeight: 600 }}>Текущий баланс</div>
        <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, marginTop: 6 }}>
          {formatRub(profile.balance)}
        </div>
      </div>

      {/* Пополнить */}
      <div className="section-label">Пополнить</div>
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {TOP_UP_AMOUNTS.map((a) => (
            <button
              key={a}
              className={'btn btn-sm ' + (topUpAmount === a ? 'btn-primary' : 'btn-ghost')}
              style={{ width: '100%', padding: '12px 0' }}
              onClick={() => { haptic(); setTopUpAmount(a); }}
            >
              {a} ₽
            </button>
          ))}
        </div>
        <button
          className="btn btn-primary"
          disabled={!topUpAmount}
          onClick={doTopUp}
        >
          {topUpAmount ? `Пополнить на ${topUpAmount} ₽` : 'Выберите сумму'}
        </button>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>
          💳 Принимаем карты РФ, криптовалюту · скоро
        </p>
      </div>

      {/* Промокод */}
      <div className="section-label">Промокод</div>
      <div className="card">
        <div className="flex-row">
          <input
            className="text-input"
            style={{ margin: 0, textTransform: 'uppercase' }}
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Введи промокод"
            maxLength={20}
          />
          <button
            className="btn btn-primary btn-sm"
            style={{ padding: '0 18px', flexShrink: 0 }}
            disabled={promoBusy || !promoCode.trim()}
            onClick={() => void doPromo()}
          >
            {promoBusy ? <span className="spinner" /> : 'Применить'}
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>
          Попробуй: WELCOME, AURORA10, VIP100
        </p>
      </div>

      {/* История */}
      <div className="section-label">История операций</div>
      <div className="card">
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)' }}>
            Операций пока нет
          </div>
        ) : (
          transactions.map((tx) => (
            <div className="row" key={tx.id}>
              <div className="row-icon">{TX_ICON[tx.type]}</div>
              <div className="row-body">
                <div className="row-title">{tx.description}</div>
                <div className="row-sub">{TX_LABEL[tx.type]} · {formatDate(tx.at)}</div>
              </div>
              <div
                className="row-action"
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: tx.amount > 0 ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {tx.amount > 0 ? '+' : ''}{formatRub(tx.amount)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
