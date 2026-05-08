import { useEffect, useMemo, useRef, useState } from 'react'
import { User } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { trackEvent } from '../services/googleAnalyticsTracking'
import { loadClientAccountSnapshot } from '../constants/clientAccountStorage'
import { isChauffeurPrimaryAccountEmail, logoutClient } from '../services/authService'
import {
  getCurrentClientUser,
  getCurrentUser,
  isAuthenticated,
  isClientAuthenticated,
  PALTO_CLIENT_SESSION_CHANGED_EVENT,
  type User as AuthUser,
} from '../services/authService'
import LanguageSwitcher from './LanguageSwitcher'
import './Dashboard.css'
import './Dashboard.app-theme.css'

export type ClientTopbarUpcomingRide = {
  departShort: string
  arriveShort: string
  startsAtIso: string
  startsLabel: string
}

export interface DashboardHomeTopbarProps {
  onOpenClientAccountAuth?: (mode: 'login' | 'signup') => void
  onOpenClientAccount?: () => void
  /** Clic sur « Palto » : retour accueil (ferme /go si besoin). */
  onNavigateHome?: () => void
}

/** Barre d’accueil (Palto + langue + connexion) — réutilisée sur l’accueil et la page Go. */
export function DashboardHomeTopbar({
  onOpenClientAccountAuth,
  onOpenClientAccount,
  onNavigateHome,
}: DashboardHomeTopbarProps) {
  const { t, language } = useLanguage()
  const [authTick, setAuthTick] = useState(0)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const refresh = () => setAuthTick((n) => n + 1)
    window.addEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const session = useMemo(() => {
    const clientLogged = isClientAuthenticated()
    const chauffeurLogged = isAuthenticated()
    const clientUser = clientLogged ? getCurrentClientUser() : null
    const chauffeurUser = chauffeurLogged ? getCurrentUser() : null
    return {
      clientLogged,
      chauffeurLogged,
      user: clientUser ?? chauffeurUser,
    }
  }, [authTick])

  const accountDisplayName = useMemo(() => {
    const pretty = (value: string) => value.slice(0, 1).toUpperCase() + value.slice(1).toLowerCase()
    const inferFromEmail = (emailRaw: string) => {
      const local = emailRaw.split('@')[0] ?? ''
      const chunks = local
        .split(/[._-]+/)
        .map((part) => part.trim())
        .filter(Boolean)
      if (chunks.length === 0) return emailRaw
      if (chunks.length === 1) return pretty(chunks[0])
      return `${pretty(chunks[0])} ${pretty(chunks.slice(1).join(' '))}`
    }

    const clientProfile = session.clientLogged ? loadClientAccountSnapshot() : null
    const fullClientName = `${clientProfile?.prenom?.trim() ?? ''} ${clientProfile?.nom?.trim() ?? ''}`.trim()
    if (fullClientName) return fullClientName

    const user = session.user as AuthUser | null
    if (user?.displayName?.trim()) return user.displayName.trim()
    if (user?.email?.trim()) return inferFromEmail(user.email.trim())
    return ''
  }, [session.clientLogged, session.user])

  const accountPhotoUrl = useMemo(() => {
    if (!session.clientLogged) return null
    const clientProfile = loadClientAccountSnapshot()
    const photo = clientProfile.profilePhotoUrl
    return typeof photo === 'string' && photo.trim() ? photo : null
  }, [session.clientLogged, authTick])

  const sessionBadges = useMemo(() => {
    const badges: string[] = []
    if (session.clientLogged) badges.push('Client')
    if (session.chauffeurLogged) badges.push('Chauffeur')
    return badges
  }, [session.clientLogged, session.chauffeurLogged])

  const hasLinkedChauffeurAccount = useMemo(() => {
    const email = session.user?.email?.trim() ?? ''
    if (!email) return false
    return session.chauffeurLogged || isChauffeurPrimaryAccountEmail(email)
  }, [session.chauffeurLogged, session.user?.email])

  useEffect(() => {
    if (!accountModalOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current) return
      if (!accountMenuRef.current.contains(event.target as Node)) {
        setAccountModalOpen(false)
      }
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [accountModalOpen])

  const handleDriverDashboard = () => {
    const prefix = language === 'en' ? '/en' : '/fr'
    window.history.pushState({}, '', `${prefix}/dashboard`)
    window.dispatchEvent(new PopStateEvent('popstate'))
    setAccountModalOpen(false)
  }

  const handleClientAccount = () => {
    setAccountModalOpen(false)
    onOpenClientAccount?.()
  }

  const handleLogout = () => {
    logoutClient()
    setAccountModalOpen(false)
  }

  const titleEl =
    onNavigateHome != null ? (
      <button
        type="button"
        className="dashboard-client-main-title"
        onClick={() => {
          trackEvent('click', 'hero_topbar_title', 'home')
          onNavigateHome()
        }}
        aria-label={t('hero.homeTopbarTitleNavAria')}
      >
        {t('hero.homeTopbarTitle')}
      </button>
    ) : (
      <h2 className="dashboard-client-main-title">{t('hero.homeTopbarTitle')}</h2>
    )

  return (
    <header className="dashboard-topbar dashboard-topbar--home-client">
      <div className="dashboard-home-topbar-row">
        <div className="dashboard-home-topbar-start">{titleEl}</div>
        <div className="dashboard-topbar-right">
          <div className="dashboard-home-topbar-right-cluster">
            <LanguageSwitcher />
            {accountDisplayName && onOpenClientAccount ? (
              <div className="client-compte-topbar-menu-anchor" ref={accountMenuRef}>
                <div className="client-compte-topbar-session">
                  <button
                    type="button"
                    className="client-compte-topbar-user-btn"
                    onClick={() => setAccountModalOpen((prev) => !prev)}
                    aria-label="Gerer le compte"
                  >
                    {accountPhotoUrl ? (
                      <img src={accountPhotoUrl} alt={t('clientAccount.photoAlt')} className="client-compte-topbar-user-btn__avatar" />
                    ) : (
                      <User size={16} aria-hidden />
                    )}
                    <span>{accountDisplayName}</span>
                  </button>
                  {sessionBadges.length > 0 ? (
                    <div className="client-compte-topbar-session-badges" aria-label="Sessions actives">
                      {sessionBadges.map((badge) => (
                        <span key={badge} className="client-compte-topbar-session-badge">
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {accountModalOpen ? (
                  <div className="client-compte-account-menu" role="menu" aria-label="Menu compte">
                    <div className="client-compte-account-menu__head">
                      <strong>{accountDisplayName}</strong>
                      <span>{session.user?.email ?? ''}</span>
                      {hasLinkedChauffeurAccount ? (
                        <label className="client-compte-account-menu__role-label">
                          {language === 'en' ? 'Account' : 'Compte'}
                          <select
                            className="client-compte-account-menu__role-select"
                            value="client"
                            onChange={(e) => {
                              if (e.target.value === 'chauffeur') handleDriverDashboard()
                            }}
                          >
                            <option value="client">{language === 'en' ? 'Client account' : 'Compte client'}</option>
                            <option value="chauffeur">{language === 'en' ? 'Driver account' : 'Compte chauffeur'}</option>
                          </select>
                        </label>
                      ) : null}
                    </div>
                    <div className="client-compte-account-menu__actions">
                      <button type="button" className="client-compte-account-menu__item" onClick={handleClientAccount}>
                        {language === 'en' ? 'Manage Palto account' : 'Gerer le compte Palto'}
                      </button>
                      <button type="button" className="client-compte-account-menu__item" onClick={handleLogout}>
                        {language === 'en' ? 'Sign out' : 'Se deconnecter'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : onOpenClientAccountAuth ? (
              <div className="hero-topbar-auth" role="group" aria-label={t('hero.topbarAuthAria')}>
                <button
                  type="button"
                  className="hero-topbar-auth-link"
                  onClick={() => onOpenClientAccountAuth('login')}
                >
                  {t('hero.topbarSignIn')}
                </button>
                <span className="hero-topbar-auth-sep" aria-hidden>
                  |
                </span>
                <button
                  type="button"
                  className="hero-topbar-auth-link"
                  onClick={() => onOpenClientAccountAuth('signup')}
                >
                  {t('hero.topbarSignUp')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
