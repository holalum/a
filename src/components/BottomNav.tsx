import { hapticSelection } from '../telegram';
import { BalanceIcon, HomeIcon, ProfileIcon, RefIcon, SubIcon, WheelIcon } from './icons';

export type Tab = 'home' | 'sub' | 'balance' | 'wheel' | 'ref' | 'profile';

const TABS: { id: Tab; label: string; icon: () => JSX.Element; highlight?: boolean }[] = [
  { id: 'home',    label: 'Главная',   icon: HomeIcon    },
  { id: 'sub',     label: 'Подписка',  icon: SubIcon     },
  { id: 'balance', label: 'Баланс',    icon: BalanceIcon },
  { id: 'wheel',   label: 'Колесо',    icon: WheelIcon, highlight: true },
  { id: 'ref',     label: 'Рефералы',  icon: RefIcon     },
  { id: 'profile', label: 'Профиль',   icon: ProfileIcon },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={'nav-item' + (active === tab.id ? ' active' : '') + (tab.highlight ? ' highlight' : '')}
            onClick={() => { if (active !== tab.id) { hapticSelection(); onChange(tab.id); } }}
          >
            <Icon />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
