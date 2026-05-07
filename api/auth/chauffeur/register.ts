import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../../server/lib/supabaseAdmin.js'
import { createAccountSession, hashPassword, normalizeEmail } from '../../../server/lib/accountAuth.js'

const BodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(6).max(128),
  phoneInternational: z.string().trim().min(5).max(40),
  vehicleType: z.enum(['berline', 'utilitaire', 'moto', 'scooter']),
  deliveryEquipped: z.boolean(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body: unknown = req.body
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body)
    } catch {
      return res.status(400).json({ success: false, error: 'Payload JSON invalide' })
    }
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Payload invalide' })

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch {
    return res.status(503).json({ success: false, error: 'Service indisponible' })
  }

  const email = normalizeEmail(parsed.data.email)
  const passwordHash = hashPassword(parsed.data.password)
  const { data, error } = await supabase
    .from('app_accounts')
    .insert({
      email,
      role: 'chauffeur',
      password_hash: passwordHash,
      phone: parsed.data.phoneInternational,
      vehicle_type: parsed.data.vehicleType,
      delivery_equipped: parsed.data.deliveryEquipped,
    })
    .select('id,email')
    .single()

  if (error || !data) {
    if (error?.code === '23505') return res.status(409).json({ success: false, error: 'EMAIL_EXISTS' })
    console.error('[auth/chauffeur/register] insert app_accounts failed', error)
    return res.status(500).json({
      success: false,
      error: `Creation compte impossible${error?.code ? ` (${error.code})` : ''}`,
    })
  }

  const token = await createAccountSession(supabase, { accountId: data.id, email: data.email, role: 'chauffeur' })
  return res.status(201).json({
    success: true,
    token,
    user: { email: data.email, displayName: data.email.split('@')[0] || 'Chauffeur' },
  })
}
