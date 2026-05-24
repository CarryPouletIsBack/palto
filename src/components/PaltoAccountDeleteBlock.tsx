import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useLanguage } from '../contexts/LanguageContext'
import {
  deletePaltoAccount,
  getPaltoHomePath,
  type AccountRole,
} from '../services/authService'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'

type Props = {
  role: AccountRole
  className?: string
}

export default function PaltoAccountDeleteBlock({ role, className }: Props) {
  const { t } = useLanguage()
  const [modalOpen, setModalOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useBodyScrollLock(modalOpen)

  const closeModal = useCallback(() => {
    if (submitting) return
    setModalOpen(false)
    setPassword('')
  }, [submitting])

  const handleConfirmDelete = useCallback(async () => {
    if (!password.trim()) {
      toast.error(t('clientAccount.deleteAccountPasswordRequired'))
      return
    }
    setSubmitting(true)
    try {
      const result = await deletePaltoAccount(role, password)
      if (!result.success) {
        const msg =
          result.error === 'WRONG_PASSWORD' || result.error === 'Mot de passe incorrect'
            ? t('clientAccount.deleteAccountWrongPassword')
            : result.error === 'API_SESSION_REQUIRED'
              ? t('clientAccount.deleteAccountApiRequired')
              : t('clientAccount.deleteAccountFailed')
        toast.error(msg)
        return
      }
      toast.success(t('clientAccount.deleteAccountSuccess'))
      setModalOpen(false)
      setPassword('')
      if (typeof window !== 'undefined') {
        window.location.assign(getPaltoHomePath())
      }
    } finally {
      setSubmitting(false)
    }
  }, [password, role, t])

  const rootClass = ['client-compte-account-delete', className].filter(Boolean).join(' ')

  return (
    <>
      <section className={rootClass} aria-labelledby="palto-account-delete-title">
        <h4 id="palto-account-delete-title" className="client-compte-section-title">
          {t('clientAccount.deleteAccountTitle')}
        </h4>
        <p className="dashboard-field-hint">{t('clientAccount.deleteAccountLead')}</p>
        <button
          type="button"
          className="dashboard-user-logout-btn client-compte-account-delete-btn"
          onClick={() => setModalOpen(true)}
        >
          {t('clientAccount.deleteAccountBtn')}
        </button>
      </section>

      {modalOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="client-compte-account-edit-modal-backdrop"
              role="presentation"
              onClick={closeModal}
            >
              <div
                className="client-compte-account-edit-modal client-compte-account-delete-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="palto-account-delete-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="client-compte-account-edit-modal-head">
                  <h4 id="palto-account-delete-modal-title">
                    {t('clientAccount.deleteAccountModalTitle')}
                  </h4>
                </div>
                <div className="client-compte-account-edit-modal-body">
                  <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
                    {t('clientAccount.deleteAccountModalBody')}
                  </p>
                  <label className="client-compte-account-edit-modal-row">
                    <span>{t('clientAccount.deleteAccountPasswordLabel')}</span>
                    <input
                      type="password"
                      className="client-compte-account-edit-modal-input"
                      value={password}
                      autoComplete="current-password"
                      disabled={submitting}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                </div>
                <div className="client-compte-account-edit-modal-actions">
                  <button
                    type="button"
                    className="dashboard-user-edit-btn dashboard-user-edit-btn--secondary"
                    disabled={submitting}
                    onClick={closeModal}
                  >
                    {t('clientAccount.cancel')}
                  </button>
                  <button
                    type="button"
                    className="dashboard-user-logout-btn"
                    disabled={submitting}
                    onClick={() => void handleConfirmDelete()}
                  >
                    {submitting
                      ? t('clientAccount.deleteAccountSubmitting')
                      : t('clientAccount.deleteAccountConfirm')}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
