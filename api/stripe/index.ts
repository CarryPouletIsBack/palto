import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'
import { getStripe } from '../../server/lib/stripeClient.js'
import {
  handleStripeWebhookEvent,
  isStripePaymentsEnabled,
  syncPaymentIntentStatus,
} from '../../server/lib/rideStripePayments.js'
import { stripeWebhookConfigured } from '../../server/lib/stripeConfig.js'
import { getPaltoAppSessionByToken } from '../../server/lib/paltoAppSession.js'
import {
  createSetupIntentForCustomer,
  createWalletTopUpPaymentIntent,
  creditWalletFromPaymentIntent,
  detachCustomerPaymentMethod,
  getClientWalletBalanceCents,
  listCustomerPaymentMethods,
  updateCustomerPaymentMethodBilling,
} from '../../server/lib/stripeWallet.js'

/** Stripe exige le corps brut pour vérifier la signature (Vercel ne doit pas parser le JSON). */
export const config = {
  api: {
    bodyParser: false,
  },
}

const ConfirmBodySchema = z.object({
  courseId: z.string().uuid(),
})

const ClientBodySchema = z.object({
  fullName: z.string().max(200).optional(),
})

const WalletTopUpCreateSchema = z.object({
  amountEur: z.coerce.number().positive().max(200),
  fullName: z.string().max(200).optional(),
})

const WalletTopUpConfirmSchema = z.object({
  paymentIntentId: z.string().min(3).max(200),
})

const PaymentMethodIdSchema = z.object({
  paymentMethodId: z.string().min(3).max(200),
  fullName: z.string().max(200).optional(),
})

const UpdateBillingSchema = PaymentMethodIdSchema.extend({
  billing: z.object({
    name: z.string().max(200).optional().nullable(),
    line1: z.string().min(3).max(300),
    line2: z.string().max(300).optional().nullable(),
    city: z.string().min(2).max(120),
    postalCode: z.string().min(2).max(20),
    country: z.string().length(2),
  }),
})

async function readRawBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === 'string') return req.body
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => resolve())
    req.on('error', reject)
  })
  return Buffer.concat(chunks).toString('utf8')
}

function parseJsonBody(raw: string): unknown {
  if (!raw.trim()) return {}
  return JSON.parse(raw) as unknown
}

function readBearerToken(req: VercelRequest): string | null {
  const raw = req.headers.authorization
  if (!raw?.toLowerCase().startsWith('bearer ')) return null
  const token = raw.slice(7).trim()
  return token || null
}

type StripePayerContext = {
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>
  accountId: string
  email: string
}

/** Client direct, ou chauffeur avec compte passager lié au même email (cartes / portefeuille). */
async function requireStripePayerSession(
  req: VercelRequest,
  res: VercelResponse
): Promise<StripePayerContext | null> {
  const token = readBearerToken(req)
  if (!token) {
    res.status(401).json({ error: 'Non autorise' })
    return null
  }
  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    console.error('[stripe/payer]', e)
    res.status(503).json({ error: 'Service indisponible' })
    return null
  }
  const session = await getPaltoAppSessionByToken(supabase, token)
  if (!session) {
    res.status(401).json({ error: 'Non autorise' })
    return null
  }

  if (session.role === 'client') {
    return { supabase, accountId: session.accountId, email: session.email }
  }

  if (session.role === 'chauffeur') {
    return { supabase, accountId: session.accountId, email: session.email }
  }

  res.status(401).json({ error: 'Non autorise' })
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const action = typeof req.query.action === 'string' ? req.query.action.trim() : ''
  const rawBody = await readRawBody(req)

  if (action === 'webhook') {
    if (!isStripePaymentsEnabled() || !stripeWebhookConfigured()) {
      res.status(503).json({ error: 'Webhook Stripe non configure' })
      return
    }
    const sig = req.headers['stripe-signature']
    if (!sig || typeof sig !== 'string') {
      res.status(400).json({ error: 'Stripe-Signature manquant' })
      return
    }
    try {
      const stripe = getStripe()
      const secret = process.env.STRIPE_WEBHOOK_SECRET!.trim()
      const event = stripe.webhooks.constructEvent(rawBody, sig, secret)
      const supabase = getSupabaseAdmin()
      await handleStripeWebhookEvent(event, supabase)
      res.status(200).json({ received: true })
    } catch (e) {
      console.error('[stripe/webhook]', e)
      res.status(400).json({ error: 'Webhook invalide' })
    }
    return
  }

  if (action === 'confirm-authorized') {
    if (!isStripePaymentsEnabled()) {
      res.status(503).json({ error: 'Paiement Stripe desactive' })
      return
    }
    let body: unknown
    try {
      body = parseJsonBody(rawBody)
    } catch {
      res.status(400).json({ error: 'Payload invalide' })
      return
    }
    const parsed = ConfirmBodySchema.safeParse(body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })
      return
    }
    let supabase
    try {
      supabase = getSupabaseAdmin()
    } catch (e) {
      console.error('[stripe/confirm]', e)
      res.status(503).json({ error: 'Service indisponible' })
      return
    }
    const { courseId } = parsed.data
    const { data: course, error } = await supabase
      .from('courses')
      .select('id,stripe_payment_intent_id')
      .eq('id', courseId)
      .maybeSingle()
    if (error || !course?.stripe_payment_intent_id) {
      res.status(404).json({ error: 'Course ou paiement introuvable' })
      return
    }
    try {
      const status = await syncPaymentIntentStatus(course.stripe_payment_intent_id)
      const authorized = status === 'requires_capture' || status === 'succeeded'
      if (authorized) {
        await supabase
          .from('courses')
          .update({
            stripe_payment_status: status,
            payment_authorized_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', courseId)
      }
      res.status(200).json({ ok: authorized, status })
    } catch (e) {
      console.error('[stripe/confirm] sync', e)
      res.status(500).json({ error: 'Verification paiement impossible' })
    }
    return
  }

  const clientActions = new Set([
    'setup-intent',
    'list-payment-methods',
    'detach-payment-method',
    'update-payment-method-billing',
    'wallet-balance',
    'wallet-topup-create',
    'wallet-topup-confirm',
  ])

  if (clientActions.has(action)) {
    if (!isStripePaymentsEnabled()) {
      res.status(503).json({ error: 'Paiement Stripe desactive' })
      return
    }

    const ctx = await requireStripePayerSession(req, res)
    if (!ctx) return

    let body: unknown
    try {
      body = parseJsonBody(rawBody)
    } catch {
      res.status(400).json({ error: 'Payload invalide' })
      return
    }

    const { supabase, accountId, email } = ctx

    try {
      if (action === 'setup-intent') {
        const parsed = ClientBodySchema.safeParse(body)
        if (!parsed.success) {
          res.status(400).json({ error: 'Payload invalide' })
          return
        }
        const result = await createSetupIntentForCustomer(
          supabase,
          accountId,
          email,
          parsed.data.fullName
        )
        res.status(200).json(result)
        return
      }

      if (action === 'list-payment-methods') {
        const parsed = ClientBodySchema.safeParse(body)
        if (!parsed.success) {
          res.status(400).json({ error: 'Payload invalide' })
          return
        }
        const listed = await listCustomerPaymentMethods(
          supabase,
          accountId,
          email,
          parsed.data.fullName
        )
        res.status(200).json({ items: listed.items, stripeCustomerId: listed.stripeCustomerId })
        return
      }

      if (action === 'detach-payment-method') {
        const parsed = PaymentMethodIdSchema.safeParse(body)
        if (!parsed.success) {
          res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })
          return
        }
        await detachCustomerPaymentMethod({
          supabase,
          accountId,
          email,
          fullName: parsed.data.fullName,
          paymentMethodId: parsed.data.paymentMethodId,
        })
        res.status(200).json({ ok: true })
        return
      }

      if (action === 'update-payment-method-billing') {
        const parsed = UpdateBillingSchema.safeParse(body)
        if (!parsed.success) {
          res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })
          return
        }
        await updateCustomerPaymentMethodBilling({
          supabase,
          accountId,
          email,
          fullName: parsed.data.fullName,
          paymentMethodId: parsed.data.paymentMethodId,
          billing: parsed.data.billing,
        })
        res.status(200).json({ ok: true })
        return
      }

      if (action === 'wallet-balance') {
        const balanceCents = await getClientWalletBalanceCents(supabase, accountId)
        res.status(200).json({ balanceCents })
        return
      }

      if (action === 'wallet-topup-create') {
        const parsed = WalletTopUpCreateSchema.safeParse(body)
        if (!parsed.success) {
          res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })
          return
        }
        const result = await createWalletTopUpPaymentIntent({
          supabase,
          accountId,
          email,
          fullName: parsed.data.fullName,
          amountEur: parsed.data.amountEur,
        })
        res.status(200).json(result)
        return
      }

      if (action === 'wallet-topup-confirm') {
        const parsed = WalletTopUpConfirmSchema.safeParse(body)
        if (!parsed.success) {
          res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })
          return
        }
        const result = await creditWalletFromPaymentIntent(
          supabase,
          accountId,
          parsed.data.paymentIntentId
        )
        res.status(200).json(result)
        return
      }
    } catch (e) {
      console.error(`[stripe/${action}]`, e)
      const msg = e instanceof Error ? e.message : 'Erreur Stripe'
      res.status(500).json({ error: msg })
    }
    return
  }

  res.status(400).json({
    error:
      'action invalide (webhook | confirm-authorized | setup-intent | list-payment-methods | detach-payment-method | update-payment-method-billing | wallet-balance | wallet-topup-create | wallet-topup-confirm)',
  })
}
