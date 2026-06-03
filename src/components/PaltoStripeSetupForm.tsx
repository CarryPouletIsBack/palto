import { useMemo, useState } from 'react'
import {
  AddressElement,
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { loadStripe, type StripeAddressElementOptions, type StripeElementsOptions } from '@stripe/stripe-js'
import { paltoStripeElementsAppearance } from '../utils/stripeElementsAppearance'
import { PALTO_PAYMENT_ELEMENT_CARD_ONLY_OPTIONS } from '../utils/stripePaymentElementOptions'
import Button from './Button'
import { ButtonLoadingLabel } from './ButtonLoadingLabel'

type InnerProps = {
  customerEmail: string
  onSuccess: () => void
  onError: (message: string) => void
  submitLabel: string
}

const addressElementOptions: StripeAddressElementOptions = {
  mode: 'billing',
  fields: {
    phone: 'never',
  },
  display: {
    name: 'split',
  },
}

function SetupFormInner({ customerEmail, onSuccess, onError, submitLabel }: InnerProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)

  const handleSave = async () => {
    if (!stripe || !elements) return
    const email = customerEmail.trim().toLowerCase()
    if (!email) {
      onError('E-mail client requis pour enregistrer la carte')
      return
    }

    setBusy(true)
    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        onError(submitError.message ?? 'Formulaire incomplet')
        return
      }

      const addressElement = elements.getElement('address')
      if (!addressElement) {
        onError('Adresse de facturation indisponible')
        return
      }

      const { complete, value } = await addressElement.getValue()
      if (!complete) {
        onError('Adresse de facturation incomplete')
        return
      }

      const name =
        value.name?.trim() ||
        [value.firstName, value.lastName].filter(Boolean).join(' ').trim() ||
        undefined

      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              email,
              name,
              address: {
                line1: value.address.line1,
                line2: value.address.line2 || undefined,
                city: value.address.city,
                state: value.address.state || undefined,
                postal_code: value.address.postal_code,
                country: value.address.country,
              },
            },
          },
        },
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
    <div className="palto-checkout-stripe palto-checkout-stripe--setup">
      <p className="palto-checkout-stripe__section-label">Adresse de facturation</p>
      <AddressElement options={addressElementOptions} />
      <p className="palto-checkout-stripe__section-label" style={{ marginTop: 12 }}>
        Carte bancaire
      </p>
      <PaymentElement options={PALTO_PAYMENT_ELEMENT_CARD_ONLY_OPTIONS} />
      <Button
        variant="primary"
        type="button"
        className={`palto-ride-search-btn palto-checkout-stripe__pay${busy ? ' is-pending' : ''}`}
        disabled={!stripe || !elements || busy}
        aria-busy={busy}
        onClick={() => void handleSave()}
      >
        <ButtonLoadingLabel pending={busy} pendingLabel="Enregistrement…" spinnerVariant="inverse">
          {submitLabel}
        </ButtonLoadingLabel>
      </Button>
    </div>
  )
}

type Props = {
  publishableKey: string
  clientSecret: string
  customerEmail: string
  onSuccess: () => void
  onError: (message: string) => void
  submitLabel: string
}

export default function PaltoStripeSetupForm({
  publishableKey,
  clientSecret,
  customerEmail,
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
      <SetupFormInner
        customerEmail={customerEmail}
        onSuccess={onSuccess}
        onError={onError}
        submitLabel={submitLabel}
      />
    </Elements>
  )
}
