import { apiBaseUrl, stripeCheckoutEnabled } from '../constants/featureFlags'
import { getClientAuthorizationHeader } from './authService'

const API_BASE_URL = apiBaseUrl()

export type ClientStripePaymentMethodBilling = {
  name: string | null
  line1: string | null
  line2: string | null
  city: string | null
  postalCode: string | null
  country: string | null
}

export type ClientStripePaymentMethod = {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  billing: ClientStripePaymentMethodBilling | null
}

export type ClientStripePaymentMethodsResult = {
  items: ClientStripePaymentMethod[]
  stripeCustomerId: string | null
}

function stripeApiEnabled(): boolean {
  return stripeCheckoutEnabled()
}

async function postStripeAction<T>(
  action: string,
  body?: Record<string, unknown>
): Promise<T> {
  const auth = getClientAuthorizationHeader()
  if (!auth) {
    throw new Error('Connexion client requise')
  }
  const res = await fetch(`${API_BASE_URL}/stripe?action=${encodeURIComponent(action)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
    body: JSON.stringify(body ?? {}),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
  return data
}

export function clientStripeApiEnabled(): boolean {
  return stripeApiEnabled()
}

export async function fetchClientStripePaymentMethods(
  fullName?: string | null
): Promise<ClientStripePaymentMethodsResult> {
  if (!stripeApiEnabled()) return { items: [], stripeCustomerId: null }
  const data = await postStripeAction<{
    items?: ClientStripePaymentMethod[]
    stripeCustomerId?: string
  }>('list-payment-methods', {
    fullName: fullName?.trim() || undefined,
  })
  return {
    items: Array.isArray(data.items) ? data.items : [],
    stripeCustomerId: data.stripeCustomerId?.trim() || null,
  }
}

export async function createClientSetupIntent(fullName?: string | null): Promise<string> {
  const data = await postStripeAction<{ clientSecret?: string }>('setup-intent', {
    fullName: fullName?.trim() || undefined,
  })
  if (!data.clientSecret) throw new Error('SetupIntent indisponible')
  return data.clientSecret
}

export async function fetchClientWalletBalanceCents(): Promise<number> {
  if (!stripeApiEnabled()) return 0
  const data = await postStripeAction<{ balanceCents?: number }>('wallet-balance')
  const cents = Number(data.balanceCents ?? 0)
  return Number.isFinite(cents) && cents >= 0 ? Math.round(cents) : 0
}

export async function createClientWalletTopUp(
  amountEur: number,
  fullName?: string | null
): Promise<{ clientSecret: string; paymentIntentId: string; amountCents: number }> {
  const data = await postStripeAction<{
    clientSecret?: string
    paymentIntentId?: string
    amountCents?: number
  }>('wallet-topup-create', {
    amountEur,
    fullName: fullName?.trim() || undefined,
  })
  if (!data.clientSecret || !data.paymentIntentId) {
    throw new Error('Recharge portefeuille indisponible')
  }
  const amountCents = Number(data.amountCents ?? 0)
  return {
    clientSecret: data.clientSecret,
    paymentIntentId: data.paymentIntentId,
    amountCents: Number.isFinite(amountCents) ? Math.round(amountCents) : 0,
  }
}

export async function confirmClientWalletTopUp(paymentIntentId: string): Promise<number> {
  const data = await postStripeAction<{ balanceCents?: number }>('wallet-topup-confirm', {
    paymentIntentId,
  })
  const cents = Number(data.balanceCents ?? 0)
  return Number.isFinite(cents) && cents >= 0 ? Math.round(cents) : 0
}
