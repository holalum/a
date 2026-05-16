import { useEffect, useState } from 'react';
import { BottomNav, type Tab } from './components/BottomNav';
import { ScreenSkeleton } from './components/ui';
import { DevicesPage } from './pages/DevicesPage';
import { HomePage } from './pages/HomePage';
import { PlansPage } from './pages/PlansPage';
import { ProfilePage } from './pages/ProfilePage';
import { WheelPage } from './pages/WheelPage';
import { useStore } from './store';
import { initTelegram, telegram } from './telegram';

export function App() {
  const { loading } = useStore();
  const [tab, setTab] = useState<Tab>('home');

  useEffect(() => {
    initTelegram();
    try {
      telegram?.setHeaderColor('#0d0d14');
      telegram?.setBackgroundColor('#0d0d14');
    } catch {
      /* старые клиенты */
    }
  }, []);

  // Кнопка «Назад» Telegram уводит на главную с любой вкладки.
  useEffect(() => {
    const back = telegram?.BackButton;
    if (!back) return;
    const handler = () => setTab('home');
    if (tab === 'home') {
      back.hide();
    } else {
      back.show();
      back.onClick(handler);
    }
    return () => back.offClick(handler);
  }, [tab]);

  return (
    <div className="app">
      <div className="app-bg" />
      {loading ? (
        <ScreenSkeleton />
      ) : (
        <>
          {tab === 'home' && <HomePage onNavigate={setTab} />}
          {tab === 'devices' && <DevicesPage />}
          {tab === 'wheel' && <WheelPage />}
          {tab === 'plans' && <PlansPage />}
          {tab === 'profile' && <ProfilePage />}
        </>
      )}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
