import type { ReactNode } from 'react';
import './DashboardMobileTabBar.css';

export type DashboardMobileTabItem = {
  id: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  badge?: number;
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
          aria-label={
            item.badge != null && item.badge > 0 ? `${item.label} (${item.badge})` : item.label
          }
        >
          <span className="dashboard-mobile-tabbar__icon" aria-hidden>
            {item.icon}
            {item.badge != null && item.badge > 0 ? (
              <span className="dashboard-mobile-tabbar__badge">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </span>
          <span className="dashboard-mobile-tabbar__label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
