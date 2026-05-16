import { useState } from 'react';
import { Switch } from '../components/ui';
import { useStore } from '../store';
import { haptic, hapticNotify, isTelegram, openLink } from '../telegram';
import { useToast } from '../toast';
import { formatDate } from '../utils';

export function ProfilePage() {
  const { profile, subscription, setAutoRenew } = useStore();
  const notify = useToast();
  const [renewBusy, setRenewBusy] = useState(false);

  if (!profile || !subscription) return null;

  const initials = (profile.firstName[0] ?? 'A').toUpperCase();

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(profile.referralCode);
      hapticNotify('success');
      notify('Реферальный код скопирован');
    } catch {
      notify('Не удалось скопировать');
    }
  };

  const toggleRenew = async () => {
    if (renewBusy) return;
    haptic();
    setRenewBusy(true);
    await setAutoRenew(!subscription.autoRenew);
    setRenewBusy(false);
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Профиль</h1>
      <p className="screen-subtitle">Аккаунт и настройки</p>

      <div className="card">
        <div className="profile-head">
          {profile.photoUrl ? (
            <img className="avatar" src={profile.photoUrl} alt="" />
          ) : (
            <div className="avatar">{initials}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div className="profile-name">
              {profile.firstName} {profile.lastName ?? ''}
              {profile.isPremium && ' ⭐'}
            </div>
            <div className="profile-username">
              {profile.username ? '@' + profile.username : 'ID ' + profile.id}
            </div>
            <span
              className={'badge badge-' + subscription.status}
              style={{ marginTop: 6 }}
            >
              <i className="dot" />
              {subscription.plan}
            </span>
          </div>
        </div>
      </div>

      <div className="section-label">Реферальная программа</div>
      <div className="card">
        <p style={{ margin: '0 0 12px', color: 'var(--text-dim)', fontSize: 14 }}>
          Приглашай друзей и получай <b style={{ color: 'var(--text)' }}>7 дней</b>{' '}
          подписки за каждого. Уже приглашено: {profile.referralsCount}.
        </p>
        <div className="flex-row">
          <div
            className="text-input"
            style={{ margin: 0, display: 'flex', alignItems: 'center', fontWeight: 700 }}
          >
            {profile.referralCode}
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ padding: '0 18px' }}
            onClick={() => void copyReferral()}
          >
            Копировать
          </button>
        </div>
      </div>

      <div className="section-label">Подписка</div>
      <div className="card">
        <div className="row" style={{ paddingTop: 0 }}>
          <div className="row-icon">🔄</div>
          <div className="row-body">
            <div className="row-title">Автопродление</div>
            <div className="row-sub">Списывать оплату автоматически</div>
          </div>
          <div className="row-action">
            <Switch on={subscription.autoRenew} onToggle={() => void toggleRenew()} />
          </div>
        </div>
        <div className="row">
          <div className="row-icon">📅</div>
          <div className="row-body">
            <div className="row-title">Действует до</div>
            <div className="row-sub">{formatDate(subscription.expiresAt)}</div>
          </div>
        </div>
      </div>

      <div className="section-label">Поддержка</div>
      <div className="card">
        <button
          className="row"
          style={{ width: '100%', paddingTop: 0, textAlign: 'left' }}
          onClick={() => {
            haptic();
            openLink('https://t.me/');
          }}
        >
          <div className="row-icon">💬</div>
          <div className="row-body">
            <div className="row-title">Чат поддержки</div>
            <div className="row-sub">Ответим в течение часа</div>
          </div>
          <div className="row-action" style={{ color: 'var(--text-faint)' }}>
            ›
          </div>
        </button>
        <button
          className="row"
          style={{ width: '100%', textAlign: 'left' }}
          onClick={() => {
            haptic();
            notify('FAQ откроется после подключения панели');
          }}
        >
          <div className="row-icon">❓</div>
          <div className="row-body">
            <div className="row-title">Частые вопросы</div>
            <div className="row-sub">Настройка и устранение неполадок</div>
          </div>
          <div className="row-action" style={{ color: 'var(--text-faint)' }}>
            ›
          </div>
        </button>
      </div>

      <p
        style={{
          textAlign: 'center',
          color: 'var(--text-faint)',
          fontSize: 12,
          marginTop: 22,
        }}
      >
        Aurora VPN · v0.1.0 · {isTelegram ? 'Telegram Mini App' : 'режим браузера'}
      </p>
    </div>
  );
}
