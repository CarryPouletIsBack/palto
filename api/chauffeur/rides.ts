import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js'
import { getChauffeurDriverExternalKey, getVerifiedDashboardEmail } from '../lib/chauffeurAuth.js'
import { sameDriverExternalKey } from '../lib/driverIdentity.js'

type CourseRow = {
  id: string
  external_code: string | null
  client_id: string | null
  scheduled_date: string
  scheduled_time: string
  pickup_address: string
  dropoff_address: string
  status: string
  amount_eur: number
  distance_km: number | null
  booking_kind: string
  requested_driver_external_key: string | null
  assigned_driver_external_key: string | null
  accepted_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
  clients: { full_name: string; email: string | null; phone: string } | null
}

type CourseEventRow = {
  course_id: string
  event_type: string
  payload: { client_comment?: unknown } | null
}

function visibleForDriver(row: CourseRow, driverKey: string): boolean {
  if (row.status === 'pending') {
    if (row.booking_kind === 'scheduled') return true
    return sameDriverExternalKey(row.requested_driver_external_key, driverKey)
  }
  if (row.status === 'accepted' || row.status === 'in_progress') {
    return sameDriverExternalKey(row.assigned_driver_external_key, driverKey)
  }
  if (row.status === 'completed') {
    return sameDriverExternalKey(row.assigned_driver_external_key, driverKey)
  }
  if (row.status === 'cancelled') {
    return sameDriverExternalKey(row.assigned_driver_external_key, driverKey)
  }
  return false
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!(await getVerifiedDashboardEmail(req))) {
    return res.status(401).json({ error: 'Non autorise' })
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    console.error('[chauffeur/rides]', e)
    return res.status(503).json({ error: 'Service indisponible' })
  }

  const driverKey = getChauffeurDriverExternalKey()

  const { data, error } = await supabase
    .from('courses')
    .select(
      `
      id, external_code, client_id, scheduled_date, scheduled_time,
      pickup_address, dropoff_address, status, amount_eur, distance_km,
      booking_kind, requested_driver_external_key, assigned_driver_external_key,
      accepted_at, started_at, completed_at, cancelled_at, created_at,
      clients ( full_name, email, phone )
    `
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[chauffeur/rides] select', error)
    return res.status(500).json({ error: 'Lecture impossible' })
  }

  const rows = (data ?? []) as CourseRow[]
  const rides = rows.filter((r) => visibleForDriver(r, driverKey))
  const ridesById = new Map(rides.map((ride) => [ride.id, { ...ride, client_comment: null as string | null }]))

  if (rides.length > 0) {
    const rideIds = rides.map((ride) => ride.id)
    const { data: eventsData, error: eventsError } = await supabase
      .from('course_events')
      .select('course_id, event_type, payload')
      .in('course_id', rideIds)
      .eq('event_type', 'created')
      .order('created_at', { ascending: false })

    if (eventsError) {
      console.error('[chauffeur/rides] events select', eventsError)
    } else {
      const events = (eventsData ?? []) as CourseEventRow[]
      for (const event of events) {
        const target = ridesById.get(event.course_id)
        if (!target || target.client_comment) continue
        const rawComment = event.payload?.client_comment
        if (typeof rawComment !== 'string') continue
        const trimmed = rawComment.trim()
        if (!trimmed) continue
        target.client_comment = trimmed
      }
    }
  }

  return res.status(200).json({ rides: Array.from(ridesById.values()) })
}
