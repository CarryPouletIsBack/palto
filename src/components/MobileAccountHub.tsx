import type { ReactNode } from 'react';
import { ChevronLeft, X, User } from 'lucide-react';
import './MobileAccountHub.css';

export function MobileAccountHubToolbar({
  mode,
  onPrimaryAction,
  primaryAriaLabel,
  trailing,
}: {
  mode: 'close' | 'back';
  onPrimaryAction: () => void;
  primaryAriaLabel: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="mobile-account-hub__toolbar">
      <button
        type="button"
        className="mobile-account-hub__icon-btn"
        onClick={onPrimaryAction}
        aria-label={primaryAriaLabel}
      >
        {mode === 'close' ? <X size={20} strokeWidth={2.25} aria-hidden /> : <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />}
      </button>
      {trailing ? <div className="mobile-account-hub__toolbar-trailing">{trailing}</div> : <span aria-hidden />}
    </div>
  );
}

export function MobileAccountHubProfile({
  photoUrl,
  prenom,
  nom,
  email,
}: {
  photoUrl: string | null;
  prenom: string;
  nom: string;
  email: string;
}) {
  const fullName = `${prenom} ${nom}`.trim() || '—';
  return (
    <header className="mobile-account-hub__profile">
      <div className="mobile-account-hub__avatar">
        {photoUrl ? <img src={photoUrl} alt="" /> : <User size={32} aria-hidden />}
      </div>
      <h2 className="mobile-account-hub__name">{fullName}</h2>
      <p className="mobile-account-hub__email">{email || '—'}</p>
    </header>
  );
}

export function MobileAccountHubQuickCard({
  title,
  icon,
  onClick,
}: {
  title: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="mobile-account-hub__quick-card" onClick={onClick}>
      <span className="mobile-account-hub__quick-card-icon" aria-hidden>
        {icon}
      </span>
      <span className="mobile-account-hub__quick-card-title">{title}</span>
    </button>
  );
}

export type MobileAccountHubMenuRow = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
};

export function MobileAccountHubMenuCard({ rows }: { rows: MobileAccountHubMenuRow[] }) {
  return (
    <div className="mobile-account-hub__menu-card" role="list">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          role="listitem"
          className={`mobile-account-hub__menu-row${row.danger ? ' mobile-account-hub__menu-row--danger' : ''}`}
          onClick={row.onClick}
          disabled={row.disabled || !row.onClick}
        >
          <span className="mobile-account-hub__menu-row-icon" aria-hidden>
            {row.icon}
          </span>
          <span className="mobile-account-hub__menu-row-label">{row.label}</span>
        </button>
      ))}
    </div>
  );
}

export function MobileAccountDrillShell({
  title,
  onBack,
  backAriaLabel,
  children,
}: {
  title: string;
  onBack: () => void;
  backAriaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="mobile-account-drill">
      <MobileAccountHubToolbar mode="back" onPrimaryAction={onBack} primaryAriaLabel={backAriaLabel} />
      <h2 className="dashboard-chauffeur-main-title mobile-account-drill__title">{title}</h2>
      <div className="mobile-account-drill__body">{children}</div>
    </div>
  );
}
