import { useCallback, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { paltoStripeElementsAppearance } from '../utils/stripeElementsAppearance'
import { PALTO_PAYMENT_ELEMENT_OPTIONS } from '../utils/stripePaymentElementOptions'
import type { ClientStripePaymentMethod } from '../services/clientStripeApi'
import Button from './Button'
import { ButtonLoadingLabel } from './ButtonLoadingLabel'

function formatCardBrand(brand: string): string {
  const b = brand.toLowerCase()
  if (b === 'visa') return 'Visa'
  if (b === 'mastercard') return 'Mastercard'
  if (b === 'amex') return 'American Express'
  return brand.charAt(0).toUpperCase() + brand.slice(1)
}

type NewCardFormProps = {
  onSuccess: () => void
  onError: (message: string) => void
  submitLabel: string
}

function NewCardPaymentForm({ onSuccess, onError, submitLabel }: NewCardFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)

  const handlePay = async () => {
    if (!stripe || !elements) return
    setBusy(true)
    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        onError(submitError.message ?? 'Formulaire incomplet')
        return
      }
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      })
      if (error) {
        onError(error.message ?? 'Paiement refuse')
        return
      }
      const status = paymentIntent?.status
      if (status === 'requires_capture' || status === 'succeeded') {
        onSuccess()
        return
      }
      onError('Paiement en attente de validation')
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Erreur paiement')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="palto-checkout-stripe">
      <PaymentElement options={PALTO_PAYMENT_ELEMENT_OPTIONS} />
      <Button
        variant="primary"
        type="button"
        className={`palto-ride-search-btn palto-checkout-stripe__pay${busy ? ' is-pending' : ''}`}
        disabled={!stripe || !elements || busy}
        aria-busy={busy}
        onClick={() => void handlePay()}
      >
        <ButtonLoadingLabel pending={busy} pendingLabel="Autorisation en cours…" spinnerVariant="inverse">
          {submitLabel}
        </ButtonLoadingLabel>
      </Button>
    </div>
  )
}

type Props = {
  publishableKey: string
  clientSecret: string
  savedCards: ClientStripePaymentMethod[]
  onSuccess: () => void
  onError: (message: string) => void
  submitLabel: string
  labels: {
    useSavedCard: string
    useNewCard: string
    savedCardHint: string
    newCardHint: string
  }
}

export default function PaltoGoStripePayment({
  publishableKey,
  clientSecret,
  savedCards,
  onSuccess,
  onError,
  submitLabel,
  labels,
}: Props) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey])
  const hasSaved = savedCards.length > 0
  const [mode, setMode] = useState<'saved' | 'new'>(() => (hasSaved ? 'saved' : 'new'))
  const [selectedPmId, setSelectedPmId] = useState(() => savedCards[0]?.id ?? '')
  const [busy, setBusy] = useState(false)

  const confirmWithSavedCard = useCallback(
    async (stripe: Stripe, paymentMethodId: string) => {
      setBusy(true)
      try {
        const { error, paymentIntent } = await stripe.confirmPayment({
          clientSecret,
          confirmParams: {
            payment_method: paymentMethodId,
          },
          redirect: 'if_required',
        })
        if (error) {
          onError(error.message ?? 'Paiement refuse')
          return
        }
        const status = paymentIntent?.status
        if (status === 'requires_capture' || status === 'succeeded') {
          onSuccess()
          return
        }
        onError('Paiement en attente de validation')
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Erreur paiement')
      } finally {
        setBusy(false)
      }
    },
    [clientSecret, onError, onSuccess]
  )

  const handleSavedPay = useCallback(() => {
    if (!selectedPmId) {
      onError('Selectionnez une carte')
      return
    }
    void stripePromise?.then((stripe) => {
      if (!stripe) {
        onError('Stripe indisponible')
        return
      }
      void confirmWithSavedCard(stripe, selectedPmId)
    })
  }, [confirmWithSavedCard, onError, selectedPmId, stripePromise])

  const elementsOptions = useMemo(
    () => ({
      clientSecret,
      appearance: paltoStripeElementsAppearance(),
      locale: 'fr' as const,
    }),
    [clientSecret]
  )

  return (
    <div className="palto-go-stripe-payment">
      {hasSaved ? (
        <div className="palto-go-stripe-payment__mode" role="tablist" aria-label={labels.useSavedCard}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'saved'}
            className={`palto-go-stripe-payment__mode-btn${mode === 'saved' ? ' is-active' : ''}`}
            onClick={() => setMode('saved')}
          >
            {labels.useSavedCard}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'new'}
            className={`palto-go-stripe-payment__mode-btn${mode === 'new' ? ' is-active' : ''}`}
            onClick={() => setMode('new')}
          >
            {labels.useNewCard}
          </button>
        </div>
      ) : null}

      {mode === 'saved' && hasSaved ? (
        <div className="palto-go-stripe-payment__saved">
          <p className="dashboard-field-hint palto-go-stripe-payment__hint">{labels.savedCardHint}</p>
          <ul className="palto-checkout__saved-cards-list">
            {savedCards.map((pm) => (
              <li key={pm.id}>
                <label className="palto-go-stripe-payment__saved-option">
                  <input
                    type="radio"
                    name="palto-go-saved-pm"
                    value={pm.id}
                    checked={selectedPmId === pm.id}
                    onChange={() => setSelectedPmId(pm.id)}
                  />
                  <span>
                    <strong>{formatCardBrand(pm.brand)}</strong> •••• {pm.last4} (
                    {String(pm.expMonth).padStart(2, '0')}/{String(pm.expYear).slice(-2)})
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Button
            variant="primary"
            type="button"
            className={`palto-ride-search-btn palto-checkout-stripe__pay${busy ? ' is-pending' : ''}`}
            disabled={!selectedPmId || busy}
            aria-busy={busy}
            onClick={() => void handleSavedPay()}
          >
            <ButtonLoadingLabel pending={busy} pendingLabel="Autorisation en cours…" spinnerVariant="inverse">
              {submitLabel}
            </ButtonLoadingLabel>
          </Button>
        </div>
      ) : (
        <div className="palto-go-stripe-payment__new">
          <p className="dashboard-field-hint palto-go-stripe-payment__hint">{labels.newCardHint}</p>
          <Elements stripe={stripePromise} options={elementsOptions}>
            <NewCardPaymentForm onSuccess={onSuccess} onError={onError} submitLabel={submitLabel} />
          </Elements>
        </div>
      )}
    </div>
  )
}
