import type { Tab } from '../components/BottomNav';
import { useStore } from '../store';
import { haptic, hapticNotify } from '../telegram';
import { useToast } from '../toast';
import { daysLeft, formatDate, formatRub, pluralDays } from '../utils';

const STATUS_LABEL: Record<string, string> = { active: 'Активна', trial: 'Пробная', expired: 'Истекла' };

export function HomePage({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { profile, subscription } = useStore();
  const notify = useToast();

  if (!profile || !subscription) return null;

  const left = daysLeft(subscription.expiresAt);
  const elapsed = Math.max(0, subscription.totalDays - left);
  const daysProgress = Math.min(100, (elapsed / subscription.totalDays) * 100);

  const copySubLink = async () => {
    try {
      await navigator.clipboard.writeText(subscription.subscriptionUrl);
      hapticNotify('success');
      notify('Ключ подписки скопирован');
    } catch {
      notify('Не удалось скопировать');
    }
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Привет, {profile.firstName} 👋</h1>
      <p className="screen-subtitle">Harmony VPN · защита всегда с тобой</p>

      <div className="hero">
        <div className="hero-row">
          <div>
            <div className="hero-plan">{subscription.plan}</div>
            <div className="hero-days">
              {left}<span> {pluralDays(left)}</span>
            </div>
            <div className="hero-expire">до {formatDate(subscription.expiresAt)}</div>
          </div>
          <span className={'badge badge-' + subscription.status}>
            <i className="dot" />
            {STATUS_LABEL[subscription.status]}
          </span>
        </div>

        <div className="progress" style={{ marginTop: 14 }}>
          <div className="progress-fill" style={{ width: daysProgress + '%' }} />
        </div>
        <div className="traffic-row">
          <span>Прошло {elapsed} {pluralDays(elapsed)}</span>
          <span>Осталось {left} {pluralDays(left)}</span>
        </div>
      </div>

      <div className="flex-row" style={{ marginTop: 14 }}>
        <button className="btn btn-primary" onClick={() => { haptic('medium'); void copySubLink(); }}>
          🔗 Скопировать ключ
        </button>
        <button className="btn btn-ghost" onClick={() => { haptic(); onNavigate('sub'); }}>
          ✨ Продлить
        </button>
      </div>

      <div className="section-label">Кошелёк</div>
      <div className="stat-grid">
        <div className="stat" style={{ cursor: 'pointer' }} onClick={() => { haptic(); onNavigate('balance'); }}>
          <div className="stat-value">{formatRub(profile.balance)}</div>
          <div className="stat-label">Баланс</div>
        </div>
        <div className="stat" style={{ cursor: 'pointer' }} onClick={() => { haptic(); onNavigate('ref'); }}>
          <div className="stat-value">{profile.referralsCount}</div>
          <div className="stat-label">Рефералов</div>
        </div>
        <div className="stat" style={{ gridColumn: '1 / -1' }}>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {formatRub(profile.referralEarnings)}
          </div>
          <div className="stat-label">Заработано с рефералов (комиссия {profile.referralCommission}%)</div>
        </div>
      </div>
    </div>
  );
}