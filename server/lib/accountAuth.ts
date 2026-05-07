import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AccountRole = 'client' | 'chauffeur'

const SESSION_TTL_DAYS = 30

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${derived}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hashHex] = stored.split(':')
  if (algo !== 'scrypt' || !salt || !hashHex) return false
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(hashHex, 'hex')
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export async function createAccountSession(
  supabase: SupabaseClient,
  input: { accountId: string; email: string; role: AccountRole }
): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase.from('app_sessions').insert({
    token,
    account_id: input.accountId,
    email: normalizeEmail(input.email),
    role: input.role,
    expires_at: expiresAt,
  })
  if (error) throw new Error(`SESSION_CREATE_FAILED:${error.message}`)
  return token
}
