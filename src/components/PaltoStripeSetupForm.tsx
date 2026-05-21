import { useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js'
import { paltoStripeElementsAppearance } from '../utils/stripeElementsAppearance'
import Button from './Button'

type InnerProps = {
  onSuccess: () => void
  onError: (message: string) => void
  submitLabel: string
}

function SetupFormInner({ onSuccess, onError, submitLabel }: InnerProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)

  const handleSave = async () => {
    if (!stripe || !elements) return
    setBusy(true)
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      })
      if (error) {
        onError(error.message ?? 'Enregistrement refuse')
        return
      }
      if (setupIntent?.status === 'succeeded') {
        onSuccess()
        return
      }
      onError('Enregistrement en attente de validation')
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Erreur enregistrement carte')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="palto-checkout-stripe">
      <PaymentElement options={{ layout: 'tabs' }} />
      <Button
        variant="primary"
        type="button"
        className="palto-ride-search-btn palto-checkout-stripe__pay"
        disabled={!stripe || !elements || busy}
        onClick={() => void handleSave()}
      >
        {busy ? 'Enregistrement…' : submitLabel}
      </Button>
    </div>
  )
}

type Props = {
  publishableKey: string
  clientSecret: string
  onSuccess: () => void
  onError: (message: string) => void
  submitLabel: string
}

export default function PaltoStripeSetupForm({
  publishableKey,
  clientSecret,
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
    }),
    [clientSecret]
  )

  return (
    <Elements stripe={stripePromise} options={options}>
      <SetupFormInner onSuccess={onSuccess} onError={onError} submitLabel={submitLabel} />
    </Elements>
  )
}
