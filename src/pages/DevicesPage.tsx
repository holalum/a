import { useState } from 'react';
import type { DevicePlatform } from '../api';
import { Empty, Modal } from '../components/ui';
import { useStore } from '../store';
import { haptic, hapticNotify } from '../telegram';
import { useToast } from '../toast';
import { relativeTime } from '../utils';

const PLATFORM_ICON: Record<DevicePlatform, string> = {
  ios: '📱',
  android: '🤖',
  windows: '🖥️',
  macos: '💻',
  linux: '🐧',
  router: '📡',
};

export function DevicesPage() {
  const { devices, removeDevice, renameDevice } = useStore();
  const notify = useToast();
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const maxDevices = 5;

  const doRemove = async () => {
    if (!removingId) return;
    setBusy(true);
    await removeDevice(removingId);
    setBusy(false);
    setRemovingId(null);
    hapticNotify('success');
    notify('Устройство отключено');
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

  return (
    <div className="screen">
      <h1 className="screen-title">Устройства</h1>
      <p className="screen-subtitle">
        Подключено {devices.length} из {maxDevices} по тарифу
      </p>

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
                  {d.isCurrent && (
                    <span className="badge badge-active" style={{ marginLeft: 8 }}>
                      это устройство
                    </span>
                  )}
                </div>
                <div className="row-sub">
                  {d.ipCountry} · {relativeTime(d.lastSeen)}
                </div>
              </div>
              <div className="row-action flex-row">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    haptic();
                    setRenaming({ id: d.id, name: d.name });
                  }}
                >
                  ✏️
                </button>
                {!d.isCurrent && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      haptic('medium');
                      setRemovingId(d.id);
                    }}
                  >
                    Отключить
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section-label">Добавить устройство</div>
      <div className="card">
        <p style={{ margin: '0 0 14px', color: 'var(--text-dim)', fontSize: 14 }}>
          Установи приложение VPN-клиента и импортируй ключ подписки — устройство
          появится в списке автоматически.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => {
            haptic();
            notify('Инструкция откроется после подключения панели');
          }}
        >
          📖 Инструкция по подключению
        </button>
      </div>

      {renaming && (
        <Modal title="Переименовать устройство" onClose={() => setRenaming(null)}>
          <input
            className="text-input"
            value={renaming.name}
            autoFocus
            maxLength={32}
            onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
            placeholder="Название устройства"
          />
          <button className="btn btn-primary" disabled={busy} onClick={doRename}>
            {busy ? <span className="spinner" /> : 'Сохранить'}
          </button>
        </Modal>
      )}

      {removingId && (
        <Modal title="Отключить устройство?" onClose={() => setRemovingId(null)}>
          <p style={{ margin: '0 0 16px', color: 'var(--text-dim)' }}>
            Устройство потеряет доступ к VPN. Его можно будет подключить заново в любой
            момент.
          </p>
          <div className="flex-row">
            <button className="btn btn-ghost" onClick={() => setRemovingId(null)}>
              Отмена
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={doRemove}>
              {busy ? <span className="spinner" /> : 'Отключить'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
