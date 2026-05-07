import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js'
import { getChauffeurDriverExternalKey, getVerifiedDashboardEmail } from '../lib/chauffeurAuth.js'
import { sameDriverExternalKey } from '../lib/driverIdentity.js'

const BodySchema = z.object({
  courseId: z.string().uuid(),
  action: z.enum(['accept', 'start', 'complete', 'cancel']),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
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
    console.error('[chauffeur/rides-action]', e)
    return res.status(503).json({ error: 'Service indisponible' })
  }

  const raw = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })
  }

  const { courseId, action } = parsed.data
  const driverKey = getChauffeurDriverExternalKey()

  const { data: row, error: readErr } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle()

  if (readErr || !row) {
    return res.status(404).json({ error: 'Course introuvable' })
  }

  const nowIso = new Date().toISOString()

  if (action === 'accept') {
    if (row.status !== 'pending') {
      return res.status(409).json({ error: 'Course deja traitee' })
    }
    if (row.booking_kind === 'instant' && !sameDriverExternalKey(row.requested_driver_external_key, driverKey)) {
      return res.status(403).json({ error: 'Cette course est reservee a un autre chauffeur' })
    }
    const { data: updated, error: upErr } = await supabase
      .from('courses')
      .update({
        status: 'accepted',
        assigned_driver_external_key: driverKey,
        accepted_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', courseId)
      .eq('status', 'pending')
      .select('id, status')
      .maybeSingle()

    if (upErr || !updated) {
      return res.status(409).json({ error: 'Impossible d accepter (course peut-etre prise par un collegue)' })
    }
    await supabase.from('course_events').insert({
      course_id: courseId,
      event_type: 'accepted',
      payload: { driver: driverKey },
    })
    return res.status(200).json({ ok: true, status: updated.status })
  }

  if (action === 'start') {
    if (row.status !== 'accepted' || !sameDriverExternalKey(row.assigned_driver_external_key, driverKey)) {
      return res.status(409).json({ error: 'Course non acceptee par vous' })
    }
    const { data: updated, error: upErr } = await supabase
      .from('courses')
      .update({
        status: 'in_progress',
        started_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', courseId)
      .eq('status', 'accepted')
      .select('id, status')
      .maybeSingle()

    if (upErr || !updated) {
      return res.status(409).json({ error: 'Impossible de demarrer' })
    }
    await supabase.from('course_events').insert({
      course_id: courseId,
      event_type: 'started',
      payload: {},
    })
    return res.status(200).json({ ok: true, status: updated.status })
  }

  if (action === 'complete') {
    if (row.status !== 'in_progress' || !sameDriverExternalKey(row.assigned_driver_external_key, driverKey)) {
      return res.status(409).json({ error: 'Course non en cours pour vous' })
    }
    const { data: updated, error: upErr } = await supabase
      .from('courses')
      .update({
        status: 'completed',
        completed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', courseId)
      .eq('status', 'in_progress')
      .select('id, status')
      .maybeSingle()

    if (upErr || !updated) {
      return res.status(409).json({ error: 'Impossible de terminer' })
    }
    await supabase.from('course_events').insert({
      course_id: courseId,
      event_type: 'completed',
      payload: {},
    })
    return res.status(200).json({ ok: true, status: updated.status })
  }

  /* cancel : pas de desistement API sur demande « programme » en attente (plusieurs chauffeurs). */
  if (row.status === 'completed' || row.status === 'cancelled') {
    return res.status(409).json({ error: 'Course deja close' })
  }
  if (row.status === 'pending' && row.booking_kind === 'scheduled') {
    return res.status(403).json({
      error: 'Une reservation programme en attente doit etre acceptee ou ignoree ; pas d annulation chauffeur ici.',
    })
  }
  if (row.status === 'pending' && row.booking_kind === 'instant') {
    if (!sameDriverExternalKey(row.requested_driver_external_key, driverKey)) {
      return res.status(403).json({ error: 'Non autorise' })
    }
  } else if (row.status === 'accepted' || row.status === 'in_progress') {
    if (!sameDriverExternalKey(row.assigned_driver_external_key, driverKey)) {
      return res.status(403).json({ error: 'Non autorise' })
    }
  } else {
    return res.status(403).json({ error: 'Non autorise' })
  }

  const { error: upErr } = await supabase
    .from('courses')
    .update({
      status: 'cancelled',
      cancelled_at: nowIso,
      cancelled_reason: 'Annule depuis le dashboard',
      updated_at: nowIso,
    })
    .eq('id', courseId)

  if (upErr) {
    return res.status(500).json({ error: 'Annulation impossible' })
  }
  await supabase.from('course_events').insert({
    course_id: courseId,
    event_type: 'cancelled',
    payload: { driver: driverKey },
  })
  return res.status(200).json({ ok: true, status: 'cancelled' })
}
