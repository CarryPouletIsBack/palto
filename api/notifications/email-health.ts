import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'

function isAuthorized(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV !== 'production'
  const auth = req.headers.authorization?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Non autorise (CRON_SECRET requis en production)' })
    return
  }

  const hasResendKey = Boolean(process.env.RESEND_API_KEY?.trim())
  const resendFrom = process.env.RESEND_FROM?.trim() || null
  const resendTo = process.env.RESEND_TO_EMAIL?.trim() || null

  let notificationsTable: 'ok' | 'missing' | 'error' = 'missing'
  let notificationsTableError: string | null = null
  let chauffeurWithEmailCount = 0

  try {
    const supabase = getSupabaseAdmin()
    const { error: tableErr } = await supabase.from('course_notifications_log').select('id').limit(1)
    if (tableErr) {
      notificationsTable = 'error'
      notificationsTableError = tableErr.message
    } else {
      notificationsTable = 'ok'
    }

    const { data: drivers, error: driversErr } = await supabase
      .from('app_accounts')
      .select('email')
      .eq('role', 'chauffeur')
    if (!driversErr) {
      chauffeurWithEmailCount = (drivers ?? []).filter((d) => String(d.email ?? '').trim()).length
    }
  } catch (e) {
    notificationsTable = 'error'
    notificationsTableError = e instanceof Error ? e.message : String(e)
  }

  if (req.method === 'GET') {
    res.status(200).json({
      ok: hasResendKey && notificationsTable === 'ok',
      checks: {
        resendApiKey: hasResendKey,
        resendFrom,
        resendToConfigured: Boolean(resendTo),
        notificationsTable,
        notificationsTableError,
        chauffeurWithEmailCount,
        supabaseAdmin: Boolean(
          process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
        ),
      },
      hint:
        notificationsTable !== 'ok'
          ? 'Executer la migration supabase/migrations/0012_course_notifications.sql'
          : !hasResendKey
            ? 'Ajouter RESEND_API_KEY sur Vercel puis redeploy'
            : chauffeurWithEmailCount === 0
              ? 'Aucun chauffeur avec email dans app_accounts'
              : 'POST avec { "to": "votre@email.com" } pour un email test',
    })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!hasResendKey) {
    res.status(503).json({ error: 'RESEND_API_KEY manquante' })
    return
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const to = String(body?.to ?? resendTo ?? '').trim()
  if (!to) {
    res.status(400).json({ error: 'Champ "to" requis ou definir RESEND_TO_EMAIL' })
    return
  }

  const from = resendFrom || 'Palto <onboarding@resend.dev>'
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    const result = await resend.emails.send({
      from,
      to: [to],
      subject: 'Test Palto — notifications course',
      text: [
        'Ceci est un email de test depuis Palto.',
        '',
        `From: ${from}`,
        `Date: ${new Date().toISOString()}`,
        '',
        'Si vous recevez ce message, Resend est bien configure sur Vercel.',
      ].join('\n'),
    })
    res.status(200).json({ ok: true, to, from, resendId: result.data?.id ?? null, error: result.error ?? null })
  } catch (error) {
    console.error('[notifications/email-health]', error)
    res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      from,
      to,
    })
  }
}
