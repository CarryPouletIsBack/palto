import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import {
  saveClientAppPreferences,
  type ClientAppPreferencesSnapshot,
} from '../constants/clientAppPreferencesStorage'
import {
  fetchAccountNotificationPrefs,
  updateAccountNotificationPrefs,
} from '../services/accountNotificationPrefsApi'
import type { AccountRole } from '../services/authService'
import { trackEvent } from '../services/googleAnalyticsTracking'

type Props = {
  role: AccountRole
  fallbackEmail?: string
  appPrefs: ClientAppPreferencesSnapshot
  onAppPrefsChange: (next: ClientAppPreferencesSnapshot) => void
};

export default function PaltoNotificationPrefsPanel({
  role,
  fallbackEmail,
  appPrefs,
  onAppPrefsChange,
}: Props) {
  const { t, language } = useLanguage()
  const isEn = language === 'en'
  const [email, setEmail] = useState(fallbackEmail?.trim() ?? '')
  const [notifyEmail, setNotifyEmail] = useState(appPrefs.notifyEmail)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchAccountNotificationPrefs(role).then((result) => {
      if (cancelled) return
      if (result.success && result.prefs) {
        setEmail(result.prefs.email)
        setNotifyEmail(result.prefs.notifyEmail)
        onAppPrefsChange({ ...appPrefs, notifyEmail: result.prefs.notifyEmail })
        saveClientAppPreferences({ ...appPrefs, notifyEmail: result.prefs.notifyEmail }, result.prefs.email)
        setError(null)
      } else if (fallbackEmail?.trim()) {
        setEmail(fallbackEmail.trim())
        setNotifyEmail(appPrefs.notifyEmail)
      } else {
        setError(
          isEn ? 'Unable to load notification settings.' : 'Impossible de charger les notifications.'
        )
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [role])

  const handleEmailToggle = async () => {
    if (saving || loading) return
    const nextEnabled = !notifyEmail
    setSaving(true)
    setError(null)
    const result = await updateAccountNotificationPrefs(role, { notifyEmail: nextEnabled })
    setSaving(false)
    if (!result.success || !result.prefs) {
      setError(
        isEn
          ? 'Unable to save your preference. Try again.'
          : 'Impossible d’enregistrer votre préférence. Réessayez.'
      )
      return
    }
    setNotifyEmail(result.prefs.notifyEmail)
    setEmail(result.prefs.email)
    const nextPrefs = { ...appPrefs, notifyEmail: result.prefs.notifyEmail }
    onAppPrefsChange(nextPrefs)
    saveClientAppPreferences(nextPrefs, result.prefs.email)
    trackEvent(
      'click',
      role === 'chauffeur' ? 'chauffeur_dashboard' : 'client_account',
      `notify_email_${result.prefs.notifyEmail ? 'on' : 'off'}`
    )
  }

  if (loading) {
    return <p className="dashboard-field-hint">{isEn ? 'Loading…' : 'Chargement…'}</p>
  }

  return (
    <>
      <div className="client-compte-settings-notify-block">
        <label className="client-compte-settings-toggle-row">
          <span>{t('clientAccount.settingsNotifyEmail')}</span>
          <input
            type="checkbox"
            checked={notifyEmail}
            disabled={saving}
            onChange={() => void handleEmailToggle()}
            aria-describedby="palto-notify-email-destination"
          />
        </label>
        {email ? (
          <p className="client-compte-settings-notify-email-hint" id="palto-notify-email-destination">
            {t('clientAccount.settingsNotifyEmailDestination', { email })}
          </p>
        ) : null}
      </div>

      <label className="client-compte-settings-toggle-row client-compte-settings-toggle-row--disabled" aria-disabled="true">
        <span>
          {t('clientAccount.settingsNotifySms')}
          <span className="client-compte-settings-toggle-row__soon">
            {t('clientAccount.settingsNotifyChannelSoon')}
          </span>
        </span>
        <input type="checkbox" checked={false} disabled readOnly tabIndex={-1} />
      </label>

      <label className="client-compte-settings-toggle-row client-compte-settings-toggle-row--disabled" aria-disabled="true">
        <span>
          {t('clientAccount.settingsNotifyPush')}
          <span className="client-compte-settings-toggle-row__soon">
            {t('clientAccount.settingsNotifyChannelSoon')}
          </span>
        </span>
        <input type="checkbox" checked={false} disabled readOnly tabIndex={-1} />
      </label>

      {error ? <p className="dashboard-field-error">{error}</p> : null}
      {!notifyEmail ? (
        <p className="dashboard-field-hint" style={{ marginTop: 8 }}>
          {t('clientAccount.settingsNotifyEmailOffHint')}
        </p>
      ) : null}
    </>
  )
}
