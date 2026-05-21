import Stripe from 'stripe'
import { stripeSecretConfigured } from './stripeConfig.js'

let stripeSingleton: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeSecretConfigured()) {
    throw new Error('STRIPE_SECRET_KEY manquant')
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())
  }
  return stripeSingleton
}
