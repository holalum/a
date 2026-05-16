// Тонкая обёртка над Telegram WebApp SDK.
// Всё деградирует мягко, чтобы приложение работало и в обычном браузере (для разработки).

const tg = window.Telegram?.WebApp;

export const isTelegram = Boolean(tg && tg.initData !== undefined);

export function initTelegram(): void {
  if (!tg) return;
  tg.ready();
  tg.expand();
  try {
    tg.enableClosingConfirmation();
  } catch {
    /* старые клиенты */
  }
}

export function getColorScheme(): 'light' | 'dark' {
  return tg?.colorScheme ?? 'dark';
}

export function getThemeParams(): Record<string, string> {
  return tg?.themeParams ?? {};
}

export function getTelegramUser(): TelegramWebAppUser | null {
  return tg?.initDataUnsafe?.user ?? null;
}

type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

export function haptic(style: HapticStyle = 'light'): void {
  try {
    tg?.HapticFeedback.impactOccurred(style);
  } catch {
    /* нет поддержки */
  }
}

export function hapticNotify(type: 'error' | 'success' | 'warning'): void {
  try {
    tg?.HapticFeedback.notificationOccurred(type);
  } catch {
    /* нет поддержки */
  }
}

export function hapticSelection(): void {
  try {
    tg?.HapticFeedback.selectionChanged();
  } catch {
    /* нет поддержки */
  }
}

export function openLink(url: string): void {
  if (tg) tg.openLink(url);
  else window.open(url, '_blank');
}

export const telegram = tg;
