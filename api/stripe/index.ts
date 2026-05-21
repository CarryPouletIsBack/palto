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

/** Stripe exige le corps brut pour vérifier la signature (Vercel ne doit pas parser le JSON). */
export const config = {
  api: {
    bodyParser: false,
  },
}

const ConfirmBodySchema = z.object({
  courseId: z.string().uuid(),
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature')

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

  res.status(400).json({ error: 'action invalide (webhook | confirm-authorized)' })
}
