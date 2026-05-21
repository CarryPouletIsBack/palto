import type { ReactNode } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { stripeCheckoutEnabled, stripePublishableKey } from '../constants/featureFlags'
import { stripeTestMode } from '../constants/stripeTestMode'
import { PALTO_PLATFORM_FEE_EUR } from '../constants/stripeFees'
import PaltoStripePaymentForm from './PaltoStripePaymentForm'
import PaltoStripeTestCardHint from './PaltoStripeTestCardHint'

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
  checkoutError,
  checkoutSuccessMessage,
  onStripeSuccess,
  onStripeError,
}: PaltoRideCheckoutPanelProps) {
  const { t } = useLanguage()
  const stripeOn = stripeCheckoutEnabled()
  const showCardStep = Boolean(stripeClientSecret && stripePublishableKey())
  const pk = stripePublishableKey()

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
          {stripeTestMode() ? <PaltoStripeTestCardHint /> : null}
          <p className="palto-checkout__lead palto-checkout__lead--card">{t('search.checkoutCardLead')}</p>
          <PaltoStripePaymentForm
            publishableKey={pk}
            clientSecret={stripeClientSecret!}
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
