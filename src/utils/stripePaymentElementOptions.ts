import type { StripePaymentElementOptions } from '@stripe/stripe-js'

/**
 * Stripe.js (CDN) n’accepte que billingDetails: 'auto' | 'never' (pas d’objet { name, email, address }).
 * Ne pas réintroduire l’ancienne syntaxe — elle provoque IntegrationError au montage du Payment Element.
 */

/** Paiement course / recharge portefeuille : Stripe gère la facturation par défaut. */
export const PALTO_PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
  layout: 'tabs',
}

/** Enregistrement carte compte : adresse via AddressElement, carte sans champs facturation dupliqués. */
export const PALTO_PAYMENT_ELEMENT_CARD_ONLY_OPTIONS: StripePaymentElementOptions = {
  layout: 'tabs',
  fields: {
    billingDetails: 'never',
  },
}

/** @deprecated Utiliser PALTO_PAYMENT_ELEMENT_OPTIONS */
export function paltoPaymentElementOptions(): StripePaymentElementOptions {
  return PALTO_PAYMENT_ELEMENT_OPTIONS
}

/** @deprecated Utiliser PALTO_PAYMENT_ELEMENT_CARD_ONLY_OPTIONS */
export function paltoPaymentElementCardOnlyOptions(): StripePaymentElementOptions {
  return PALTO_PAYMENT_ELEMENT_CARD_ONLY_OPTIONS
}
