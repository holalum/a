const b = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function HomeIcon() {
  return <svg viewBox="0 0 24 24" {...b}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/></svg>;
}
export function SubIcon() {
  return <svg viewBox="0 0 24 24" {...b}><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/></svg>;
}
export function BalanceIcon() {
  return <svg viewBox="0 0 24 24" {...b}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="7" cy="15" r="1" fill="currentColor"/></svg>;
}
export function WheelIcon() {
  return <svg viewBox="0 0 24 24" {...b}><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>;
}
export function RefIcon() {
  return <svg viewBox="0 0 24 24" {...b}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="8" r="2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M19 14a4 4 0 0 1 2 3.5"/></svg>;
}
export function ProfileIcon() {
  return <svg viewBox="0 0 24 24" {...b}><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>;
}
