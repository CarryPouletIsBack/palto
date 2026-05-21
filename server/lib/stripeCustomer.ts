import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from './stripeClient.js'

export async function getOrCreateStripeCustomer(
  supabase: SupabaseClient,
  accountId: string,
  email: string,
  fullName?: string | null
): Promise<string> {
  const { data: row, error } = await supabase
    .from('client_profile_data')
    .select('stripe_customer_id')
    .eq('account_id', accountId)
    .maybeSingle()

  if (error) {
    throw new Error('Lecture profil client impossible')
  }

  const existing = row?.stripe_customer_id?.trim()
  if (existing) return existing

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email: email.trim().toLowerCase(),
    name: fullName?.trim() || undefined,
    metadata: { palto_account_id: accountId },
  })

  const { data: existingRow } = await supabase
    .from('client_profile_data')
    .select('account_id')
    .eq('account_id', accountId)
    .maybeSingle()

  const patch = {
    stripe_customer_id: customer.id,
    updated_at: new Date().toISOString(),
  }

  const { error: upsertErr } = existingRow
    ? await supabase.from('client_profile_data').update(patch).eq('account_id', accountId)
    : await supabase.from('client_profile_data').insert({
        account_id: accountId,
        account_snapshot: {},
        saved_places: {},
        ...patch,
      })

  if (upsertErr) {
    console.error('[stripeCustomer] upsert', upsertErr)
    throw new Error('Enregistrement client Stripe impossible')
  }

  return customer.id
}
