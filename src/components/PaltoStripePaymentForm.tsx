import { useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js'
import { paltoStripeElementsAppearance } from '../utils/stripeElementsAppearance'
import { PALTO_PAYMENT_ELEMENT_OPTIONS } from '../utils/stripePaymentElementOptions'
import Button from './Button'

type InnerProps = {
  onSuccess: () => void
  onError: (message: string) => void
  submitLabel: string
}

function PaymentFormInner({ onSuccess, onError, submitLabel }: InnerProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)

  const handlePay = async () => {
    if (!stripe || !elements) return
    setBusy(true)
    try {
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
        className="palto-ride-search-btn palto-checkout-stripe__pay"
        disabled={!stripe || !elements || busy}
        onClick={() => void handlePay()}
      >
        {busy ? 'Autorisation en cours…' : submitLabel}
      </Button>
    </div>
  )
}

type Props = {
  publishableKey: string
  clientSecret: string
  stripeCustomerId?: string | null
  onSuccess: () => void
  onError: (message: string) => void
  submitLabel: string
}

export default function PaltoStripePaymentForm({
  publishableKey,
  clientSecret,
  stripeCustomerId,
  onSuccess,
  onError,
  submitLabel,
}: Props) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey])
  const options: StripeElementsOptions = useMemo(
    () => ({
      clientSecret,
      appearance: paltoStripeElementsAppearance(),
      locale: 'fr',
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
    }),
    [clientSecret, stripeCustomerId]
  )

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormInner onSuccess={onSuccess} onError={onError} submitLabel={submitLabel} />
    </Elements>
  )
}
