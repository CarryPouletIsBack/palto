import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'
import { getChauffeurDriverExternalKey } from '../../server/lib/chauffeurAuth.js'
import { getPaltoAppSessionByToken } from '../../server/lib/paltoAppSession.js'
import { signPaltoSupabaseRealtimeJwt } from '../../server/lib/paltoRealtimeJwt.js'

/**
 * Émet un JWT court compatible Supabase Realtime (RLS `authenticated` + claims Palto).
 * Authorization: Bearer <token app_sessions dashboard ou client>.
 */
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

  const raw = req.headers.authorization
  if (!raw?.toLowerCase().startsWith('bearer ')) {
    res.status(401).json({ error: 'Authorization Bearer requis' })
    return
  }
  const paltoToken = raw.slice(7).trim()
  if (!paltoToken) {
    res.status(401).json({ error: 'Token vide' })
    return
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    console.error('[auth/realtime-token]', e)
    res.status(503).json({ error: 'Service indisponible' })
    return
  }

  const session = await getPaltoAppSessionByToken(supabase, paltoToken)
  if (!session) {
    res.status(401).json({ error: 'Session invalide ou expiree' })
    return
  }

  try {
    const accessToken = signPaltoSupabaseRealtimeJwt({
      accountId: session.accountId,
      email: session.email,
      paltoRole: session.role,
      driverKey: session.role === 'chauffeur' ? getChauffeurDriverExternalKey() : undefined,
      ttlSeconds: 3600,
    })
    res.status(200).json({ accessToken, expiresIn: 3600 })
  } catch (e) {
    console.error('[auth/realtime-token] sign', e)
    res.status(503).json({ error: 'Configuration JWT Supabase manquante (SUPABASE_JWT_SECRET)' })
  }
}
