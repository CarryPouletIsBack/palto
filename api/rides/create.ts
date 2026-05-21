import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'
import { resolveRequestedDriverKeyForInsert } from '../../server/lib/driverIdentity.js'
import { PALTO_PLATFORM_FEE_EUR, totalChargeEur } from '../../server/lib/stripeConfig.js'
import { getPaltoAppSessionByToken } from '../../server/lib/paltoAppSession.js'
import { getOrCreateStripeCustomer } from '../../server/lib/stripeCustomer.js'
import {
  createManualCapturePaymentIntent,
  isStripePaymentsEnabled,
} from '../../server/lib/rideStripePayments.js'
import { parseCoursePaymentMethod, type CoursePaymentMethod } from '../../server/lib/coursePaymentMethod.js'

function readBearerToken(req: VercelRequest): string | null {
  const raw = req.headers.authorization
  if (!raw?.toLowerCase().startsWith('bearer ')) return null
  const token = raw.slice(7).trim()
  return token || null
}

const BodySchema = z
  .object({
    bookingKind: z.enum(['instant', 'scheduled']),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scheduledTime: z.string().min(4).max(12),
    pickupAddress: z.string().min(3).max(500),
    dropoffAddress: z.string().min(3).max(500),
    amountEur: z.number().finite().nonnegative(),
    distanceKm: z.number().finite().nonnegative().nullable().optional(),
    clientFullName: z.string().max(200).nullable().optional(),
    clientEmail: z.string().email().max(320),
    clientPhone: z.string().max(40).nullable().optional(),
    clientComment: z.string().max(600).nullable().optional(),
    /** Clé « mock » (ex. d1) ou futur slug court — préférer requestedChauffeurAccountId (UUID compte). */
    requestedDriverExternalKey: z.string().max(64).nullable().optional(),
    /** UUID `app_accounts` rôle chauffeur — réservé à bookingKind instant. */
    requestedChauffeurAccountId: z.string().uuid().nullable().optional(),
    pickupLng: z.number().finite().nullable().optional(),
    pickupLat: z.number().finite().nullable().optional(),
    dropoffLng: z.number().finite().nullable().optional(),
    dropoffLat: z.number().finite().nullable().optional(),
    paymentMethod: z.enum(['card', 'cash']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.bookingKind === 'instant') {
      const hasAcc = Boolean(data.requestedChauffeurAccountId?.trim())
      const hasLeg = Boolean(data.requestedDriverExternalKey?.trim())
      if (!hasAcc && !hasLeg) {
        ctx.addIssue({
          code: 'custom',
          message: 'Chauffeur requis pour une commande instantanee',
          path: ['requestedChauffeurAccountId'],
        })
      }
    }
    if (data.bookingKind === 'scheduled' && data.requestedDriverExternalKey?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ne pas cibler un chauffeur pour une reservation programme',
        path: ['requestedDriverExternalKey'],
      })
    }
    if (data.bookingKind === 'scheduled' && data.requestedChauffeurAccountId?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ne pas cibler un chauffeur (UUID) pour une reservation programme',
        path: ['requestedChauffeurAccountId'],
      })
    }
  })

function normalizeTime(t: string): string {
  const s = t.trim()
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s
  return s
}

function externalCode(): string {
  return `TM-${randomBytes(4).toString('hex').toUpperCase()}`
}

function normalizeAddressForStorage(raw: string): string {
  const input = raw.trim()
  if (!input) return ''
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  const normalizeNoPostal = (value: string) => normalize(value).replace(/\b97\d{3}\b/g, '').trim()
  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  const uniqueParts: string[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    const key = normalizeNoPostal(part)
    if (!key || seen.has(key)) continue
    seen.add(key)
    uniqueParts.push(part.replace(/\s+/g, ' ').trim())
  }

  const deDuplicated = uniqueParts.filter((part, index) => {
    const current = normalizeNoPostal(part)
    return !uniqueParts.slice(0, index).some((prev) => {
      const previous = normalizeNoPostal(prev)
      return previous === current || previous.includes(current) || current.includes(previous)
    })
  })
  return deDuplicated.join(', ') || input
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    console.error('[rides/create]', e)
    return res.status(503).json({ error: 'Service indisponible (configuration Supabase)' })
  }

  const raw = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Payload invalide',
      details: parsed.error.flatten(),
    })
  }

  const b = parsed.data
  const scheduledTime = normalizeTime(b.scheduledTime)
  if (!/^\d{2}:\d{2}:\d{2}$/.test(scheduledTime)) {
    return res.status(400).json({ error: 'scheduledTime invalide (attendu HH:MM ou HH:MM:SS)' })
  }

  const emailNorm = b.clientEmail.trim().toLowerCase()
  const phone = (b.clientPhone?.trim() || '+262000000000').slice(0, 40)
  const fullName = (b.clientFullName?.trim() || 'Client').slice(0, 200) || 'Client'

  const { data: existingClients, error: existingClientErr } = await supabase
    .from('clients')
    .select('id')
    .ilike('email', emailNorm)
    .order('created_at', { ascending: false })
    .limit(1)

  if (existingClientErr) {
    console.error('[rides/create] clients lookup', existingClientErr)
    return res.status(500).json({ error: 'Impossible de verifier le client' })
  }

  let clientId = (existingClients?.[0] as { id: string } | undefined)?.id ?? null

  if (!clientId) {
    const { data: clientRow, error: clientErr } = await supabase
      .from('clients')
      .insert({
        full_name: fullName,
        phone,
        email: emailNorm,
      })
      .select('id')
      .single()

    if (clientErr || !clientRow) {
      console.error('[rides/create] clients insert', clientErr)
      return res.status(500).json({ error: 'Impossible d enregistrer le client' })
    }
    clientId = clientRow.id
  }

  let requestedDriverKey: string | null = null
  if (b.bookingKind === 'instant') {
    const accId = b.requestedChauffeurAccountId?.trim()
    if (accId) {
      const { data: accRow, error: accErr } = await supabase
        .from('app_accounts')
        .select('id')
        .eq('id', accId)
        .eq('role', 'chauffeur')
        .maybeSingle()
      if (accErr || !accRow) {
        return res.status(400).json({ error: 'Chauffeur demande inconnu ou invalide' })
      }
      requestedDriverKey = accRow.id
    } else {
      requestedDriverKey = resolveRequestedDriverKeyForInsert(b.bookingKind, b.requestedDriverExternalKey)
    }
  }

  const code = externalCode()
  const driverAmountEur = b.amountEur
  const paltoFeeEur = PALTO_PLATFORM_FEE_EUR
  const totalEur = totalChargeEur(driverAmountEur, paltoFeeEur)
  const paymentMethod: CoursePaymentMethod = parseCoursePaymentMethod(b.paymentMethod ?? 'cash')
  if (paymentMethod === 'card' && !isStripePaymentsEnabled()) {
    return res.status(400).json({
      error: 'Paiement par carte indisponible pour le moment. Choisissez le reglement en especes.',
    })
  }
  const insertPayload = {
    external_code: code,
    client_id: clientId,
    scheduled_date: b.scheduledDate,
    scheduled_time: scheduledTime,
    pickup_address: normalizeAddressForStorage(b.pickupAddress),
    dropoff_address: normalizeAddressForStorage(b.dropoffAddress),
    status: 'pending' as const,
    amount_eur: driverAmountEur,
    palto_fee_eur: paltoFeeEur,
    total_charge_eur: totalEur,
    distance_km: b.distanceKm ?? null,
    booking_kind: b.bookingKind,
    requested_driver_external_key: requestedDriverKey,
    pickup_lng: b.pickupLng ?? null,
    pickup_lat: b.pickupLat ?? null,
    dropoff_lng: b.dropoffLng ?? null,
    dropoff_lat: b.dropoffLat ?? null,
    payment_method: paymentMethod,
  }

  const { data: courseRow, error: courseErr } = await supabase
    .from('courses')
    .insert(insertPayload)
    .select('id, external_code, status, booking_kind, scheduled_date, scheduled_time')
    .single()

  if (courseErr || !courseRow) {
    console.error('[rides/create] courses insert', courseErr)
    return res.status(500).json({ error: 'Impossible d enregistrer la course' })
  }

  await supabase.from('course_events').insert({
    course_id: courseRow.id,
    event_type: 'created',
    event_note: 'Commande client',
    payload: {
      booking_kind: b.bookingKind,
      client_comment: b.clientComment?.trim() || null,
      driver_amount_eur: driverAmountEur,
      palto_fee_eur: paltoFeeEur,
      total_charge_eur: totalEur,
    },
  })

  let stripeClientSecret: string | null = null
  let stripePaymentIntentId: string | null = null
  let stripeCustomerId: string | null = null
  let stripeSetupWarning: string | null = null

  if (paymentMethod === 'card' && isStripePaymentsEnabled()) {
    try {
      const paltoToken = readBearerToken(req)
      if (paltoToken) {
        const session = await getPaltoAppSessionByToken(supabase, paltoToken)
        if (session?.role === 'client') {
          stripeCustomerId = await getOrCreateStripeCustomer(
            supabase,
            session.accountId,
            session.email,
            fullName
          )
        }
      }

      const pi = await createManualCapturePaymentIntent({
        courseId: courseRow.id,
        externalCode: courseRow.external_code ?? code,
        driverAmountEur,
        paltoFeeEur,
        clientEmail: emailNorm,
        stripeCustomerId,
      })
      stripeClientSecret = pi.clientSecret
      stripePaymentIntentId = pi.paymentIntentId
      await supabase
        .from('courses')
        .update({
          stripe_payment_intent_id: pi.paymentIntentId,
          stripe_payment_status: 'requires_payment_method',
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseRow.id)
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      console.error('[rides/create] stripe PI', e)
      stripeSetupWarning =
        'Paiement en ligne temporairement indisponible. La commande est enregistree ; reglement prevu avec le chauffeur.'
      await supabase.from('course_events').insert({
        course_id: courseRow.id,
        event_type: 'stripe_setup_failed',
        event_note: detail.slice(0, 500),
        payload: { detail },
      })
    }
  }

  return res.status(201).json({
    courseId: courseRow.id,
    externalCode: courseRow.external_code,
    status: courseRow.status,
    bookingKind: courseRow.booking_kind,
    scheduledDate: courseRow.scheduled_date,
    scheduledTime: courseRow.scheduled_time,
    driverAmountEur,
    paltoFeeEur,
    totalChargeEur: totalEur,
    paymentMethod,
    stripeEnabled: isStripePaymentsEnabled(),
    stripeClientSecret,
    stripePaymentIntentId,
    stripeCustomerId,
    stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() || process.env.STRIPE_PUBLISHABLE_KEY?.trim() || null,
    stripeSetupWarning,
  })
}
