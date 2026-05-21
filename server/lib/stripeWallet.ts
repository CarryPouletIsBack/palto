import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { eurosToCents } from './stripeConfig.js'
import { getStripe } from './stripeClient.js'
import { getOrCreateStripeCustomer } from './stripeCustomer.js'

export type StripePaymentMethodBilling = {
  name: string | null
  line1: string | null
  line2: string | null
  city: string | null
  postalCode: string | null
  country: string | null
}

export type StripePaymentMethodSummary = {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  billing: StripePaymentMethodBilling | null
}

export async function getClientWalletBalanceCents(
  supabase: SupabaseClient,
  accountId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('client_profile_data')
    .select('wallet_balance_cents')
    .eq('account_id', accountId)
    .maybeSingle()
  if (error) throw new Error('Lecture portefeuille impossible')
  const cents = Number(data?.wallet_balance_cents ?? 0)
  return Number.isFinite(cents) && cents >= 0 ? Math.round(cents) : 0
}

export async function listCustomerPaymentMethods(
  supabase: SupabaseClient,
  accountId: string,
  email: string,
  fullName?: string | null
): Promise<{ stripeCustomerId: string; items: StripePaymentMethodSummary[] }> {
  const customerId = await getOrCreateStripeCustomer(supabase, accountId, email, fullName)
  const stripe = getStripe()
  const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card' })
  const items = pms.data.map((pm) => {
    const card = pm.card
    const addr = pm.billing_details?.address
    return {
      id: pm.id,
      brand: card?.brand ?? 'card',
      last4: card?.last4 ?? '????',
      expMonth: card?.exp_month ?? 0,
      expYear: card?.exp_year ?? 0,
      billing: addr
        ? {
            name: pm.billing_details?.name ?? null,
            line1: addr.line1 ?? null,
            line2: addr.line2 ?? null,
            city: addr.city ?? null,
            postalCode: addr.postal_code ?? null,
            country: addr.country ?? null,
          }
        : null,
    }
  })
  return { stripeCustomerId: customerId, items }
}

export async function createSetupIntentForCustomer(
  supabase: SupabaseClient,
  accountId: string,
  email: string,
  fullName?: string | null
): Promise<{ clientSecret: string }> {
  const customerId = await getOrCreateStripeCustomer(supabase, accountId, email, fullName)
  const stripe = getStripe()
  const si = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
    metadata: { palto_account_id: accountId },
  })
  if (!si.client_secret) throw new Error('SetupIntent sans client_secret')
  return { clientSecret: si.client_secret }
}

export async function createWalletTopUpPaymentIntent(params: {
  supabase: SupabaseClient
  accountId: string
  email: string
  fullName?: string | null
  amountEur: number
}): Promise<{ clientSecret: string; paymentIntentId: string; amountCents: number }> {
  const amountCents = eurosToCents(params.amountEur)
  if (amountCents < 50) throw new Error('Montant minimum : 0,50 EUR')
  if (amountCents > 200_00) throw new Error('Montant maximum : 200 EUR')

  const customerId = await getOrCreateStripeCustomer(
    params.supabase,
    params.accountId,
    params.email,
    params.fullName
  )
  const stripe = getStripe()
  const pi = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'eur',
    customer: customerId,
    payment_method_types: ['card'],
    metadata: {
      type: 'wallet_topup',
      palto_account_id: params.accountId,
      amount_cents: String(amountCents),
    },
  })
  if (!pi.client_secret) throw new Error('PaymentIntent sans client_secret')
  return { clientSecret: pi.client_secret, paymentIntentId: pi.id, amountCents }
}

export async function creditWalletFromPaymentIntent(
  supabase: SupabaseClient,
  accountId: string,
  paymentIntentId: string
): Promise<{ balanceCents: number; credited: boolean }> {
  const stripe = getStripe()
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  if (pi.metadata?.type !== 'wallet_topup') {
    throw new Error('Paiement non lie au portefeuille')
  }
  if (pi.metadata?.palto_account_id !== accountId) {
    throw new Error('Compte non autorise pour ce paiement')
  }
  if (pi.status !== 'succeeded') {
    throw new Error('Paiement non confirme')
  }

  const amountCents = pi.amount_received ?? pi.amount
  if (!amountCents || amountCents < 1) throw new Error('Montant invalide')

  const { data: existing } = await supabase
    .from('client_wallet_topups')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (existing?.id) {
    const balance = await getClientWalletBalanceCents(supabase, accountId)
    return { balanceCents: balance, credited: false }
  }

  const balance = await getClientWalletBalanceCents(supabase, accountId)
  const nextBalance = balance + amountCents

  const { error: topupErr } = await supabase.from('client_wallet_topups').insert({
    account_id: accountId,
    amount_cents: amountCents,
    stripe_payment_intent_id: paymentIntentId,
  })

  if (topupErr) {
    if (topupErr.code === '23505') {
      const b = await getClientWalletBalanceCents(supabase, accountId)
      return { balanceCents: b, credited: false }
    }
    throw new Error('Enregistrement recharge impossible')
  }

  const { error: updErr } = await supabase
    .from('client_profile_data')
    .update({
      wallet_balance_cents: nextBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('account_id', accountId)

  if (updErr) throw new Error('Mise a jour solde impossible')

  return { balanceCents: nextBalance, credited: true }
}

export async function assertPaymentMethodOwnedByCustomer(
  accountId: string,
  email: string,
  fullName: string | null | undefined,
  paymentMethodId: string,
  supabase: SupabaseClient
): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(supabase, accountId, email, fullName)
  const stripe = getStripe()
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
  const pmCustomer = typeof pm.customer === 'string' ? pm.customer : pm.customer?.id
  if (pmCustomer !== customerId) {
    throw new Error('Carte non autorisee pour ce compte')
  }
  return customerId
}

export async function detachCustomerPaymentMethod(params: {
  supabase: SupabaseClient
  accountId: string
  email: string
  fullName?: string | null
  paymentMethodId: string
}): Promise<void> {
  await assertPaymentMethodOwnedByCustomer(
    params.accountId,
    params.email,
    params.fullName,
    params.paymentMethodId,
    params.supabase
  )
  const stripe = getStripe()
  await stripe.paymentMethods.detach(params.paymentMethodId)
}

export async function updateCustomerPaymentMethodBilling(params: {
  supabase: SupabaseClient
  accountId: string
  email: string
  fullName?: string | null
  paymentMethodId: string
  billing: {
    name?: string | null
    line1: string
    line2?: string | null
    city: string
    postalCode: string
    country: string
  }
}): Promise<void> {
  await assertPaymentMethodOwnedByCustomer(
    params.accountId,
    params.email,
    params.fullName,
    params.paymentMethodId,
    params.supabase
  )
  const stripe = getStripe()
  await stripe.paymentMethods.update(params.paymentMethodId, {
    billing_details: {
      name: params.billing.name?.trim() || undefined,
      address: {
        line1: params.billing.line1.trim(),
        line2: params.billing.line2?.trim() || undefined,
        city: params.billing.city.trim(),
        postal_code: params.billing.postalCode.trim(),
        country: params.billing.country.trim().toUpperCase().slice(0, 2),
      },
    },
  })
}

export async function handleWalletTopUpWebhook(
  pi: Stripe.PaymentIntent,
  supabase: SupabaseClient
): Promise<void> {
  if (pi.metadata?.type !== 'wallet_topup') return
  const accountId = pi.metadata?.palto_account_id?.trim()
  if (!accountId || pi.status !== 'succeeded') return
  try {
    await creditWalletFromPaymentIntent(supabase, accountId, pi.id)
  } catch (e) {
    console.error('[stripeWallet] webhook topup', e)
  }
}
