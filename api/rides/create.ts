import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js'
import { resolveRequestedDriverKeyForInsert } from '../lib/driverIdentity.js'

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
    requestedDriverExternalKey: z.string().max(32).nullable().optional(),
    pickupLng: z.number().finite().nullable().optional(),
    pickupLat: z.number().finite().nullable().optional(),
    dropoffLng: z.number().finite().nullable().optional(),
    dropoffLat: z.number().finite().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.bookingKind === 'instant' && !data.requestedDriverExternalKey?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Chauffeur requis pour une commande instantanee',
        path: ['requestedDriverExternalKey'],
      })
    }
    if (data.bookingKind === 'scheduled' && data.requestedDriverExternalKey?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ne pas cibler un chauffeur pour une reservation programme',
        path: ['requestedDriverExternalKey'],
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

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

  const phone = (b.clientPhone?.trim() || '+262000000000').slice(0, 40)
  const fullName = (b.clientFullName?.trim() || 'Client').slice(0, 200) || 'Client'

  const { data: clientRow, error: clientErr } = await supabase
    .from('clients')
    .insert({
      full_name: fullName,
      phone,
      email: b.clientEmail.trim(),
    })
    .select('id')
    .single()

  if (clientErr || !clientRow) {
    console.error('[rides/create] clients insert', clientErr)
    return res.status(500).json({ error: 'Impossible d enregistrer le client' })
  }

  const code = externalCode()
  const insertPayload = {
    external_code: code,
    client_id: clientRow.id,
    scheduled_date: b.scheduledDate,
    scheduled_time: scheduledTime,
    pickup_address: b.pickupAddress.trim(),
    dropoff_address: b.dropoffAddress.trim(),
    status: 'pending' as const,
    amount_eur: b.amountEur,
    distance_km: b.distanceKm ?? null,
    booking_kind: b.bookingKind,
    requested_driver_external_key: resolveRequestedDriverKeyForInsert(
      b.bookingKind,
      b.requestedDriverExternalKey
    ),
    pickup_lng: b.pickupLng ?? null,
    pickup_lat: b.pickupLat ?? null,
    dropoff_lng: b.dropoffLng ?? null,
    dropoff_lat: b.dropoffLat ?? null,
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
    },
  })

  return res.status(201).json({
    courseId: courseRow.id,
    externalCode: courseRow.external_code,
    status: courseRow.status,
    bookingKind: courseRow.booking_kind,
    scheduledDate: courseRow.scheduled_date,
    scheduledTime: courseRow.scheduled_time,
  })
}
