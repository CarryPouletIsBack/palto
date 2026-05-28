import { useEffect, useState, type ReactNode } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { cashOnlyPaymentsEnabled, stripeCheckoutEnabled, stripePublishableKey } from '../constants/featureFlags'
import { PALTO_PLATFORM_FEE_EUR } from '../constants/stripeFees'
import PaltoGoStripePayment from './PaltoGoStripePayment'
import RidePaymentMethodPicker, { type RidePaymentMethod } from './RidePaymentMethodPicker'
import {
  clientStripeApiEnabled,
  fetchClientStripePaymentMethods,
  type ClientStripePaymentMethod,
} from '../services/clientStripeApi'

export type PaltoRideCheckoutPanelProps = {
  summary: ReactNode
  customerName: string
  customerEmail: string
  clientComment: string
  onCustomerNameChange: (value: string) => void
  onCustomerEmailChange: (value: string) => void
  onClientCommentChange: (value: string) => void
  clientLoggedInEmail?: string | null
  onOpenClientAccountAuth?: (mode: 'login' | 'signup') => void
  stripeClientSecret: string | null
  stripeCustomerId?: string | null
  paymentMethod: RidePaymentMethod
  onPaymentMethodChange: (value: RidePaymentMethod) => void
  cardPaymentAvailable?: boolean
  scheduledBooking?: boolean
  checkoutError: string | null
  checkoutSuccessMessage: string | null
  onStripeSuccess: () => void
  onStripeError: (message: string) => void
}

export default function PaltoRideCheckoutPanel({
  summary,
  customerName,
  customerEmail,
  clientComment,
  onCustomerNameChange,
  onCustomerEmailChange,
  onClientCommentChange,
  clientLoggedInEmail,
  onOpenClientAccountAuth,
  stripeClientSecret,
  stripeCustomerId: _stripeCustomerId,
  paymentMethod,
  onPaymentMethodChange,
  cardPaymentAvailable = true,
  scheduledBooking = false,
  checkoutError,
  checkoutSuccessMessage,
  onStripeSuccess,
  onStripeError,
}: PaltoRideCheckoutPanelProps) {
  const { t, language } = useLanguage()
  const isEn = language === 'en'
  const cashOnlyPayments = cashOnlyPaymentsEnabled()
  const stripeOn = stripeCheckoutEnabled()
  const showCardStep = Boolean(!cashOnlyPayments && stripeClientSecret && stripePublishableKey())
  const pk = stripePublishableKey()
  const [savedCards, setSavedCards] = useState<ClientStripePaymentMethod[]>([])
  const [guestModeSelected, setGuestModeSelected] = useState(false)

  useEffect(() => {
    if (clientLoggedInEmail) setGuestModeSelected(false)
  }, [clientLoggedInEmail])

  useEffect(() => {
    if (!showCardStep || !clientStripeApiEnabled() || !clientLoggedInEmail) {
      setSavedCards([])
      return
    }
    let cancelled = false
    void fetchClientStripePaymentMethods(customerName.trim() || undefined)
      .then(({ items }) => {
        if (cancelled) return
        setSavedCards(items)
      })
      .catch(() => {
        if (!cancelled) setSavedCards([])
      })
    return () => {
      cancelled = true
    }
  }, [showCardStep, clientLoggedInEmail, customerName])

  return (
    <div className="palto-checkout">
      <p className="palto-checkout__lead">{t('search.checkoutLead')}</p>

      {clientLoggedInEmail ? (
        <p className="palto-checkout__session">
          {t('search.checkoutLoggedInAs', { email: clientLoggedInEmail })}
        </p>
      ) : null}

      <div className="palto-checkout__steps" aria-label={t('search.checkoutStepsAria')}>
        <span
          className={
            'palto-checkout__step' + (showCardStep ? ' palto-checkout__step--done' : ' palto-checkout__step--active')
          }
        >
          1. {t('search.checkoutStepInfo')}
        </span>
        {!scheduledBooking && !cashOnlyPayments ? (
          <span
            className={
              'palto-checkout__step' +
              (showCardStep ? ' palto-checkout__step--active' : ' palto-checkout__step--pending')
            }
          >
            2. {t('search.checkoutStepCard')}
          </span>
        ) : null}
      </div>

      <div className="palto-checkout__summary">{summary}</div>

      {!showCardStep && !clientLoggedInEmail && !guestModeSelected ? (
        <section className="palto-checkout__guest-choice" aria-label={t('search.checkoutGuestTitle')}>
          <div>
            <h3>{t('search.checkoutGuestTitle')}</h3>
            <p>{t('search.checkoutGuestLead')}</p>
          </div>
          <div className="palto-checkout__guest-actions">
            {onOpenClientAccountAuth ? (
              <button
                type="button"
                className="palto-checkout__guest-btn palto-checkout__guest-btn--primary"
                onClick={() => onOpenClientAccountAuth('login')}
              >
                {t('search.checkoutGuestLogin')}
              </button>
            ) : null}
            <button
              type="button"
              className="palto-checkout__guest-btn"
              onClick={() => setGuestModeSelected(true)}
            >
              {t('search.checkoutGuestContinue')}
            </button>
          </div>
        </section>
      ) : null}

      {!showCardStep && (scheduledBooking || cashOnlyPayments) ? (
        <div className="palto-checkout__field">
          <span>{t('search.checkoutPaymentMethodLabel')}</span>
          <p className="palto-checkout__lead palto-checkout__payment-hint">
            {cashOnlyPayments ? t('search.checkoutPaymentCashHint') : t('search.checkoutScheduledPaymentHint')}
          </p>
        </div>
      ) : !showCardStep ? (
        <RidePaymentMethodPicker
          value={paymentMethod}
          onChange={onPaymentMethodChange}
          cardAvailable={!cashOnlyPayments && cardPaymentAvailable && stripeOn}
        />
      ) : null}

      {!showCardStep && !scheduledBooking && paymentMethod === 'card' ? (
        <p className="palto-checkout__lead">
          {stripeOn
            ? t('search.checkoutStripeLead', { fee: String(PALTO_PLATFORM_FEE_EUR) })
            : t('search.checkoutStripeOff')}
        </p>
      ) : null}

      {!showCardStep ? (
        <>
          <label className="palto-checkout__field">
            <span>{t('search.checkoutNameLabel')}</span>
            <input
              type="text"
              className="palto-ride-input"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder={t('search.checkoutNamePlaceholder')}
              autoComplete="name"
            />
          </label>

          <label className="palto-checkout__field">
            <span>{t('search.checkoutEmailLabel')}</span>
            <input
              type="email"
              className="palto-ride-input"
              value={customerEmail}
              onChange={(e) => onCustomerEmailChange(e.target.value)}
              placeholder={t('search.checkoutEmailPlaceholder')}
              autoComplete="email"
              required
            />
          </label>

          <label className="palto-checkout__field">
            <span>{t('search.checkoutCommentLabel')}</span>
            <textarea
              className="palto-ride-input"
              value={clientComment}
              onChange={(e) => onClientCommentChange(e.target.value)}
              placeholder={t('search.checkoutCommentPlaceholder')}
              maxLength={600}
              rows={3}
            />
          </label>
        </>
      ) : null}

      {showCardStep && pk ? (
        <PaltoGoStripePayment
          publishableKey={pk}
          clientSecret={stripeClientSecret!}
          savedCards={savedCards}
          onSuccess={onStripeSuccess}
          onError={onStripeError}
          submitLabel={t('search.checkoutAuthorizeCta')}
          labels={{
            useSavedCard: isEn ? 'Saved card' : 'Carte enregistree',
            useNewCard: isEn ? 'Another card' : 'Autre carte',
            savedCardHint: isEn
              ? 'Select a card and authorize payment — no need to re-enter card details.'
              : 'Choisissez une carte et autorisez le paiement — pas besoin de ressaisir les coordonnees.',
            newCardHint: isEn
              ? 'Enter card details below.'
              : 'Saisissez les coordonnees de la carte ci-dessous.',
          }}
        />
      ) : null}

      {checkoutError ? <p className="palto-checkout__error">{checkoutError}</p> : null}
      {checkoutSuccessMessage ? <p className="palto-checkout__success">{checkoutSuccessMessage}</p> : null}
    </div>
  )
}
