import { useState } from 'react';
import { useStore } from '../store';
import { haptic, isTelegram, openLink } from '../telegram';
import { useToast } from '../toast';

const LOGIN_METHODS = [
  { icon: '📱', label: 'Telegram', connected: true  },
  { icon: '🍎', label: 'Apple ID',  connected: false },
  { icon: '🔑', label: 'Email',     connected: false },
];

export function ProfilePage() {
  const { profile } = useStore();
  const notify = useToast();
  const [showAgreement, setShowAgreement] = useState(false);

  if (!profile) return null;

  const initials = (profile.firstName[0] ?? 'A').toUpperCase();

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
            <div style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 4 }}>
              ID: {profile.id}
            </div>
          </div>
        </div>
      </div>

      <div className="section-label">Способы входа</div>
      <div className="card">
        {LOGIN_METHODS.map((m) => (
          <div className="row" key={m.label} style={{ paddingTop: m === LOGIN_METHODS[0] ? 0 : undefined }}>
            <div className="row-icon">{m.icon}</div>
            <div className="row-body">
              <div className="row-title">{m.label}</div>
              <div className="row-sub">{m.connected ? 'Подключён' : 'Не подключён'}</div>
            </div>
            <div className="row-action">
              {m.connected ? (
                <span className="badge badge-active">активен</span>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => { haptic(); notify('Будет доступно после обновления'); }}>
                  Подключить
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="section-label">Поддержка</div>
      <div className="card">
        <button className="row" style={{ width: '100%', textAlign: 'left', paddingTop: 0 }}
          onClick={() => { haptic(); openLink('https://t.me/'); }}>
          <div className="row-icon">💬</div>
          <div className="row-body"><div className="row-title">Чат поддержки</div><div className="row-sub">Ответим в течение часа</div></div>
          <div className="row-action" style={{ color: 'var(--text-faint)', fontSize: 18 }}>›</div>
        </button>
        <button className="row" style={{ width: '100%', textAlign: 'left' }}
          onClick={() => { haptic(); notify('FAQ откроется после подключения панели'); }}>
          <div className="row-icon">❓</div>
          <div className="row-body"><div className="row-title">Частые вопросы</div><div className="row-sub">Настройка и устранение проблем</div></div>
          <div className="row-action" style={{ color: 'var(--text-faint)', fontSize: 18 }}>›</div>
        </button>
        <button className="row" style={{ width: '100%', textAlign: 'left' }}
          onClick={() => { haptic(); notify('Канал с новостями будет добавлен'); }}>
          <div className="row-icon">📢</div>
          <div className="row-body"><div className="row-title">Наш Telegram-канал</div><div className="row-sub">Новости и обновления сервиса</div></div>
          <div className="row-action" style={{ color: 'var(--text-faint)', fontSize: 18 }}>›</div>
        </button>
      </div>

      <div className="section-label">Документы</div>
      <div className="card">
        <button className="row" style={{ width: '100%', textAlign: 'left', paddingTop: 0 }}
          onClick={() => { haptic(); setShowAgreement(true); }}>
          <div className="row-icon">📄</div>
          <div className="row-body"><div className="row-title">Пользовательское соглашение</div><div className="row-sub">Условия использования сервиса</div></div>
          <div className="row-action" style={{ color: 'var(--text-faint)', fontSize: 18 }}>›</div>
        </button>
        <button className="row" style={{ width: '100%', textAlign: 'left' }}
          onClick={() => { haptic(); notify('Политика конфиденциальности'); }}>
          <div className="row-icon">🔒</div>
          <div className="row-body"><div className="row-title">Политика конфиденциальности</div><div className="row-sub">Как мы обрабатываем данные</div></div>
          <div className="row-action" style={{ color: 'var(--text-faint)', fontSize: 18 }}>›</div>
        </button>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 12, marginTop: 22 }}>
        Harmony VPN · v0.1.0 · {isTelegram ? 'Telegram Mini App' : 'браузер'}
      </p>

      {showAgreement && (
        <div className="modal-backdrop" onClick={() => setShowAgreement(false)}>
          <div className="modal" style={{ maxHeight: '75vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Пользовательское соглашение</h3>
            <div style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.65 }}>
              <p><b style={{ color: 'var(--text)' }}>1. Общие положения</b><br />
              Используя Harmony VPN, вы принимаете настоящее соглашение в полном объёме. Сервис предоставляется «как есть».</p>
              <p><b style={{ color: 'var(--text)' }}>2. Допустимое использование</b><br />
              Запрещается использовать сервис для незаконной деятельности, обхода санкций, распространения вредоносного ПО или нарушения прав третьих лиц.</p>
              <p><b style={{ color: 'var(--text)' }}>3. Конфиденциальность</b><br />
              Мы не ведём логи трафика. Хранятся только технические данные, необходимые для работы сервиса.</p>
              <p><b style={{ color: 'var(--text)' }}>4. Оплата и возвраты</b><br />
              Подписка активируется сразу после оплаты. Возврат возможен в течение 24 часов при отсутствии использования.</p>
              <p><b style={{ color: 'var(--text)' }}>5. Изменения</b><br />
              Мы вправе изменять условия соглашения с уведомлением через Telegram-канал.</p>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 4 }} onClick={() => setShowAgreement(false)}>
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
}