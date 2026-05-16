import type { Tab } from '../components/BottomNav';
import { Empty } from '../components/ui';
import { useStore } from '../store';
import { haptic, hapticNotify } from '../telegram';
import { useToast } from '../toast';
import { daysLeft, formatDate, formatGb } from '../utils';

const STATUS_LABEL: Record<string, string> = {
  active: 'Активна',
  trial: 'Пробная',
  expired: 'Истекла',
};

export function HomePage({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { profile, subscription, servers } = useStore();
  const notify = useToast();

  if (!profile || !subscription) return null;

  const left = daysLeft(subscription.expiresAt);
  const unlimited = subscription.trafficLimitGb == null;
  const usedPercent = unlimited
    ? 0
    : Math.min(100, (subscription.trafficUsedGb / subscription.trafficLimitGb!) * 100);

  const copySubLink = async () => {
    try {
      await navigator.clipboard.writeText(subscription.subscriptionUrl);
      hapticNotify('success');
      notify('Ссылка подписки скопирована');
    } catch {
      notify('Не удалось скопировать');
    }
  };

  const topServers = [...servers].sort((a, b) => a.pingMs - b.pingMs).slice(0, 3);

  return (
    <div className="screen">
      <h1 className="screen-title">Привет, {profile.firstName} 👋</h1>
      <p className="screen-subtitle">Aurora VPN — твоё защищённое соединение</p>

      <div className="hero">
        <div className="hero-row">
          <div>
            <div className="hero-plan">{subscription.plan}</div>
            <div className="hero-days">
              {left}
              <span> {pluralDays(left)}</span>
            </div>
            <div className="hero-expire">до {formatDate(subscription.expiresAt)}</div>
          </div>
          <span className={'badge badge-' + subscription.status}>
            <i className="dot" />
            {STATUS_LABEL[subscription.status]}
          </span>
        </div>

        <div className="progress">
          <div
            className="progress-fill"
            style={{ width: unlimited ? '100%' : usedPercent + '%' }}
          />
        </div>
        <div className="traffic-row">
          <span>
            {unlimited
              ? 'Безлимитный трафик'
              : `${formatGb(subscription.trafficUsedGb)} / ${subscription.trafficLimitGb} ГБ`}
          </span>
          <span style={{ opacity: 0.85 }}>
            {unlimited ? '∞' : `осталось ${formatGb(subscription.trafficLimitGb! - subscription.trafficUsedGb)} ГБ`}
          </span>
        </div>
      </div>

      <div className="flex-row" style={{ marginTop: 14 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            haptic('medium');
            void copySubLink();
          }}
        >
          🔗 Скопировать ключ
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            haptic();
            onNavigate('plans');
          }}
        >
          ✨ Продлить
        </button>
      </div>

      <div className="section-label">Статистика</div>
      <div className="stat-grid">
        <div className="stat">
          <div className="stat-value">{formatGb(subscription.trafficUsedGb)} ГБ</div>
          <div className="stat-label">Трафик за период</div>
        </div>
        <div className="stat">
          <div className="stat-value">{servers.length}</div>
          <div className="stat-label">Доступно локаций</div>
        </div>
        <div className="stat">
          <div className="stat-value">{profile.referralsCount}</div>
          <div className="stat-label">Приглашено друзей</div>
        </div>
        <div className="stat">
          <div className="stat-value">{profile.balanceBonusDays}</div>
          <div className="stat-label">Бонусных дней</div>
        </div>
      </div>

      <div className="section-label">Быстрые локации</div>
      <div className="card">
        {topServers.length === 0 ? (
          <Empty emoji="🌍" text="Серверы загружаются" />
        ) : (
          topServers.map((s) => (
            <div className="row" key={s.id}>
              <div className="row-icon">{s.flag}</div>
              <div className="row-body">
                <div className="row-title">
                  {s.city}
                  {s.premium && ' ⭐'}
                </div>
                <div className="row-sub">Загрузка {s.loadPercent}%</div>
              </div>
              <div
                className="row-action"
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: s.pingMs < 50 ? 'var(--success)' : 'var(--text-dim)',
                }}
              >
                {s.pingMs} ms
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня';
  return 'дней';
}
