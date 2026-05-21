import { useEffect, useState, type ReactNode } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { stripeCheckoutEnabled, stripePublishableKey } from '../constants/featureFlags'
import { stripeTestMode } from '../constants/stripeTestMode'
import { PALTO_PLATFORM_FEE_EUR } from '../constants/stripeFees'
import PaltoStripePaymentForm from './PaltoStripePaymentForm'
import PaltoStripeTestCardHint from './PaltoStripeTestCardHint'
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
  stripeClientSecret: string | null
  stripeCustomerId?: string | null
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
  stripeClientSecret,
  stripeCustomerId,
  checkoutError,
  checkoutSuccessMessage,
  onStripeSuccess,
  onStripeError,
}: PaltoRideCheckoutPanelProps) {
  const { t } = useLanguage()
  const stripeOn = stripeCheckoutEnabled()
  const showCardStep = Boolean(stripeClientSecret && stripePublishableKey())
  const pk = stripePublishableKey()
  const [savedCards, setSavedCards] = useState<ClientStripePaymentMethod[]>([])
  const [resolvedCustomerId, setResolvedCustomerId] = useState<string | null>(stripeCustomerId?.trim() || null)

  useEffect(() => {
    setResolvedCustomerId(stripeCustomerId?.trim() || null)
  }, [stripeCustomerId])

  useEffect(() => {
    if (!showCardStep || !clientStripeApiEnabled() || !clientLoggedInEmail) {
      setSavedCards([])
      return
    }
    let cancelled = false
    void fetchClientStripePaymentMethods(customerName.trim() || undefined)
      .then(({ items, stripeCustomerId: customerId }) => {
        if (cancelled) return
        setSavedCards(items)
        if (customerId) setResolvedCustomerId(customerId)
      })
      .catch(() => {
        if (!cancelled) setSavedCards([])
      })
    return () => {
      cancelled = true
    }
  }, [showCardStep, clientLoggedInEmail, customerName])

  function formatCardBrand(brand: string): string {
    const b = brand.toLowerCase()
    if (b === 'visa') return 'Visa'
    if (b === 'mastercard') return 'Mastercard'
    if (b === 'amex') return 'American Express'
    return brand.charAt(0).toUpperCase() + brand.slice(1)
  }

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
        <span
          className={
            'palto-checkout__step' +
            (showCardStep ? ' palto-checkout__step--active' : ' palto-checkout__step--pending')
          }
        >
          2. {t('search.checkoutStepCard')}
        </span>
      </div>

      <div className="palto-checkout__summary">{summary}</div>

      <p className="palto-checkout__lead">
        {stripeOn
          ? t('search.checkoutStripeLead', { fee: String(PALTO_PLATFORM_FEE_EUR) })
          : t('search.checkoutStripeOff')}
      </p>

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
        <>
          {savedCards.length > 0 ? (
            <div className="palto-checkout__saved-cards" role="status">
              <p className="palto-checkout__saved-cards-title">{t('search.checkoutSavedCardsLead')}</p>
              <ul className="palto-checkout__saved-cards-list">
                {savedCards.map((pm) => (
                  <li key={pm.id}>
                    <strong>{formatCardBrand(pm.brand)}</strong>
                    <span> •••• {pm.last4}</span>
                    <span className="palto-checkout__saved-cards-exp">
                      {' '}
                      ({String(pm.expMonth).padStart(2, '0')}/{String(pm.expYear).slice(-2)})
                    </span>
                  </li>
                ))}
              </ul>
              <p className="palto-checkout__lead palto-checkout__lead--card">{t('search.checkoutSavedCardsPick')}</p>
            </div>
          ) : (
            <p className="palto-checkout__lead palto-checkout__lead--card">{t('search.checkoutCardLead')}</p>
          )}
          {stripeTestMode() && savedCards.length === 0 ? <PaltoStripeTestCardHint /> : null}
          <PaltoStripePaymentForm
            publishableKey={pk}
            clientSecret={stripeClientSecret!}
            stripeCustomerId={resolvedCustomerId}
            submitLabel={t('search.checkoutAuthorizeCta')}
            onSuccess={onStripeSuccess}
            onError={onStripeError}
          />
        </>
      ) : null}

      {checkoutError ? <p className="palto-checkout__error">{checkoutError}</p> : null}
      {checkoutSuccessMessage ? <p className="palto-checkout__success">{checkoutSuccessMessage}</p> : null}
    </div>
  )
}
