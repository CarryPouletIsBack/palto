import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js'
import { getChauffeurDriverExternalKey, getVerifiedDashboardEmail } from '../lib/chauffeurAuth.js'
import { sameDriverExternalKey } from '../lib/driverIdentity.js'

type CourseRow = {
  status: string
  amount_eur: number
  booking_kind: string
  scheduled_date: string | null
  requested_driver_external_key: string | null
  assigned_driver_external_key: string | null
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

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
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
    console.error('[chauffeur/stats]', e)
    return res.status(503).json({ error: 'Service indisponible' })
  }

  const driverKey = getChauffeurDriverExternalKey()
  const { data, error } = await supabase
    .from('courses')
    .select('status,amount_eur,booking_kind,scheduled_date,requested_driver_external_key,assigned_driver_external_key')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[chauffeur/stats] select', error)
    return res.status(500).json({ error: 'Lecture impossible' })
  }

  const rows = ((data ?? []) as CourseRow[]).filter((r) => visibleForDriver(r, driverKey))
  const completed = rows.filter((r) => r.status === 'completed').length
  const cancelled = rows.filter((r) => r.status === 'cancelled').length
  const inProgress = rows.filter((r) => r.status === 'in_progress').length
  const pending = rows.filter((r) => r.status === 'pending').length
  const acceptedOrInProgress = rows.filter((r) => r.status === 'accepted' || r.status === 'in_progress').length
  const totalIncome = rows.filter((r) => r.status !== 'cancelled').reduce((acc, r) => acc + (r.amount_eur ?? 0), 0)
  const acceptanceRate =
    completed + acceptedOrInProgress > 0
      ? Math.round((acceptedOrInProgress / (completed + acceptedOrInProgress)) * 100)
      : 0
  const cancellationRate = rows.length > 0 ? Math.round((cancelled / rows.length) * 100) : 0
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 363)
  const dayCounts = new Map<string, number>()
  for (const row of rows) {
    if (row.status === 'cancelled' || !row.scheduled_date) continue
    const d = new Date(`${row.scheduled_date}T12:00:00`)
    if (Number.isNaN(d.getTime())) continue
    if (d < start || d > today) continue
    const key = toIsoDate(d)
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
  }
  const cells = Array.from({ length: 52 }, (_, weekIdx) =>
    Array.from({ length: 7 }, (_, dayIdx) => {
      const date = new Date(start)
      date.setDate(start.getDate() + weekIdx * 7 + dayIdx)
      const key = toIsoDate(date)
      return dayCounts.get(key) ?? 0
    })
  )
  const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  const monthTotals = Array.from({ length: 12 }, () => 0)
  const dayTotals = Array.from({ length: 7 }, () => 0)
  const allDays: number[] = []
  for (let w = 0; w < 52; w += 1) {
    for (let d = 0; d < 7; d += 1) {
      const value = cells[w][d]
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      monthTotals[date.getMonth()] += value
      dayTotals[d] += value
      allDays.push(value > 0 ? 1 : 0)
    }
  }
  const bestMonthIdx = monthTotals.indexOf(Math.max(...monthTotals))
  const bestDayIdx = dayTotals.indexOf(Math.max(...dayTotals))
  let longest = 0
  let run = 0
  for (const v of allDays) {
    if (v > 0) {
      run += 1
      if (run > longest) longest = run
    } else run = 0
  }
  let current = 0
  for (let i = allDays.length - 1; i >= 0; i -= 1) {
    if (allDays[i] > 0) current += 1
    else break
  }

  return res.status(200).json({
    stats: {
      completed,
      cancelled,
      inProgress,
      pending,
      totalCourses: rows.length,
      acceptanceRate,
      cancellationRate,
      rating: 4.92,
      onlineHoursWeek: 36,
      totalIncome,
      lastPayout: '1 125 EUR · vendredi',
    },
    heatmap: {
      totalWeeks: 52,
      cells,
      bestMonth: monthNames[bestMonthIdx] ?? '—',
      bestDay: dayNames[bestDayIdx] ?? '—',
      longestStreak: `${longest}j`,
      currentStreak: `${current}j`,
    },
  })
}
