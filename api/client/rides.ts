import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getVerifiedClientSession } from '../../server/lib/clientAuth.js'
import { expireStaleInstantPendingCourses } from '../../server/lib/expireStaleInstantPendingCourses.js'
import {
  driverMetaFromChauffeurAccount,
  mergeDriverMeta,
  normalizeDriverMetaFromEventPayload,
  type ResolvedDriverMeta,
} from '../../server/lib/acceptedDriverPayload.js'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'
import { listRegisteredChauffeursForBooking } from '../../server/lib/registeredChauffeursForBooking.js'
import { notifyRideStatusChange } from '../../server/lib/rideEmailNotifications.js'
import {
  applyCancelPaymentOutcome,
  resolveClientCancelPaymentOutcome,
  type CoursePaymentRow,
} from '../../server/lib/rideStripePayments.js'

const QuerySchema = z.object({
  email: z.string().email(),
  status: z.enum(['upcoming', 'completed', 'cancelled', 'all']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const NearbyQuerySchema = z.object({
  mode: z.literal('nearby'),
  lat: z.coerce.number().finite(),
  lng: z.coerce.number().finite(),
  radiusKm: z.coerce.number().finite().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
})

const CancelBodySchema = z.object({
  courseId: z.string().uuid(),
})

type RideRow = {
  id: string
  status: string
  pickup_address: string
  dropoff_address: string
  scheduled_date: string
  scheduled_time: string
  amount_eur: number
  distance_km: number | null
  pickup_lng: number | null
  pickup_lat: number | null
  dropoff_lng: number | null
  dropoff_lat: number | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  payment_method: string | null
  assigned_driver_external_key: string | null
}

type CourseEventRow = {
  course_id: string
  payload: Record<string, unknown> | null
}

type ClientRow = {
  id: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (req.method === 'POST') {
    const parsedBody = CancelBodySchema.safeParse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body)
    if (!parsedBody.success) {
      res.status(400).json({ error: 'Payload invalide', details: parsedBody.error.flatten() })
      return
    }
    const clientSession = await getVerifiedClientSession(req)
    if (!clientSession) {
      res.status(401).json({ error: 'Connexion client requise' })
      return
    }
    const sessionEmail = clientSession.email
    let supabase
    try {
      supabase = getSupabaseAdmin()
    } catch (e) {
      console.error('[client/rides cancel]', e)
      res.status(503).json({ error: 'Service indisponible' })
      return
    }
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', sessionEmail)
    if (clientsError) {
      console.error('[client/rides cancel] clients lookup', clientsError)
      res.status(500).json({ error: 'Lecture impossible' })
      return
    }
    const clientIds = ((clients ?? []) as ClientRow[]).map((c) => c.id).filter(Boolean)
    if (clientIds.length === 0) {
      res.status(403).json({ error: 'Compte client introuvable' })
      return
    }
    const { courseId } = parsedBody.data
    const { data: ride, error: rideErr } = await supabase
      .from('courses')
      .select(
        'id,client_id,status,amount_eur,palto_fee_eur,total_charge_eur,stripe_payment_intent_id,stripe_payment_status,accepted_at,started_at,assigned_driver_external_key'
      )
      .eq('id', courseId)
      .maybeSingle()
    if (rideErr || !ride) {
      res.status(404).json({ error: 'Course introuvable' })
      return
    }
    if (!clientIds.includes(String(ride.client_id ?? ''))) {
      res.status(403).json({ error: 'Course non autorisee' })
      return
    }
    if (ride.status !== 'pending' && ride.status !== 'accepted') {
      res.status(409).json({ error: 'Annulation impossible pour ce statut' })
      return
    }
    const nowIso = new Date().toISOString()
    const { data: updated, error: updateErr } = await supabase
      .from('courses')
      .update({
        status: 'cancelled',
        cancelled_at: nowIso,
        cancelled_reason: 'Annule par le client',
        updated_at: nowIso,
      })
      .eq('id', courseId)
      .in('status', ['pending', 'accepted'])
      .select('id,status')
      .maybeSingle()
    if (updateErr || !updated) {
      res.status(409).json({ error: 'Annulation impossible' })
      return
    }

    const paymentRow = ride as unknown as CoursePaymentRow
    const payOutcome = resolveClientCancelPaymentOutcome(paymentRow)
    try {
      await applyCancelPaymentOutcome(supabase, paymentRow, payOutcome, {
        cancelledBy: 'client',
        reason: 'Annule par le client',
      })
    } catch (payErr) {
      console.error('[client/rides cancel] stripe', payErr)
      res.status(502).json({ error: 'Course annulee mais paiement a verifier manuellement' })
      return
    }

    try {
      await notifyRideStatusChange({
        supabase,
        courseId,
        newStatus: 'cancelled',
        actor: 'client',
        detailNote: 'Annule par le client',
      })
    } catch (e) {
      console.error('[client/rides cancel] status email', e)
    }

    res.status(200).json({ ok: true, status: updated.status, paymentOutcome: payOutcome })
    return
  }

  const nearbyParsed = NearbyQuerySchema.safeParse(req.query)
  if (nearbyParsed.success) {
    let supabase
    try {
      supabase = getSupabaseAdmin()
    } catch (e) {
      console.error('[client/rides nearby]', e)
      res.status(503).json({ error: 'Service indisponible' })
      return
    }
    const { lat, lng, radiusKm = 20, limit = 9 } = nearbyParsed.data
    const drivers = await listRegisteredChauffeursForBooking(supabase, { lng, lat }, radiusKm, limit)
    res.status(200).json({ drivers })
    return
  }

  const clientSession = await getVerifiedClientSession(req)
  if (!clientSession) {
    res.status(401).json({ error: 'Connexion client requise' })
    return
  }

  const parsed = QuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'Query invalide', details: parsed.error.flatten() })
    return
  }

  const { email, status = 'all', limit = 40 } = parsed.data
  const emailNorm = email.trim().toLowerCase()
  if (emailNorm !== clientSession.email) {
    res.status(403).json({ error: 'Email non autorise pour cette session' })
    return
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    console.error('[client/rides]', e)
    res.status(503).json({ error: 'Service indisponible' })
    return
  }

  try {
    await expireStaleInstantPendingCourses(supabase)
  } catch (e) {
    console.error('[client/rides GET] expire stale instant', e)
  }
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const nowTime = `${hh}:${mm}:00`

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id')
    .ilike('email', emailNorm)

  if (clientsError) {
    console.error('[client/rides] clients lookup', clientsError)
    res.status(500).json({ error: 'Lecture impossible' })
    return
  }

  const clientIds = ((clients ?? []) as ClientRow[]).map((c) => c.id).filter(Boolean)
  if (clientIds.length === 0) {
    res.status(200).json({ items: [] })
    return
  }

  let query = supabase
    .from('courses')
    .select(
      'id,status,pickup_address,dropoff_address,scheduled_date,scheduled_time,amount_eur,distance_km,payment_method,pickup_lng,pickup_lat,dropoff_lng,dropoff_lat,created_at,started_at,completed_at,assigned_driver_external_key'
    )
    .in('client_id', clientIds)
    .order('scheduled_date', { ascending: false })
    .order('scheduled_time', { ascending: false })
    .limit(limit)

  if (status === 'completed') query = query.eq('status', 'completed')
  if (status === 'cancelled') query = query.eq('status', 'cancelled')
  if (status === 'upcoming') {
    query = query.in('status', ['pending', 'accepted', 'in_progress'])
    query = query.or(`scheduled_date.gt.${today},and(scheduled_date.eq.${today},scheduled_time.gte.${nowTime})`)
  }

  const { data, error } = await query
  if (error) {
    console.error('[client/rides] select', error)
    res.status(500).json({ error: 'Lecture impossible' })
    return
  }

  const rows = data as unknown as RideRow[]
  const courseIds = rows.map((r) => r.id)
  const driverMetaByCourse = new Map<string, ResolvedDriverMeta>()
  if (courseIds.length > 0) {
    const { data: eventsData } = await supabase
      .from('course_events')
      .select('course_id,payload')
      .in('course_id', courseIds)
      .in('event_type', ['accepted', 'started', 'completed'])
      .order('created_at', { ascending: true })
    for (const row of (eventsData ?? []) as CourseEventRow[]) {
      const prev = driverMetaByCourse.get(row.course_id) ?? {}
      const chunk = normalizeDriverMetaFromEventPayload(row.payload)
      if (
        !chunk.driverName &&
        !chunk.vehicleLabel &&
        !chunk.driverProfilePhotoUrl &&
        !chunk.driverPhone &&
        !chunk.licensePlate
      ) {
        continue
      }
      driverMetaByCourse.set(row.course_id, mergeDriverMeta(prev, chunk))
    }
  }

  const assignedAccountIds = [
    ...new Set(
      rows
        .map((r) => (r.assigned_driver_external_key ?? '').trim())
        .filter((id) => id.length > 0)
    ),
  ]
  const accountMetaById = new Map<string, ResolvedDriverMeta>()
  if (assignedAccountIds.length > 0) {
    const { data: accounts, error: accountsErr } = await supabase
      .from('app_accounts')
      .select('id, full_name, email, phone, vehicle_type')
      .in('id', assignedAccountIds)
      .eq('role', 'chauffeur')
    if (accountsErr) {
      console.error('[client/rides] chauffeur accounts', accountsErr)
    } else {
      const { data: profiles } = await supabase
        .from('chauffeur_profile_data')
        .select('account_id, account_snapshot')
        .in('account_id', assignedAccountIds)
      const snapshotById = new Map(
        (profiles ?? []).map((p) => [String(p.account_id), p.account_snapshot])
      )
      for (const acc of accounts ?? []) {
        const id = String(acc.id)
        accountMetaById.set(
          id,
          driverMetaFromChauffeurAccount({
            fullName: acc.full_name,
            email: acc.email,
            phone: acc.phone,
            vehicleTypeSlug: acc.vehicle_type,
            profileSnapshot: snapshotById.get(id) ?? {},
          })
        )
      }
    }
  }

  const items = rows.map((row) => {
    const eventMeta = driverMetaByCourse.get(row.id) ?? {}
    const accountId = (row.assigned_driver_external_key ?? '').trim()
    const accountMeta = accountId ? (accountMetaById.get(accountId) ?? {}) : {}
    const driverMeta = mergeDriverMeta(eventMeta, accountMeta)
    return {
    id: row.id,
    status: row.status,
    pickupAddress: row.pickup_address,
    dropoffAddress: row.dropoff_address,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    amountEur: row.amount_eur,
    distanceKm: row.distance_km,
    paymentMethod: row.payment_method === 'card' || row.payment_method === 'cash' ? row.payment_method : null,
    pickupLng: row.pickup_lng,
    pickupLat: row.pickup_lat,
    dropoffLng: row.dropoff_lng,
    dropoffLat: row.dropoff_lat,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    driverName: driverMeta.driverName ?? null,
    vehicleLabel: driverMeta.vehicleLabel ?? null,
    driverProfilePhotoUrl: driverMeta.driverProfilePhotoUrl ?? null,
    driverPhone: driverMeta.driverPhone ?? null,
    vehicleType: driverMeta.vehicleType ?? null,
    vehicleModel: driverMeta.vehicleModel ?? null,
    licensePlate: driverMeta.licensePlate ?? null,
  }
  })

  res.status(200).json({ items })
}
