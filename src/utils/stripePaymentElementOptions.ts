import type { StripePaymentElementOptions } from '@stripe/stripe-js'

/**
 * Options Payment Element (Stripe.js charge via CDN).
 * `billingDetails` doit être 'auto' ou 'never' (pas d'objet name/email/address).
 * 'auto' : Stripe affiche les champs de facturation utiles (dont l'adresse si nécessaire).
 */
export function paltoPaymentElementOptions(): StripePaymentElementOptions {
  return {
    layout: 'tabs',
    fields: {
      billingDetails: 'auto',
    },
  }
}
