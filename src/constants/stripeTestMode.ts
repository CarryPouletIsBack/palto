import { stripePublishableKey } from './featureFlags'

/** true si la clé publishable est en mode test Stripe (pk_test_…). */
export function stripeTestMode(): boolean {
  const key = stripePublishableKey()
  return Boolean(key?.startsWith('pk_test_'))
}
