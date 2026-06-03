import type { ReactNode } from 'react';
import './DashboardMobileTabBar.css';

export type DashboardMobileTabItem = {
  id: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
};

type Props = {
  ariaLabel: string;
  items: DashboardMobileTabItem[];
  variant?: 'chauffeur' | 'client';
};

export default function DashboardMobileTabBar({ ariaLabel, items, variant = 'chauffeur' }: Props) {
  return (
    <nav
      className={`dashboard-mobile-tabbar dashboard-mobile-tabbar--${variant}`}
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`dashboard-mobile-tabbar__item${item.active ? ' is-active' : ''}`}
          onClick={item.onClick}
          aria-current={item.active ? 'page' : undefined}
        >
          <span className="dashboard-mobile-tabbar__icon" aria-hidden>
            {item.icon}
          </span>
          <span className="dashboard-mobile-tabbar__label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
