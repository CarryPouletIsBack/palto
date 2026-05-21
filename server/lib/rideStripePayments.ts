import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ACCEPT_CANCEL_GRACE_MS,
  CLIENT_CANCEL_EN_ROUTE_MS,
  CLIENT_CANCELLATION_FEE_EUR,
  CANCELLATION_DRIVER_SHARE_EUR,
  CANCELLATION_PALTO_SHARE_EUR,
  PALTO_PLATFORM_FEE_EUR,
  eurosToCents,
  stripeSecretConfigured,
  totalChargeEur,
} from './stripeConfig.js'
import { getStripe } from './stripeClient.js'

export type CoursePaymentRow = {
  id: string
  external_code: string | null
  status: string
  amount_eur: number
  palto_fee_eur: number | null
  total_charge_eur: number | null
  stripe_payment_intent_id: string | null
  stripe_payment_status: string | null
  accepted_at: string | null
  started_at: string | null
  assigned_driver_external_key: string | null
}

export type CancelPaymentOutcome = 'release_full' | 'capture_cancellation_fee' | 'none'

export function resolveClientCancelPaymentOutcome(course: CoursePaymentRow, nowMs = Date.now()): CancelPaymentOutcome {
  if (!course.stripe_payment_intent_id?.trim()) return 'none'
  if (course.status === 'pending') return 'release_full'
  if (course.status !== 'accepted' && course.status !== 'in_progress') return 'none'

  if (course.status === 'in_progress' || course.started_at) {
    return 'capture_cancellation_fee'
  }

  const acceptedAt = course.accepted_at ? new Date(course.accepted_at).getTime() : 0
  if (!acceptedAt) return 'release_full'
  const elapsed = nowMs - acceptedAt
  if (elapsed <= ACCEPT_CANCEL_GRACE_MS) return 'release_full'
  if (elapsed >= CLIENT_CANCEL_EN_ROUTE_MS) return 'capture_cancellation_fee'
  return 'capture_cancellation_fee'
}

export function resolveChauffeurCancelPaymentOutcome(course: CoursePaymentRow): CancelPaymentOutcome {
  if (!course.stripe_payment_intent_id?.trim()) return 'none'
  if (course.status === 'in_progress') return 'none'
  return 'release_full'
}

export async function createManualCapturePaymentIntent(params: {
  courseId: string
  externalCode: string
  driverAmountEur: number
  paltoFeeEur?: number
  clientEmail: string
}): Promise<{ paymentIntentId: string; clientSecret: string; totalEur: number }> {
  const stripe = getStripe()
  const paltoFee = params.paltoFeeEur ?? PALTO_PLATFORM_FEE_EUR
  const totalEur = totalChargeEur(params.driverAmountEur, paltoFee)
  const amountCents = eurosToCents(totalEur)

  if (amountCents < 50) {
    throw new Error('Montant minimum Stripe (0,50 EUR) non atteint')
  }

  const pi = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'eur',
    capture_method: 'manual',
    payment_method_types: ['card'],
    receipt_email: params.clientEmail.trim().toLowerCase(),
    metadata: {
      course_id: params.courseId,
      external_code: params.externalCode,
      driver_amount_eur: String(params.driverAmountEur),
      palto_fee_eur: String(paltoFee),
    },
  })

  if (!pi.client_secret) {
    throw new Error('Stripe n a pas renvoye de client_secret')
  }

  return {
    paymentIntentId: pi.id,
    clientSecret: pi.client_secret,
    totalEur,
  }
}

export async function syncPaymentIntentStatus(paymentIntentId: string): Promise<string> {
  const stripe = getStripe()
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  return pi.status
}

export async function releasePaymentIntent(paymentIntentId: string): Promise<void> {
  const stripe = getStripe()
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  if (pi.status === 'canceled') return
  if (pi.status === 'succeeded') return
  if (pi.status === 'requires_capture') {
    await stripe.paymentIntents.cancel(paymentIntentId)
    return
  }
  if (pi.status === 'requires_confirmation' || pi.status === 'requires_action') {
    await stripe.paymentIntents.cancel(paymentIntentId)
    return
  }
  await stripe.paymentIntents.cancel(paymentIntentId).catch(() => undefined)
}

export async function captureFullPaymentIntent(paymentIntentId: string, totalEur: number): Promise<void> {
  const stripe = getStripe()
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  if (pi.status === 'succeeded') return
  if (pi.status === 'canceled') {
    throw new Error('Paiement deja annule')
  }
  const amountCents = eurosToCents(totalEur)
  if (pi.status === 'requires_capture') {
    await stripe.paymentIntents.capture(paymentIntentId, { amount_to_capture: amountCents })
    return
  }
  throw new Error(`Capture impossible (statut ${pi.status})`)
}

export async function captureCancellationFee(paymentIntentId: string): Promise<{
  capturedCents: number
  driverShareEur: number
  paltoShareEur: number
}> {
  const stripe = getStripe()
  const feeCents = eurosToCents(CLIENT_CANCELLATION_FEE_EUR)
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  if (pi.status === 'succeeded') {
    return {
      capturedCents: feeCents,
      driverShareEur: CANCELLATION_DRIVER_SHARE_EUR,
      paltoShareEur: CANCELLATION_PALTO_SHARE_EUR,
    }
  }
  if (pi.status === 'canceled') {
    throw new Error('Autorisation deja annulee')
  }
  if (pi.status !== 'requires_capture') {
    throw new Error(`Capture partielle impossible (statut ${pi.status})`)
  }
  await stripe.paymentIntents.capture(paymentIntentId, { amount_to_capture: feeCents })
  return {
    capturedCents: feeCents,
    driverShareEur: CANCELLATION_DRIVER_SHARE_EUR,
    paltoShareEur: CANCELLATION_PALTO_SHARE_EUR,
  }
}

export async function applyCancelPaymentOutcome(
  supabase: SupabaseClient,
  course: CoursePaymentRow,
  outcome: CancelPaymentOutcome,
  context: { cancelledBy: 'client' | 'chauffeur'; reason: string }
): Promise<void> {
  if (outcome === 'none' || !course.stripe_payment_intent_id) return

  const piId = course.stripe_payment_intent_id
  const nowIso = new Date().toISOString()

  if (outcome === 'release_full') {
    await releasePaymentIntent(piId)
    await supabase
      .from('courses')
      .update({
        stripe_payment_status: 'canceled',
        updated_at: nowIso,
      })
      .eq('id', course.id)
    await supabase.from('course_events').insert({
      course_id: course.id,
      event_type: 'payment_released',
      event_note: 'Autorisation bancaire liberee (annulation)',
      payload: { cancelledBy: context.cancelledBy, reason: context.reason },
    })
    return
  }

  const captured = await captureCancellationFee(piId)
  await supabase
    .from('courses')
    .update({
      stripe_payment_status: 'succeeded',
      payment_captured_at: nowIso,
      cancellation_fee_captured_cents: captured.capturedCents,
      updated_at: nowIso,
    })
    .eq('id', course.id)
  await supabase.from('course_events').insert({
    course_id: course.id,
    event_type: 'payment_cancellation_fee',
    event_note: `Frais annulation ${CLIENT_CANCELLATION_FEE_EUR} EUR captures`,
    payload: {
      cancelledBy: context.cancelledBy,
      reason: context.reason,
      driverShareEur: captured.driverShareEur,
      paltoShareEur: captured.paltoShareEur,
      capturedCents: captured.capturedCents,
    },
  })
}

export async function applyRideCompletedPayment(
  supabase: SupabaseClient,
  course: CoursePaymentRow
): Promise<void> {
  if (!course.stripe_payment_intent_id?.trim()) return
  const total =
    course.total_charge_eur ??
    totalChargeEur(Number(course.amount_eur), Number(course.palto_fee_eur ?? PALTO_PLATFORM_FEE_EUR))
  await captureFullPaymentIntent(course.stripe_payment_intent_id, total)
  const nowIso = new Date().toISOString()
  await supabase
    .from('courses')
    .update({
      stripe_payment_status: 'succeeded',
      payment_captured_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', course.id)
  await supabase.from('course_events').insert({
    course_id: course.id,
    event_type: 'payment_captured',
    event_note: 'Paiement course + commission Palto captures',
    payload: { totalEur: total },
  })
}

export function isStripePaymentsEnabled(): boolean {
  return stripeSecretConfigured()
}

export async function handleStripeWebhookEvent(event: Stripe.Event, supabase: SupabaseClient): Promise<void> {
  if (event.type === 'payment_intent.amount_capturable_updated') {
    const pi = event.data.object as Stripe.PaymentIntent
    const courseId = pi.metadata?.course_id
    if (!courseId) return
    await supabase
      .from('courses')
      .update({
        stripe_payment_status: pi.status,
        payment_authorized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', courseId)
  }
  if (event.type === 'payment_intent.canceled') {
    const pi = event.data.object as Stripe.PaymentIntent
    const courseId = pi.metadata?.course_id
    if (!courseId) return
    await supabase
      .from('courses')
      .update({ stripe_payment_status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', courseId)
  }
}
