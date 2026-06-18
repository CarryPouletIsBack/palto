import { Car, User } from 'lucide-react'

type AuthPageRoleTabsProps = {
  activeRole: 'client' | 'chauffeur'
  clientLabel: string
  chauffeurLabel: string
  onSelectClient?: () => void
  onSelectChauffeur?: () => void
}

export function AuthPageRoleTabs({
  activeRole,
  clientLabel,
  chauffeurLabel,
  onSelectClient,
  onSelectChauffeur,
}: AuthPageRoleTabsProps) {
  if (!onSelectClient && !onSelectChauffeur) return null

  return (
    <div className="auth-page-role-tabs" role="tablist" aria-label={`${clientLabel} / ${chauffeurLabel}`}>
      <button
        type="button"
        role="tab"
        className={'auth-page-role-tab' + (activeRole === 'client' ? ' auth-page-role-tab--active' : '')}
        aria-selected={activeRole === 'client'}
        disabled={activeRole === 'client'}
        onClick={onSelectClient}
      >
        <User size={18} strokeWidth={2.25} aria-hidden />
        <span>{clientLabel}</span>
      </button>
      <button
        type="button"
        role="tab"
        className={'auth-page-role-tab' + (activeRole === 'chauffeur' ? ' auth-page-role-tab--active' : '')}
        aria-selected={activeRole === 'chauffeur'}
        disabled={activeRole === 'chauffeur'}
        onClick={onSelectChauffeur}
      >
        <Car size={18} strokeWidth={2.25} aria-hidden />
        <span>{chauffeurLabel}</span>
      </button>
    </div>
  )
}
