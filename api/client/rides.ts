import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'

const QuerySchema = z.object({
  email: z.string().email(),
  status: z.enum(['upcoming', 'completed', 'cancelled', 'all']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
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
  created_at: string
}

type ClientRow = {
  id: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
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
    .select('id,status,pickup_address,dropoff_address,scheduled_date,scheduled_time,amount_eur,distance_km,created_at')
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

  const items = (data as unknown as RideRow[]).map((row) => ({
    id: row.id,
    status: row.status,
    pickupAddress: row.pickup_address,
    dropoffAddress: row.dropoff_address,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    amountEur: row.amount_eur,
    distanceKm: row.distance_km,
    createdAt: row.created_at,
  }))

  res.status(200).json({ items })
}
