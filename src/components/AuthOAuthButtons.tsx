import { useEffect, useState, type SVGProps } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { trackEvent } from '../services/googleAnalyticsTracking'
import {
  fetchOAuthProviders,
  startOAuthLogin,
  type OAuthProvider,
  type OAuthProvidersAvailability,
} from '../services/oauthAuthService'
import type { AccountRole } from '../services/authService'
import './AuthPage.css'

type AuthOAuthButtonsProps = {
  role: AccountRole
  mode: 'login' | 'signup'
}

const EMPTY_PROVIDERS: OAuthProvidersAvailability = { google: false, facebook: false }

export function AuthOAuthButtons({ role, mode }: AuthOAuthButtonsProps) {
  const { t } = useLanguage()
  const [providers, setProviders] = useState<OAuthProvidersAvailability>(EMPTY_PROVIDERS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void fetchOAuthProviders().then((result) => {
      if (!cancelled) {
        setProviders(result)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (role === 'chauffeur' && mode === 'signup') return null
  if (loading) return null
  if (!providers.google && !providers.facebook) return null

  const handleClick = (provider: OAuthProvider) => {
    trackEvent('click', 'auth_oauth', `${provider}_${role}`)
    startOAuthLogin(provider, role)
  }

  return (
    <div className="auth-page-oauth">
      <p className="auth-page-oauth__label">{t('authOAuth.continueWith')}</p>
      <div className="auth-page-oauth__buttons">
        {providers.google ? (
          <button
            type="button"
            className="auth-page-oauth__btn auth-page-oauth__btn--google"
            onClick={() => handleClick('google')}
          >
            <GoogleMark aria-hidden />
            {t('authOAuth.google')}
          </button>
        ) : null}
        {providers.facebook ? (
          <button
            type="button"
            className="auth-page-oauth__btn auth-page-oauth__btn--facebook"
            onClick={() => handleClick('facebook')}
          >
            <FacebookMark aria-hidden />
            {t('authOAuth.facebook')}
          </button>
        ) : null}
      </div>
      {role === 'chauffeur' && mode === 'login' ? (
        <p className="auth-page-oauth__hint">{t('authOAuth.chauffeurLoginHint')}</p>
      ) : null}
      <div className="auth-page-oauth__divider" role="separator" aria-label={t('authOAuth.orEmail')}>
        <span>{t('authOAuth.orEmail')}</span>
      </div>
    </div>
  )
}

function GoogleMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function FacebookMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" {...props}>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97H15.83c-1.49 0-1.954.93-1.954 1.886v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  )
}
