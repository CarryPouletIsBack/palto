import { useCallback, useEffect, useMemo, useState } from 'react'
import { IdCard, Shield, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '../contexts/LanguageContext'
import { stripeCheckoutEnabled, stripePublishableKey } from '../constants/featureFlags'
import {
  loadClientAccountSnapshot,
  saveClientAccountSnapshot,
  type ClientAccountSnapshot,
} from '../constants/clientAccountStorage'
import {
  clientStripeApiEnabled,
  createClientSetupIntent,
  detachClientPaymentMethod,
  fetchClientStripePaymentMethods,
  type ClientStripePaymentMethod,
} from '../services/clientStripeApi'
import {
  getDashboardAuthorizationHeader,
  isClientAuthenticated,
  PALTO_CHAUFFEUR_SESSION_CHANGED_EVENT,
  PALTO_CLIENT_SESSION_CHANGED_EVENT,
} from '../services/authService'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { fileToCompressedProfilePhotoDataUrl } from '../utils/clientProfilePhotoDataUrl'
import { formatStripeBillingLines, formatStripeCardBrand } from '../utils/stripeDisplay'
import PaltoStripeSetupForm from './PaltoStripeSetupForm'
import PaltoStripeTestCardHint from './PaltoStripeTestCardHint'
import './ClientCompteDashboard.css'

export type ChauffeurPaltoAccountSection = 'personal' | 'payment'

type Props = {
  sessionEmail: string
  initialSection?: ChauffeurPaltoAccountSection
}

export default function ChauffeurPaltoAccountPanel({
  sessionEmail,
  initialSection = 'personal',
}: Props) {
  const { language } = useLanguage()
  const isEn = language === 'en'
  const emailKey = sessionEmail.trim().toLowerCase()

  const [section, setSection] = useState<ChauffeurPaltoAccountSection>(initialSection)
  const [authTick, setAuthTick] = useState(0)
  const [profile, setProfile] = useState<ClientAccountSnapshot>(() =>
    loadClientAccountSnapshot(emailKey)
  )
  const [prenomDraft, setPrenomDraft] = useState(profile.prenom)
  const [nomDraft, setNomDraft] = useState(profile.nom)
  const [emailDraft, setEmailDraft] = useState(profile.email || emailKey)
  const [photoDraftUrl, setPhotoDraftUrl] = useState<string | null>(profile.profilePhotoUrl ?? null)

  const [stripePaymentMethods, setStripePaymentMethods] = useState<ClientStripePaymentMethod[]>([])
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeLinkError, setStripeLinkError] = useState<string | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null)
  const [paymentModalLoading, setPaymentModalLoading] = useState(false)
  const [paymentViewPm, setPaymentViewPm] = useState<ClientStripePaymentMethod | null>(null)

  const stripeOn = clientStripeApiEnabled()
  const stripePk = stripePublishableKey()?.trim() ?? ''
  const hasChauffeurAuth = Boolean(getDashboardAuthorizationHeader())
  const hasClientAuth = isClientAuthenticated()
  const canCallStripeApi = hasChauffeurAuth || hasClientAuth

  const clientFullName = useMemo(
    () => `${profile.prenom.trim()} ${profile.nom.trim()}`.trim(),
    [profile.nom, profile.prenom]
  )

  useEffect(() => {
    setSection(initialSection)
  }, [initialSection])

  useEffect(() => {
    const bump = () => setAuthTick((n) => n + 1)
    window.addEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, bump)
    window.addEventListener(PALTO_CHAUFFEUR_SESSION_CHANGED_EVENT, bump)
    return () => {
      window.removeEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, bump)
      window.removeEventListener(PALTO_CHAUFFEUR_SESSION_CHANGED_EVENT, bump)
    }
  }, [])

  useEffect(() => {
    const snap = loadClientAccountSnapshot(emailKey)
    setProfile(snap)
    setPrenomDraft(snap.prenom)
    setNomDraft(snap.nom)
    setEmailDraft(snap.email || emailKey)
    setPhotoDraftUrl(snap.profilePhotoUrl ?? null)
  }, [emailKey, authTick])

  const refreshStripePaymentMethods = useCallback(async () => {
    if (!stripeOn || !canCallStripeApi) return
    setStripeLoading(true)
    setStripeLinkError(null)
    try {
      const listed = await fetchClientStripePaymentMethods(clientFullName || undefined)
      setStripePaymentMethods(listed.items)
    } catch (e) {
      const msg = e instanceof Error ? e.message : isEn ? 'Stripe unavailable' : 'Stripe indisponible'
      setStripeLinkError(msg)
      setStripePaymentMethods([])
    } finally {
      setStripeLoading(false)
    }
  }, [canCallStripeApi, clientFullName, isEn, stripeOn])

  useEffect(() => {
    if (section === 'payment' && stripeOn && canCallStripeApi) {
      void refreshStripePaymentMethods()
    }
  }, [section, stripeOn, canCallStripeApi, refreshStripePaymentMethods, authTick])

  const savePersonal = useCallback(() => {
    const next: ClientAccountSnapshot = {
      ...profile,
      prenom: prenomDraft.trim(),
      nom: nomDraft.trim(),
      email: emailDraft.trim().toLowerCase() || emailKey,
      profilePhotoUrl: photoDraftUrl,
    }
    if (!next.prenom || !next.nom) {
      toast.error(isEn ? 'First and last name are required.' : 'Prenom et nom sont requis.')
      return
    }
    const ok = saveClientAccountSnapshot(next, emailKey)
    if (!ok) {
      toast.error(isEn ? 'Could not save profile.' : 'Enregistrement impossible.')
      return
    }
    setProfile(next)
    window.dispatchEvent(new CustomEvent(PALTO_CLIENT_SESSION_CHANGED_EVENT))
    toast.success(isEn ? 'Palto account updated.' : 'Compte Palto enregistre.')
  }, [emailDraft, emailKey, isEn, photoDraftUrl, prenomDraft, nomDraft, profile])

  const onPhotoPick = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      try {
        const dataUrl = await fileToCompressedProfilePhotoDataUrl(file)
        setPhotoDraftUrl(dataUrl)
      } catch {
        toast.error(isEn ? 'Invalid image.' : 'Image invalide.')
      }
    },
    [isEn]
  )

  const openPaymentModal = useCallback(() => {
    if (!stripeOn || !canCallStripeApi) return
    setPaymentModalOpen(true)
    setSetupClientSecret(null)
    setPaymentModalLoading(true)
    void createClientSetupIntent(clientFullName || undefined)
      .then((secret) => setSetupClientSecret(secret))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : isEn ? 'Stripe unavailable' : 'Stripe indisponible')
      })
      .finally(() => setPaymentModalLoading(false))
  }, [canCallStripeApi, clientFullName, isEn, stripeOn])

  const closePaymentModal = useCallback(() => {
    setPaymentModalOpen(false)
    setSetupClientSecret(null)
    setPaymentModalLoading(false)
  }, [])

  const handleSetupCardSuccess = useCallback(() => {
    void refreshStripePaymentMethods().then(() => {
      closePaymentModal()
      toast.success(
        isEn ? 'Card saved (Stripe test).' : 'Carte enregistree (mode test Stripe).'
      )
    })
  }, [closePaymentModal, isEn, refreshStripePaymentMethods])

  const deletePaymentMethod = useCallback(
    (pm: ClientStripePaymentMethod) => {
      if (!window.confirm(isEn ? 'Remove this card?' : 'Supprimer cette carte ?')) return
      void detachClientPaymentMethod(pm.id, clientFullName || undefined)
        .then(() => refreshStripePaymentMethods())
        .catch((e) =>
          toast.error(e instanceof Error ? e.message : isEn ? 'Removal failed' : 'Suppression impossible')
        )
    },
    [clientFullName, isEn, refreshStripePaymentMethods]
  )

  const clientCompteHref = useMemo(() => {
    const prefix = typeof window !== 'undefined' && window.location.pathname.startsWith('/en') ? '/en' : '/fr'
    return `${prefix}/compte`
  }, [])

  const personalDirty =
    prenomDraft.trim() !== profile.prenom.trim() ||
    nomDraft.trim() !== profile.nom.trim() ||
    emailDraft.trim().toLowerCase() !== (profile.email || emailKey).trim().toLowerCase() ||
    (photoDraftUrl ?? '') !== (profile.profilePhotoUrl ?? '')

  useBodyScrollLock(paymentModalOpen || paymentViewPm != null)

  return (
    <div className="client-compte-account-layout chauffeur-palto-account-layout">
      <aside className="client-compte-account-sidebar" aria-label={isEn ? 'Palto account' : 'Compte Palto'}>
        <div className="client-compte-account-profile-head">
          <label className="client-compte-account-photo-btn">
            {photoDraftUrl ? (
              <img src={photoDraftUrl} alt="" className="client-compte-account-photo-btn__img" />
            ) : (
              <span className="client-compte-account-photo-btn__placeholder" aria-hidden>
                <IdCard size={20} />
              </span>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => void onPhotoPick(e.target.files?.[0])}
            />
          </label>
          <div className="client-compte-account-profile-meta">
            <strong>
              {profile.prenom} {profile.nom}
            </strong>
            <span>{profile.email || emailKey}</span>
          </div>
        </div>
        <nav className="client-compte-account-nav">
          <button
            type="button"
            className={`client-compte-account-nav-item${section === 'personal' ? ' is-active' : ''}`}
            onClick={() => setSection('personal')}
          >
            <span className="nav-icon" aria-hidden>
              <IdCard size={16} />
            </span>
            <span>{isEn ? 'Personal info' : 'Infos personnelles'}</span>
          </button>
          <button
            type="button"
            className={`client-compte-account-nav-item${section === 'payment' ? ' is-active' : ''}`}
            onClick={() => setSection('payment')}
          >
            <span className="nav-icon" aria-hidden>
              <Wallet size={16} />
            </span>
            <span>{isEn ? 'Payment' : 'Paiement'}</span>
          </button>
        </nav>
      </aside>

      <div className="client-compte-account-main">
        <header className="client-compte-account-main-head">
          <h3>
            {section === 'personal'
              ? isEn
                ? 'Personal information'
                : 'Informations personnelles'
              : isEn
                ? 'Payment methods'
                : 'Moyens de paiement'}
          </h3>
          <p className="dashboard-field-hint">
            {section === 'personal'
              ? isEn
                ? 'Name, email and photo for your Palto account (shared with passenger app).'
                : 'Nom, email et photo du compte Palto (partage avec l’app passager).'
              : isEn
                ? 'Stripe test cards for Go rides. Driver payouts (IBAN) are under Versements in the sidebar.'
                : 'Cartes Stripe en mode test pour les courses Go. Les versements chauffeur (IBAN) sont dans Versements.'}
          </p>
        </header>

        {section === 'personal' ? (
          <form
            className="dashboard-user-edit-grid"
            onSubmit={(e) => {
              e.preventDefault()
              savePersonal()
            }}
          >
            <label>
              {isEn ? 'First name' : 'Prenom'}
              <input
                type="text"
                value={prenomDraft}
                onChange={(e) => setPrenomDraft(e.target.value)}
                required
              />
            </label>
            <label>
              {isEn ? 'Last name' : 'Nom'}
              <input type="text" value={nomDraft} onChange={(e) => setNomDraft(e.target.value)} required />
            </label>
            <label>
              Email
              <input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} required />
            </label>
            {personalDirty ? (
              <div className="dashboard-user-edit-actions">
                <button type="submit" className="dashboard-user-save-btn">
                  {isEn ? 'Save' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  className="dashboard-user-cancel-btn"
                  onClick={() => {
                    setPrenomDraft(profile.prenom)
                    setNomDraft(profile.nom)
                    setEmailDraft(profile.email || emailKey)
                    setPhotoDraftUrl(profile.profilePhotoUrl ?? null)
                  }}
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
              </div>
            ) : null}
          </form>
        ) : (
          <section className="client-compte-payment-layout">
            <p className="client-compte-payment-stripe-notice" role="status">
              {stripeOn
                ? isEn
                  ? 'Save a card with Stripe (test: 4242…). Billing address required. Used when you book as a passenger on Go.'
                  : 'Enregistrez une carte Stripe (test : 4242…). Adresse de facturation obligatoire. Utilisable si vous reservez en passager sur Go.'
                : stripeCheckoutEnabled()
                  ? isEn
                    ? 'Sign in to save a card with Stripe.'
                    : 'Connectez-vous pour enregistrer une carte Stripe.'
                  : isEn
                    ? 'Online card payment is not configured.'
                    : 'Le paiement carte en ligne n’est pas encore configure.'}
            </p>

            {!canCallStripeApi ? (
              <p className="dashboard-field-error" role="alert">
                {isEn ? 'Palto session required.' : 'Session Palto requise.'}
              </p>
            ) : null}

            {stripeLinkError ? (
              <p className="dashboard-field-error" role="alert">
                {stripeLinkError}{' '}
                <a href={clientCompteHref}>
                  {isEn ? 'Open passenger account' : 'Ouvrir Mon compte passager'}
                </a>
              </p>
            ) : null}

            {stripeOn ? <PaltoStripeTestCardHint className="client-compte-payment-test-hint" /> : null}

            {stripeLoading ? (
              <p className="dashboard-field-hint">{isEn ? 'Loading cards…' : 'Chargement des cartes…'}</p>
            ) : null}

            <div className="client-compte-payment-row">
              <div className="client-compte-payment-cards-list">
                {stripeOn && stripePaymentMethods.length > 0
                  ? stripePaymentMethods.map((pm) => (
                      <article key={pm.id} className="dashboard-user-card client-compte-payment-card">
                        <div className="client-compte-payment-card-main">
                          <div>
                            <div className="client-compte-payment-card-head">
                              <strong>{formatStripeCardBrand(pm.brand)}</strong>
                              <span>•••• {pm.last4}</span>
                            </div>
                            <p className="dashboard-field-hint" style={{ margin: '6px 0 0' }}>
                              {String(pm.expMonth).padStart(2, '0')}/{String(pm.expYear).slice(-2)}
                            </p>
                          </div>
                        </div>
                        <div className="client-compte-payment-card-toolbar">
                          <button
                            type="button"
                            className="client-compte-payment-card-action"
                            onClick={() => setPaymentViewPm(pm)}
                          >
                            {isEn ? 'View' : 'Voir'}
                          </button>
                          <button
                            type="button"
                            className="client-compte-payment-card-action client-compte-payment-card-action--danger"
                            onClick={() => deletePaymentMethod(pm)}
                          >
                            {isEn ? 'Remove' : 'Supprimer'}
                          </button>
                        </div>
                      </article>
                    ))
                  : stripeOn && !stripeLoading ? (
                      <article className="dashboard-user-card client-compte-payment-card client-compte-payment-address-card--empty">
                        <p className="dashboard-field-hint" style={{ margin: 0 }}>
                          {isEn
                            ? 'No card on file. Add one below.'
                            : 'Aucune carte enregistree. Ajoutez-en une ci-dessous.'}
                        </p>
                      </article>
                    ) : null}
              </div>
              <div className="client-compte-payment-actions">
                <button
                  type="button"
                  className="client-compte-payment-link"
                  onClick={openPaymentModal}
                  disabled={!stripeOn || !canCallStripeApi}
                >
                  {isEn ? 'Add payment method' : 'Ajouter un mode de paiement'}
                </button>
              </div>
            </div>

            {stripeOn && stripePaymentMethods[0]?.billing?.line1 ? (
              <>
                <h4 className="client-compte-payment-delivery-title">
                  {isEn ? 'Billing address' : 'Adresse de facturation'}
                </h4>
                <article className="dashboard-user-card client-compte-payment-address-card">
                  <p style={{ margin: 0 }}>
                    {formatStripeBillingLines(stripePaymentMethods[0].billing).map((line) => (
                      <span key={line}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </p>
                </article>
              </>
            ) : null}

            {!hasClientAuth && hasChauffeurAuth ? (
              <p className="dashboard-field-hint" style={{ marginTop: 12 }}>
                <Shield size={14} aria-hidden style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {isEn
                  ? 'Cards are stored on your passenger profile (same email). You can also sign in from '
                  : 'Les cartes sont enregistrees sur le profil passager (meme email). Vous pouvez aussi vous connecter depuis '}
                <a href={clientCompteHref}>{isEn ? 'My account' : 'Mon compte'}</a>.
              </p>
            ) : null}
          </section>
        )}
      </div>

      {paymentModalOpen ? (
        <div
          className="client-compte-account-edit-modal-backdrop"
          role="presentation"
          onClick={closePaymentModal}
        >
          <div
            className="client-compte-account-edit-modal client-compte-payment-modal"
            role="dialog"
            aria-modal="true"
            aria-label={isEn ? 'Add payment method' : 'Ajouter un mode de paiement'}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="client-compte-account-edit-modal-head">
              <h4>{isEn ? 'Add payment method' : 'Ajouter un mode de paiement'}</h4>
            </div>
            <div className="client-compte-account-edit-modal-body">
              {stripeOn && stripePk ? (
                <>
                  <PaltoStripeTestCardHint className="client-compte-payment-test-hint" />
                  {paymentModalLoading || !setupClientSecret ? (
                    <p className="dashboard-field-hint" style={{ margin: '12px 0' }}>
                      {isEn ? 'Loading secure form…' : 'Chargement du formulaire securise…'}
                    </p>
                  ) : (
                    <PaltoStripeSetupForm
                      publishableKey={stripePk}
                      clientSecret={setupClientSecret}
                      customerEmail={emailKey}
                      onSuccess={handleSetupCardSuccess}
                      onError={(msg) => toast.error(msg)}
                      submitLabel={isEn ? 'Save card' : 'Enregistrer la carte'}
                    />
                  )}
                </>
              ) : null}
            </div>
            <div className="client-compte-account-edit-modal-actions">
              <button
                type="button"
                className="dashboard-user-edit-btn dashboard-user-edit-btn--secondary"
                onClick={closePaymentModal}
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {paymentViewPm ? (
        <div
          className="client-compte-account-edit-modal-backdrop"
          role="presentation"
          onClick={() => setPaymentViewPm(null)}
        >
          <div
            className="client-compte-account-edit-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="client-compte-account-edit-modal-head">
              <h4>{formatStripeCardBrand(paymentViewPm.brand)} •••• {paymentViewPm.last4}</h4>
            </div>
            <div className="client-compte-account-edit-modal-body">
              <p>
                {String(paymentViewPm.expMonth).padStart(2, '0')}/{String(paymentViewPm.expYear).slice(-2)}
              </p>
              {paymentViewPm.billing?.line1 ? (
                <p>
                  {formatStripeBillingLines(paymentViewPm.billing).map((line) => (
                    <span key={line}>
                      {line}
                      <br />
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
            <div className="client-compte-account-edit-modal-actions">
              <button
                type="button"
                className="dashboard-user-edit-btn"
                onClick={() => setPaymentViewPm(null)}
              >
                {isEn ? 'Close' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
