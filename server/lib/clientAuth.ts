import type { VercelRequest } from '@vercel/node'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { getPaltoAppSessionByToken, type PaltoAppSession } from './paltoAppSession.js'

function readBearerToken(req: VercelRequest): string | null {
  const raw = req.headers.authorization
  if (!raw?.toLowerCase().startsWith('bearer ')) return null
  const token = raw.slice(7).trim()
  return token || null
}

/** Session API passager : token `app_sessions` avec rôle `client` uniquement. */
export async function getVerifiedClientSession(req: VercelRequest): Promise<PaltoAppSession | null> {
  const token = readBearerToken(req)
  if (!token) return null
  try {
    const supabase = getSupabaseAdmin()
    const session = await getPaltoAppSessionByToken(supabase, token)
    if (!session || session.role !== 'client') return null
    return session
  } catch {
    return null
  }
}
