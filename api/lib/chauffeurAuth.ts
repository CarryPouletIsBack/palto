import type { VercelRequest } from '@vercel/node'
import { getSupabaseAdmin } from './supabaseAdmin.js'

/** Valide le token dashboard (base64 email:timestamp) contre DASHBOARD_EMAIL. */
export async function getVerifiedDashboardEmail(req: VercelRequest): Promise<string | null> {
  const raw = req.headers.authorization
  if (!raw?.toLowerCase().startsWith('bearer ')) return null
  const token = raw.slice(7).trim()
  if (!token) return null

  // Compat legacy : token local base64(email:timestamp) adosse a DASHBOARD_EMAIL
  const expected = process.env.DASHBOARD_EMAIL?.trim()
  if (expected) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8')
      const email = decoded.split(':')[0]?.trim()
      if (email && email === expected) return email
    } catch {
      // noop
    }
  }

  // Nouveau mode prod : session stockee en BDD
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('app_sessions')
      .select('email, role, expires_at')
      .eq('token', token)
      .eq('role', 'chauffeur')
      .maybeSingle()
    if (error || !data) return null
    const expiresAt = Date.parse(data.expires_at)
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) return null
    return data.email
  } catch {
    return null
  }
}

export function getChauffeurDriverExternalKey(): string {
  return (process.env.CHAUFFEUR_DRIVER_EXTERNAL_KEY ?? 'd1').trim() || 'd1'
}
