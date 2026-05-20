import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../../server/lib/supabaseAdmin.js'
import { createAccountSession, hashPassword, normalizeEmail } from '../../../server/lib/accountAuth.js'
import {
  AccountRegistrationIdentitySchema,
  buildAccountFullName,
  normalizeRegistrationPhone,
  registrationDisplayName,
} from '../../../server/lib/accountRegistrationFields.js'

const BodySchema = AccountRegistrationIdentitySchema.extend({
  email: z.string().email().max(320),
  password: z.string().min(6).max(128),
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
  const fullName = buildAccountFullName(parsed.data.prenom, parsed.data.nom)
  const phone = normalizeRegistrationPhone(parsed.data.phone)
  const displayName = registrationDisplayName(parsed.data.prenom, parsed.data.nom, email)

  const { data, error } = await supabase
    .from('app_accounts')
    .insert({
      email,
      role: 'chauffeur',
      password_hash: passwordHash,
      full_name: fullName,
      phone,
      vehicle_type: parsed.data.vehicleType,
      delivery_equipped: parsed.data.deliveryEquipped,
      pet_friendly: true,
      luggage_assistance: true,
      insulated_bag: parsed.data.deliveryEquipped,
    })
    .select('id,email,full_name')
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
    user: { email: data.email, displayName },
  })
}
