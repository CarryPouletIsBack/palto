import './DashboardMobileTabBar.css';

export type DashboardMobilePillSwitchItem = {
  id: string;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
};

type Props = {
  ariaLabel: string;
  items: DashboardMobilePillSwitchItem[];
  /** Plusieurs libellés : défilement horizontal (compte). Sinon largeur égale (ex. Stats). */
  scroll?: boolean;
};

export default function DashboardMobilePillSwitch({ ariaLabel, items, scroll = false }: Props) {
  return (
    <div
      className={`dashboard-mobile-pill-switch${scroll ? ' dashboard-mobile-pill-switch--scroll' : ''}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.active}
          disabled={item.disabled}
          className={`dashboard-mobile-pill-switch__btn${item.active ? ' is-active' : ''}${
            item.disabled ? ' is-disabled' : ''
          }`}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
