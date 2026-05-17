import { useCallback, useEffect, useRef, useState } from 'react';
import type { Prize, SpinResult } from '../api';
import { PRIZES, canSpin, commitSpin, getHistory, getNextSpinAt, pickPrize } from '../api/wheel';
import { useStore } from '../store';
import { haptic, hapticNotify } from '../telegram';
import { useToast } from '../toast';
import { formatCountdown, formatShortDate } from '../utils';

const SEG = (2 * Math.PI) / PRIZES.length;
const SPIN_MS = 5200;

const PRIZE_EMOJI: Record<string, string> = {
  days: '🎁', balance: '💰', discount: '🏷️', nothing: '🙃',
};

function drawWheel(ctx: CanvasRenderingContext2D, size: number, rotation: number) {
  const c = size / 2;
  const r = c - 6;
  ctx.clearRect(0, 0, size, size);

  PRIZES.forEach((prize, i) => {
    const start = i * SEG + rotation;
    const end = start + SEG;

    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, r, start, end);
    ctx.closePath();
    ctx.fillStyle = prize.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.stroke();

    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(start + SEG / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = prize.kind === 'nothing' ? '#c8c8d8' : '#0d0d14';
    ctx.font = '700 13px -apple-system, Roboto, sans-serif';
    ctx.fillText(prize.shortLabel, r - 16, 0);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(c, c, r, 0, 2 * Math.PI);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.stroke();
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function WheelPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const rafRef = useRef<number>(0);
  const { applyReward } = useStore();
  const notify = useToast();

  const [spinning, setSpinning] = useState(false);
  const [available, setAvailable] = useState(canSpin());
  const [nextAt, setNextAt] = useState<number | null>(getNextSpinAt());
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<Prize | null>(null);
  const [history, setHistory] = useState<SpinResult[]>(getHistory());

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Реальный размер канваса на экране — квадрат гарантируется CSS (aspect-ratio).
    const rect = canvas.getBoundingClientRect();
    const size = Math.round(Math.min(rect.width, rect.height));
    if (size === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const buf = Math.round(size * dpr);
    if (canvas.width !== buf || canvas.height !== buf) {
      canvas.width = buf;
      canvas.height = buf;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    drawWheel(ctx, size, rotationRef.current);
  }, []);

  // Перерисовка после монтирования и при ресайзе окна.
  useEffect(() => {
    const raf = requestAnimationFrame(render);
    window.addEventListener('resize', render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', render);
    };
  }, [render]);

  useEffect(() => {
    if (available || nextAt == null) return;
    const tick = () => {
      const left = nextAt - Date.now();
      if (left <= 0) { setAvailable(true); setNextAt(null); setRemaining(0); }
      else setRemaining(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [available, nextAt]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const spin = () => {
    if (spinning || !available) return;
    setSpinning(true);
    setResult(null);
    haptic('heavy');

    const index = pickPrize();
    const jitter = (Math.random() - 0.5) * SEG * 0.55;
    const needMod = ((-Math.PI / 2 - index * SEG - SEG / 2 - jitter) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const currentMod = ((rotationRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const delta = (needMod - currentMod + 2 * Math.PI) % (2 * Math.PI);
    const from = rotationRef.current;
    const to = from + 6 * 2 * Math.PI + delta;
    const startTs = performance.now();
    let lastTick = 0;

    const frame = (now: number) => {
      const p = Math.min(1, (now - startTs) / SPIN_MS);
      rotationRef.current = from + (to - from) * easeOutCubic(p);
      render();
      const passed = Math.floor(rotationRef.current / SEG);
      if (passed !== lastTick) { lastTick = passed; if (p < 0.97) haptic('light'); }
      if (p < 1) { rafRef.current = requestAnimationFrame(frame); } else { finishSpin(index); }
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  const finishSpin = (index: number) => {
    const spinResult = commitSpin(index);
    const prize = spinResult.prize;
    setResult(prize);
    setSpinning(false);
    setAvailable(false);
    setNextAt(getNextSpinAt());
    setHistory(getHistory());

    if (prize.kind === 'nothing') {
      hapticNotify('warning');
      notify('Не повезло — но через неделю новый шанс!');
    } else {
      hapticNotify('success');
      notify(`Поздравляем: ${prize.label}!`);
      void applyReward(prize.kind, prize.amount);
    }
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Колесо фортуны 🎡</h1>
      <p className="screen-subtitle">Один бесплатный спин раз в неделю</p>

      <div className="wheel-wrap">
        <div className="wheel-stage">
          <div className="wheel-pointer" />
          <canvas ref={canvasRef} className="wheel-canvas" />
          <div className="wheel-hub">{spinning ? '🌀' : '🎯'}</div>
        </div>
      </div>

      {available ? (
        <button className="btn btn-primary" style={{ marginTop: 18 }} disabled={spinning} onClick={spin}>
          {spinning ? 'Крутим…' : '🎲 Крутить колесо'}
        </button>
      ) : (
        <div className="cooldown-box card" style={{ marginTop: 18 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Следующая прокрутка через</div>
          <div className="cooldown-timer">{formatCountdown(remaining)}</div>
        </div>
      )}

      {result && (
        <div className="card prize-pop" style={{ marginTop: 14 }}>
          <div className="prize-pop-emoji">{PRIZE_EMOJI[result.kind]}</div>
          <div className="prize-pop-title">
            {result.kind === 'nothing' ? 'В этот раз мимо' : result.label}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
            {result.kind === 'nothing'
              ? 'Возвращайся через неделю'
              : result.kind === 'discount'
                ? 'Промокод придёт в чат бота'
                : 'Приз зачислен на твой аккаунт'}
          </div>
        </div>
      )}

      <div className="section-label">Возможные призы</div>
      <div className="card">
        {PRIZES.filter((p) => p.kind !== 'nothing').map((p) => (
          <div className="row" key={p.id}>
            <div className="row-icon" style={{ background: p.color + '33' }}>{PRIZE_EMOJI[p.kind]}</div>
            <div className="row-body">
              <div className="row-title">{p.label}</div>
              <div className="row-sub">Шанс выпадения зависит от удачи</div>
            </div>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <div className="section-label">История прокруток</div>
          <div className="card">
            {history.slice(0, 6).map((h, i) => (
              <div className="row" key={i}>
                <div className="row-icon">{PRIZE_EMOJI[h.prize.kind]}</div>
                <div className="row-body">
                  <div className="row-title">{h.prize.kind === 'nothing' ? 'Без приза' : h.prize.label}</div>
                  <div className="row-sub">{formatShortDate(h.at)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
