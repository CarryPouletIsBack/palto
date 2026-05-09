import type { VercelRequest } from '@vercel/node'
import { getSupabaseAdmin } from './supabaseAdmin.js'

export type VerifiedChauffeurSession = {
  email: string
  /** Identifiant unique chauffeur (aligné sur `app_accounts.id`, stocké dans courses.*_driver_external_key). */
  accountId: string
}

/**
 * Session dashboard chauffeur : email + id compte pour filtrer les courses (plus une clé globale env).
 */
export async function getVerifiedChauffeurSession(req: VercelRequest): Promise<VerifiedChauffeurSession | null> {
  const raw = req.headers.authorization
  if (!raw?.toLowerCase().startsWith('bearer ')) return null
  const token = raw.slice(7).trim()
  if (!token) return null

  const expected = process.env.DASHBOARD_EMAIL?.trim()
  if (expected) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8')
      const emailRaw = decoded.split(':')[0]?.trim()
      if (emailRaw && emailRaw === expected) {
        const supabase = getSupabaseAdmin()
        const email = emailRaw.toLowerCase()
        const { data: roleAccount, error: roleError } = await supabase
          .from('app_accounts')
          .select('id')
          .eq('email', email)
          .eq('role', 'chauffeur')
          .maybeSingle()
        if (roleError || !roleAccount) return null
        return { email, accountId: roleAccount.id }
      }
    } catch {
      // noop
    }
  }

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
    if (!email) return null

    const { data: roleAccount, error: roleError } = await supabase
      .from('app_accounts')
      .select('id')
      .eq('email', email)
      .eq('role', 'chauffeur')
      .maybeSingle()
    if (roleError || !roleAccount) return null
    return { email, accountId: roleAccount.id }
  } catch {
    return null
  }
}

export async function getVerifiedDashboardEmail(req: VercelRequest): Promise<string | null> {
  const s = await getVerifiedChauffeurSession(req)
  return s?.email ?? null
}

/** @deprecated Préférer `getVerifiedChauffeurSession().accountId` — clé unique par compte. */
export function getChauffeurDriverExternalKey(): string {
  return (process.env.CHAUFFEUR_DRIVER_EXTERNAL_KEY ?? 'd1').trim() || 'd1'
}
