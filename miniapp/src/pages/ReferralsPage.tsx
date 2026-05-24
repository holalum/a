import { useStore } from '../store';
import { haptic, hapticNotify } from '../telegram';
import { useToast } from '../toast';
import { formatDate, formatRub } from '../utils';

export function ReferralsPage() {
  const { profile, referrals } = useStore();
  const notify = useToast();

  if (!profile) return null;

  const refLink = `https://t.me/HarmonyVPNBot?start=${profile.referralCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(refLink);
      hapticNotify('success');
      notify('Реферальная ссылка скопирована');
    } catch {
      notify('Не удалось скопировать');
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(profile.referralCode);
      hapticNotify('success');
      notify('Код скопирован');
    } catch {
      notify('Не удалось скопировать');
    }
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Рефералы</h1>
      <p className="screen-subtitle">Приглашай друзей и зарабатывай</p>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-value">{profile.referralsCount}</div>
          <div className="stat-label">Приглашено</div>
        </div>
        <div className="stat">
          <div className="stat-value">{profile.referralCommission}%</div>
          <div className="stat-label">Комиссия</div>
        </div>
        <div className="stat" style={{ gridColumn: '1 / -1' }}>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {formatRub(profile.referralEarnings)}
          </div>
          <div className="stat-label">Заработано всего</div>
        </div>
      </div>

      <div className="section-label">Твоя ссылка</div>
      <div className="card">
        <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 10, wordBreak: 'break-all' }}>
          {refLink}
        </div>
        <div className="flex-row">
          <button className="btn btn-primary" onClick={() => { haptic(); void copyLink(); }}>
            🔗 Скопировать ссылку
          </button>
          <button className="btn btn-ghost" onClick={() => { haptic(); void copyCode(); }}>
            Код
          </button>
        </div>
      </div>

      <div className="section-label">Условия программы</div>
      <div className="card">
        <div className="row" style={{ paddingTop: 0 }}>
          <div className="row-icon">💰</div>
          <div className="row-body">
            <div className="row-title">Комиссия {profile.referralCommission}%</div>
            <div className="row-sub">С каждой оплаты реферала — навсегда</div>
          </div>
        </div>
        <div className="row">
          <div className="row-icon">⚡</div>
          <div className="row-body">
            <div className="row-title">Моментальное начисление</div>
            <div className="row-sub">Сразу после оплаты реферала</div>
          </div>
        </div>
        <div className="row">
          <div className="row-icon">♾️</div>
          <div className="row-body">
            <div className="row-title">Без ограничений</div>
            <div className="row-sub">Приглашай сколько угодно людей</div>
          </div>
        </div>
        <div className="row">
          <div className="row-icon">💸</div>
          <div className="row-body">
            <div className="row-title">Вывод на баланс</div>
            <div className="row-sub">Тратишь как обычные рубли на тарифы</div>
          </div>
        </div>
      </div>

      <div className="section-label">Твои рефералы ({referrals.length})</div>
      <div className="card">
        {referrals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
            Пока никто не перешёл по твоей ссылке
          </div>
        ) : (
          referrals.map((r) => (
            <div className="row" key={r.telegramId}>
              <div className="row-icon">👤</div>
              <div className="row-body">
                <div className="row-title">
                  {r.username ? '@' + r.username : r.firstName}
                  <span style={{ color: 'var(--text-faint)', fontSize: 12, marginLeft: 6 }}>
                    ID {r.telegramId}
                  </span>
                </div>
                <div className="row-sub">С {formatDate(r.joinedAt)}</div>
              </div>
              <div className="row-action" style={{ fontWeight: 700, color: 'var(--success)', fontSize: 13 }}>
                +{formatRub(r.earnedRub)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}