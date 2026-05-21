import type { StripePaymentElementOptions } from '@stripe/stripe-js'

/** Carte + adresse de facturation obligatoires (compte passager). */
export function paltoPaymentElementOptions(): StripePaymentElementOptions {
  return {
    layout: 'tabs',
    fields: {
      billingDetails: {
        name: 'auto',
        email: 'auto',
        address: 'required',
      },
    },
  }
}
