import { useEffect, type ReactNode } from 'react';

export function Skeleton({ height = 80 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} />;
}

export function ScreenSkeleton() {
  return (
    <div className="screen">
      <Skeleton height={120} />
      <div style={{ height: 14 }} />
      <Skeleton height={90} />
      <div style={{ height: 14 }} />
      <Skeleton height={140} />
    </div>
  );
}

export function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      className={'switch' + (on ? ' on' : '')}
      onClick={onToggle}
      aria-pressed={on}
    />
  );
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return <div className="toast">{message}</div>;
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      {text}
    </div>
  );
}