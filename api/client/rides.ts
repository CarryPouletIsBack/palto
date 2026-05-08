import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'

const QuerySchema = z.object({
  email: z.string().email(),
  status: z.enum(['upcoming', 'completed', 'cancelled', 'all']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
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
}

type CourseEventRow = {
  course_id: string
  payload: {
    driverName?: string
    vehicleLabel?: string
  } | null
}

type ClientRow = {
  id: string
}

async function getVerifiedSessionEmail(req: VercelRequest): Promise<string | null> {
  const raw = req.headers.authorization
  if (!raw?.toLowerCase().startsWith('bearer ')) return null
  const token = raw.slice(7).trim()
  if (!token) return null
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('app_sessions')
      .select('email, expires_at')
      .eq('token', token)
      .maybeSingle()
    if (error || !data) return null
    const expiresAt = Date.parse(data.expires_at)
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) return null
    const email = String(data.email || '').trim().toLowerCase()
    return email || null
  } catch {
    return null
  }
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
    const sessionEmail = await getVerifiedSessionEmail(req)
    if (!sessionEmail) {
      res.status(401).json({ error: 'Non autorise' })
      return
    }
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
      .select('id,client_id,status')
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
    res.status(200).json({ ok: true, status: updated.status })
    return
  }

  const parsed = QuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'Query invalide', details: parsed.error.flatten() })
    return
  }

  const { email, status = 'all', limit = 40 } = parsed.data

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    console.error('[client/rides]', e)
    res.status(503).json({ error: 'Service indisponible' })
    return
  }

  const emailNorm = email.trim().toLowerCase()
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
      'id,status,pickup_address,dropoff_address,scheduled_date,scheduled_time,amount_eur,distance_km,pickup_lng,pickup_lat,dropoff_lng,dropoff_lat,created_at'
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
  let driverMetaByCourse = new Map<string, { driverName?: string; vehicleLabel?: string }>()
  if (courseIds.length > 0) {
    const { data: eventsData } = await supabase
      .from('course_events')
      .select('course_id,payload')
      .in('course_id', courseIds)
      .in('event_type', ['accepted', 'started', 'completed'])
      .order('created_at', { ascending: false })
    for (const row of (eventsData ?? []) as CourseEventRow[]) {
      if (driverMetaByCourse.has(row.course_id)) continue
      const driverName = row.payload?.driverName?.trim()
      const vehicleLabel = row.payload?.vehicleLabel?.trim()
      if (!driverName && !vehicleLabel) continue
      driverMetaByCourse.set(row.course_id, { driverName, vehicleLabel })
    }
  }

  const items = rows.map((row) => ({
    id: row.id,
    status: row.status,
    pickupAddress: row.pickup_address,
    dropoffAddress: row.dropoff_address,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    amountEur: row.amount_eur,
    distanceKm: row.distance_km,
    pickupLng: row.pickup_lng,
    pickupLat: row.pickup_lat,
    dropoffLng: row.dropoff_lng,
    dropoffLat: row.dropoff_lat,
    createdAt: row.created_at,
    driverName: driverMetaByCourse.get(row.id)?.driverName ?? null,
    vehicleLabel: driverMetaByCourse.get(row.id)?.vehicleLabel ?? null,
  }))

  res.status(200).json({ items })
}
