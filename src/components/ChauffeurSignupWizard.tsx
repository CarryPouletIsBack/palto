import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import {
  EMPTY_CHAUFFEUR_SIGNUP_DRAFT,
  parseLicenseYear,
  validateSignupPlate,
  type ChauffeurSignupDraft,
} from '../constants/chauffeurSignup'
import { normalizeChauffeurEmail } from '../constants/chauffeurRegistrationStorage'
import { setComplianceDoc } from '../constants/chauffeurComplianceStorage'
import { normalizeReunionCommuneForSelect } from '../data/reunionCommunes'
import {
  clearChauffeurSignupPending,
  completeChauffeurSignup,
  getCurrentUser,
  registerChauffeur,
} from '../services/authService'
import {
  buildInternationalPhone,
  isValidNationalPhone,
  normalizeNationalPhone,
} from '../services/phoneNumber'
import ChauffeurSignupStepIdentity from './ChauffeurSignupStepIdentity'
import ChauffeurSignupStepVehicle from './ChauffeurSignupStepVehicle'

type Props = {
  onSuccess: () => void
  initialEmail?: string
  oauthMode?: boolean
}

const TOTAL_STEPS = 2

export default function ChauffeurSignupWizard({ onSuccess, initialEmail, oauthMode = false }: Props) {
  const { t } = useLanguage()
  const [step, setStep] = useState<1 | 2>(1)
  const [draft, setDraft] = useState<ChauffeurSignupDraft>(() => ({
    ...EMPTY_CHAUFFEUR_SIGNUP_DRAFT,
    email: initialEmail?.trim() ?? '',
  }))
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const email = initialEmail?.trim() || getCurrentUser()?.email?.trim()
    if (!email) return
    setDraft((d) => (d.email.trim() ? d : { ...d, email }))
  }, [initialEmail])

  const stepLabel = useMemo(
    () => t('chauffeurAuth.stepLabel').replace('{current}', String(step)).replace('{total}', String(TOTAL_STEPS)),
    [step, t],
  )

  const validateStep1 = (): boolean => {
    if (!draft.prenom.trim() || !draft.nom.trim()) {
      setError(t('chauffeurAuth.errorNameRequired'))
      return false
    }
    if (!draft.adresse.trim()) {
      setError(t('chauffeurAuth.errorAddressRequired'))
      return false
    }
    const villeNorm = normalizeReunionCommuneForSelect(draft.ville)
    if (!villeNorm) {
      setError(t('chauffeurAuth.errorCityRequired'))
      return false
    }
    const normalizedNational = normalizeNationalPhone(draft.phoneCountry, draft.phoneNational)
    if (!isValidNationalPhone(draft.phoneCountry, normalizedNational)) {
      setError(t('chauffeurAuth.errorPhoneInvalid'))
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      setError(t('chauffeurAuth.errorInvalidEmail'))
      return false
    }
    if (!oauthMode) {
      if (draft.password.length < 6) {
        setError(t('chauffeurAuth.errorPasswordShort'))
        return false
      }
      if (draft.password !== draft.passwordConfirm) {
        setError(t('chauffeurAuth.errorPasswordMismatch'))
        return false
      }
    }
    return true
  }

  const validateStep2 = (): boolean => {
    const plateCheck = validateSignupPlate(draft.plaque)
    if (!plateCheck.ok) {
      setError(t('chauffeurAuth.errorPlateInvalid'))
      return false
    }
    if (plateCheck.normalized !== draft.plaque) {
      setDraft((d) => ({ ...d, plaque: plateCheck.normalized }))
    }
    if (parseLicenseYear(draft.licenseYear) == null) {
      setError(t('chauffeurAuth.errorLicenseYearInvalid'))
      return false
    }
    return true
  }

  const registerAccount = async (): Promise<boolean> => {
    const normalizedNational = normalizeNationalPhone(draft.phoneCountry, draft.phoneNational)
    const phone = buildInternationalPhone(draft.phoneCountry, normalizedNational)
    const plateCheck = validateSignupPlate(draft.plaque)
    const licenseYear = parseLicenseYear(draft.licenseYear)
    if (!plateCheck.ok || licenseYear == null) return false

    const signupPayload = {
      prenom: draft.prenom.trim(),
      nom: draft.nom.trim(),
      phone,
      adresse: draft.adresse.trim(),
      ville: normalizeReunionCommuneForSelect(draft.ville) || draft.ville.trim(),
      vehicleType: draft.vehicleType,
      motorisation: draft.motorisation,
      plaque: plateCheck.normalized,
      licenseYear,
      isVtc: draft.isVtc,
      deliveryEquipped: draft.deliveryEquipped,
    }

    setLoading(true)
    setError(null)
    const reg = oauthMode
      ? await completeChauffeurSignup(signupPayload)
      : await registerChauffeur({
          email: draft.email.trim(),
          password: draft.password,
          ...signupPayload,
        })
    setLoading(false)

    if (!reg.success) {
      if (reg.error === 'EMAIL_EXISTS') {
        setError(t('chauffeurAuth.errorEmailUsed'))
      } else if (reg.error === 'EMAIL_RESERVED') {
        setError(t('chauffeurAuth.errorEmailReserved'))
      } else if (reg.error === 'PROFILE_ALREADY_COMPLETE') {
        clearChauffeurSignupPending()
        onSuccess()
        return true
      } else {
        setError(reg.error ?? t('chauffeurAuth.errorGeneric'))
      }
      return false
    }

    const emailNorm = normalizeChauffeurEmail(draft.email)
    if (draft.isVtc) {
      setComplianceDoc(emailNorm, 'vtc_or_goods_capacity', true)
    }
    return true
  }

  const goNext = async () => {
    setError(null)
    if (step === 1) {
      if (!validateStep1()) return
      setStep(2)
      return
    }
    if (step === 2) {
      if (!validateStep2()) return
      const ok = await registerAccount()
      if (!ok) return
      onSuccess()
    }
  }

  const goBack = () => {
    setError(null)
    if (step === 2) setStep(1)
  }

  const primaryActionLabel =
    step === TOTAL_STEPS
      ? loading
        ? t('chauffeurAuth.submittingSignup')
        : t('chauffeurAuth.finishSignup')
      : loading
        ? t('chauffeurAuth.submittingSignup')
        : t('chauffeurAuth.next')

  return (
    <div className="auth-signup-wizard">
      <p className="auth-signup-wizard__step-label" aria-live="polite">
        {stepLabel}
      </p>
      <div className="auth-signup-wizard__progress" aria-hidden>
        {[1, 2].map((n) => (
          <span
            key={n}
            className={
              'auth-signup-wizard__dot' + (n <= step ? ' auth-signup-wizard__dot--active' : '')
            }
          />
        ))}
      </div>

      {step === 1 ? (
        <ChauffeurSignupStepIdentity
          draft={draft}
          setDraft={setDraft}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          oauthMode={oauthMode}
        />
      ) : null}
      {step === 2 ? <ChauffeurSignupStepVehicle draft={draft} setDraft={setDraft} /> : null}

      {error ? <p className="auth-page-error">{error}</p> : null}

      <div className="auth-signup-wizard__actions">
        {step > 1 ? (
          <button type="button" className="auth-page-btn auth-page-btn--ghost" onClick={goBack} disabled={loading}>
            {t('chauffeurAuth.back')}
          </button>
        ) : null}
        <button type="button" className="auth-page-btn" onClick={() => void goNext()} disabled={loading}>
          {primaryActionLabel}
        </button>
      </div>
    </div>
  )
}
