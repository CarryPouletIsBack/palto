import { createHmac } from 'node:crypto'

function base64urlEncodeJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * JWT HS256 compatible avec Supabase Realtime (même secret que « JWT Secret » projet).
 */
export function signPaltoSupabaseRealtimeJwt(input: {
  accountId: string
  email: string
  paltoRole: 'client' | 'chauffeur'
  driverKey?: string
  ttlSeconds?: number
}): string {
  const secret = process.env.SUPABASE_JWT_SECRET?.trim()
  if (!secret) throw new Error('SUPABASE_JWT_SECRET manquant')

  const now = Math.floor(Date.now() / 1000)
  const exp = now + (input.ttlSeconds ?? 3600)
  const header = base64urlEncodeJson({ alg: 'HS256', typ: 'JWT' })
  const payload = base64urlEncodeJson({
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'palto-realtime',
    sub: input.accountId,
    email: input.email,
    palto_role: input.paltoRole,
    ...(input.paltoRole === 'chauffeur' ? { driver_key: (input.driverKey ?? '').trim() } : {}),
    iat: now,
    exp,
  })
  const data = `${header}.${payload}`
  const sig = createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${data}.${sig}`
}
