import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'
import { notifyClientRideStartsSoon } from '../../server/lib/rideEmailNotifications.js'

type CourseReminderRow = {
  id: string
  external_code: string | null
  status: string
  scheduled_date: string
  scheduled_time: string
  pickup_address: string
  dropoff_address: string
  client_id: string | null
}

type ClientRow = {
  id: string
  email: string | null
  full_name: string
}

function isAuthorizedCron(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return true
  const auth = req.headers.authorization?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

function parseCourseDateTimeIso(course: CourseReminderRow): Date | null {
  const time = String(course.scheduled_time).slice(0, 8)
  const iso = `${course.scheduled_date}T${time}+04:00`
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
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
  if (!isAuthorizedCron(req)) {
    res.status(401).json({ error: 'Non autorise' })
    return
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (error) {
    console.error('[notifications/course-reminders] supabase config', error)
    res.status(503).json({ error: 'Service indisponible' })
    return
  }

  const now = new Date()
  const minDate = new Date(now.getTime() + 30 * 60 * 1000)
  const maxDate = new Date(now.getTime() + 35 * 60 * 1000)

  // Préfiltre SQL (date courante + lendemain) pour éviter de scanner toutes les courses.
  const todayReunion = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const tomorrowReunion = new Date(now.getTime() + 28 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select(
      'id, external_code, status, scheduled_date, scheduled_time, pickup_address, dropoff_address, client_id'
    )
    .in('status', ['pending', 'accepted'])
    .in('scheduled_date', [todayReunion, tomorrowReunion])
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })

  if (coursesError) {
    console.error('[notifications/course-reminders] courses query', coursesError)
    res.status(500).json({ error: 'Lecture des courses impossible' })
    return
  }

  const candidateRows = (courses ?? []) as CourseReminderRow[]
  const dueRows = candidateRows.filter((row) => {
    const scheduledAt = parseCourseDateTimeIso(row)
    if (!scheduledAt) return false
    return scheduledAt >= minDate && scheduledAt < maxDate
  })

  if (dueRows.length === 0) {
    res.status(200).json({ ok: true, checked: candidateRows.length, due: 0, sent: 0, skipped: 0 })
    return
  }

  const clientIds = [...new Set(dueRows.map((r) => r.client_id).filter((id): id is string => Boolean(id)))]
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, email, full_name')
    .in('id', clientIds)

  if (clientsError) {
    console.error('[notifications/course-reminders] clients query', clientsError)
    res.status(500).json({ error: 'Lecture des clients impossible' })
    return
  }

  const clientById = new Map<string, ClientRow>()
  for (const client of (clients ?? []) as ClientRow[]) {
    clientById.set(client.id, client)
  }

  let sent = 0
  let skipped = 0
  const errors: Array<{ courseId: string; reason: string }> = []

  for (const row of dueRows) {
    const client = row.client_id ? clientById.get(row.client_id) : null
    const clientEmail = String(client?.email ?? '').trim().toLowerCase()
    if (!clientEmail) {
      skipped += 1
      continue
    }

    try {
      const result = await notifyClientRideStartsSoon({
        supabase,
        courseId: row.id,
        externalCode: row.external_code ?? `COURSE-${row.id.slice(0, 8).toUpperCase()}`,
        clientEmail,
        clientName: String(client?.full_name ?? 'Client').trim() || 'Client',
        pickupAddress: row.pickup_address,
        dropoffAddress: row.dropoff_address,
        scheduledAtIso: `${row.scheduled_date}T${String(row.scheduled_time).slice(0, 8)}+04:00`,
      })
      if (result.sent) sent += 1
      else skipped += 1
    } catch (error) {
      errors.push({
        courseId: row.id,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const statusCode = errors.length > 0 ? 207 : 200
  res.status(statusCode).json({
    ok: errors.length === 0,
    checked: candidateRows.length,
    due: dueRows.length,
    sent,
    skipped,
    errors,
  })
}
