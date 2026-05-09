import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeEmail } from './accountAuth.js'

export type PaltoAppSession = {
  email: string
  role: 'client' | 'chauffeur'
  accountId: string
}

export async function getPaltoAppSessionByToken(
  supabase: SupabaseClient,
  token: string
): Promise<PaltoAppSession | null> {
  const t = token.trim()
  if (!t) return null
  const { data, error } = await supabase
    .from('app_sessions')
    .select('email, role, account_id, expires_at')
    .eq('token', t)
    .maybeSingle()
  if (error || !data) return null
  const expiresAt = Date.parse(String(data.expires_at))
  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) return null
  const role = data.role as string
  if (role !== 'client' && role !== 'chauffeur') return null
  const email = normalizeEmail(String(data.email ?? ''))
  if (!email) return null
  const accountId = String(data.account_id ?? '').trim()
  if (!accountId) return null
  return { email, role, accountId }
}
