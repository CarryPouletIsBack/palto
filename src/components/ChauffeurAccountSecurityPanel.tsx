import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import {
  changeChauffeurPassword,
  fetchChauffeurSecurityStatus,
  unlinkChauffeurOAuth,
  type AccountSecurityStatus,
} from '../services/chauffeurAccountSecurityApi'
import {
  PALTO_CHAUFFEUR_SESSION_CHANGED_EVENT,
  setPaltoAuthMethod,
} from '../services/authService'
import { fetchOAuthProviders, startOAuthLogin } from '../services/oauthAuthService'

type Props = {
  isEn: boolean
}

function formatSecurityDate(iso: string, isEn: boolean): string {
  try {
    return new Intl.DateTimeFormat(isEn ? 'en-GB' : 'fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function mapPasswordError(code: string | undefined, t: (key: string) => string, isEn: boolean): string {
  switch (code) {
    case 'CURRENT_PASSWORD_REQUIRED':
      return isEn ? 'Current password is required.' : 'Le mot de passe actuel est requis.'
    case 'WRONG_PASSWORD':
      return isEn ? 'Current password is incorrect.' : 'Mot de passe actuel incorrect.'
    case 'PASSWORD_TOO_SHORT':
      return t('clientAccount.securityPasswordTooShort')
    case 'PASSWORD_MISMATCH':
      return t('clientAccount.securityPasswordMismatch')
    case 'SESSION_REQUIRED':
      return isEn ? 'Sign in again to continue.' : 'Reconnectez-vous pour continuer.'
    case 'OAUTH_UNLINK_PASSWORD_REQUIRED':
      return isEn
        ? 'Set a password before disconnecting Google.'
        : 'Definissez un mot de passe avant de deconnecter Google.'
    default:
      return isEn ? 'Unable to update password.' : 'Impossible de modifier le mot de passe.'
  }
}

export default function ChauffeurAccountSecurityPanel({ isEn }: Props) {
  const { t } = useLanguage()
  const [status, setStatus] = useState<AccountSecurityStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [googleAvailable, setGoogleAvailable] = useState(false)
  const [pwdPanelOpen, setPwdPanelOpen] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)

  const reloadStatus = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const [securityResult, providers] = await Promise.all([
      fetchChauffeurSecurityStatus(),
      fetchOAuthProviders(),
    ])
    setGoogleAvailable(providers.google)
    if (!securityResult.success || !securityResult.status) {
      setLoadError(
        securityResult.error === 'SESSION_REQUIRED'
          ? isEn
            ? 'Session expired.'
            : 'Session expiree.'
          : isEn
            ? 'Unable to load security settings.'
            : 'Impossible de charger les parametres de securite.'
      )
      setStatus(null)
    } else {
      setStatus(securityResult.status)
    }
    setLoading(false)
  }, [isEn])

  useEffect(() => {
    void reloadStatus()
  }, [reloadStatus])

  useEffect(() => {
    const onSessionChange = () => {
      void reloadStatus()
    }
    window.addEventListener(PALTO_CHAUFFEUR_SESSION_CHANGED_EVENT, onSessionChange)
    return () => window.removeEventListener(PALTO_CHAUFFEUR_SESSION_CHANGED_EVENT, onSessionChange)
  }, [reloadStatus])

  const submitPasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    if (newPwd.length < 6) {
      setPwdError(isEn ? 'At least 6 characters.' : 'Au moins 6 caracteres.')
      return
    }
    if (newPwd !== confirmPwd) {
      setPwdError(t('clientAccount.securityPasswordMismatch'))
      return
    }
    if (status?.hasPassword && !currentPwd.trim()) {
      setPwdError(isEn ? 'Current password is required.' : 'Le mot de passe actuel est requis.')
      return
    }
    setPwdSaving(true)
    setPwdError(null)
    const result = await changeChauffeurPassword({
      currentPassword: status?.hasPassword ? currentPwd : undefined,
      newPassword: newPwd,
    })
    setPwdSaving(false)
    if (!result.success) {
      setPwdError(mapPasswordError(result.error, t, isEn))
      return
    }
    setPaltoAuthMethod('chauffeur', 'password')
    setCurrentPwd('')
    setNewPwd('')
    setConfirmPwd('')
    setPwdPanelOpen(false)
    await reloadStatus()
  }

  const handleConnectGoogle = () => {
    if (!googleAvailable || status?.oauthGoogle) return
    startOAuthLogin('google', 'chauffeur', { intent: 'login' })
  }

  const handleDisconnectGoogle = async () => {
    if (!status?.oauthGoogle || oauthBusy) return
    setOauthBusy(true)
    const result = await unlinkChauffeurOAuth('google')
    setOauthBusy(false)
    if (!result.success) {
      window.alert(mapPasswordError(result.error, t, isEn))
      return
    }
    if (status.hasPassword) setPaltoAuthMethod('chauffeur', 'password')
    await reloadStatus()
  }

  if (loading) {
    return <p className="dashboard-field-hint">{isEn ? 'Loading…' : 'Chargement…'}</p>
  }

  if (loadError) {
    return <p className="dashboard-field-error">{loadError}</p>
  }

  if (!status) return null

  const passwordActionLabel = status.hasPassword
    ? t('clientAccount.securityChangePassword')
    : isEn
      ? 'Set a password'
      : 'Definir un mot de passe'

  return (
    <div className="client-compte-security">
      <section className="dashboard-user-card" style={{ marginBottom: 20 }}>
        <h3 className="client-compte-section-title">{t('clientAccount.securityPasswordTitle')}</h3>
        {status.hasPassword ? (
          <>
            <p className="client-compte-masked-pwd" aria-label={t('clientAccount.securityPasswordField')}>
              ••••••••
            </p>
            {status.passwordUpdatedAt ? (
              <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
                {t('clientAccount.securityLastChanged', {
                  date: formatSecurityDate(status.passwordUpdatedAt, isEn),
                })}
              </p>
            ) : null}
          </>
        ) : (
          <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
            {isEn
              ? 'No password yet. You can sign in with Google or set a password below.'
              : 'Aucun mot de passe defini. Vous pouvez vous connecter avec Google ou en definir un ci-dessous.'}
          </p>
        )}
        {!pwdPanelOpen ? (
          <button
            type="button"
            className="dashboard-user-edit-btn"
            onClick={() => {
              setPwdPanelOpen(true)
              setPwdError(null)
            }}
          >
            {passwordActionLabel}
          </button>
        ) : (
          <form className="dashboard-user-edit-grid client-compte-pwd-form" onSubmit={(e) => void submitPasswordChange(e)}>
            {status.hasPassword ? (
              <label>
                {t('clientAccount.securityPasswordField')}
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPwd}
                  onChange={(e) => {
                    setCurrentPwd(e.target.value)
                    if (pwdError) setPwdError(null)
                  }}
                />
              </label>
            ) : null}
            <label>
              {t('clientAccount.securityNewPassword')}
              <input
                type="password"
                autoComplete="new-password"
                value={newPwd}
                onChange={(e) => {
                  setNewPwd(e.target.value)
                  if (pwdError) setPwdError(null)
                }}
              />
            </label>
            <label>
              {t('clientAccount.securityConfirmPassword')}
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPwd}
                onChange={(e) => {
                  setConfirmPwd(e.target.value)
                  if (pwdError) setPwdError(null)
                }}
              />
            </label>
            {pwdError ? <small className="dashboard-field-error">{pwdError}</small> : null}
            <div className="dashboard-user-edit-actions">
              <button type="submit" className="dashboard-user-save-btn" disabled={pwdSaving}>
                {pwdSaving
                  ? isEn
                    ? 'Saving…'
                    : 'Enregistrement…'
                  : t('clientAccount.securitySavePassword')}
              </button>
              <button
                type="button"
                className="dashboard-user-cancel-btn"
                disabled={pwdSaving}
                onClick={() => {
                  setPwdPanelOpen(false)
                  setCurrentPwd('')
                  setNewPwd('')
                  setConfirmPwd('')
                  setPwdError(null)
                }}
              >
                {t('clientAccount.securityCancel')}
              </button>
            </div>
          </form>
        )}
      </section>

      {googleAvailable ? (
        <section className="dashboard-user-card">
          <h3 className="client-compte-section-title">{t('clientAccount.securityOAuthTitle')}</h3>
          <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
            {isEn
              ? 'Link Google to sign in faster. Use the same email as your driver account.'
              : 'Liez Google pour vous connecter plus vite. Utilisez le meme e-mail que votre compte chauffeur.'}
          </p>
          <ul className="client-compte-oauth-list">
            <li className="client-compte-oauth-row">
              <div>
                <strong>{t('clientAccount.securityOAuthGoogle')}</strong>
                <p className="dashboard-field-hint" style={{ margin: 0 }}>
                  {status.oauthGoogle
                    ? t('clientAccount.securityOAuthConnected')
                    : t('clientAccount.securityOAuthNotConnected')}
                </p>
              </div>
              <button
                type="button"
                className="dashboard-user-edit-btn"
                disabled={oauthBusy}
                onClick={() => {
                  if (status.oauthGoogle) void handleDisconnectGoogle()
                  else handleConnectGoogle()
                }}
              >
                {status.oauthGoogle
                  ? t('clientAccount.securityOAuthDisconnect')
                  : t('clientAccount.securityOAuthConnect')}
              </button>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  )
}
