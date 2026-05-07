import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../lib/supabaseAdmin.js'
import { createAccountSession, normalizeEmail, verifyPassword } from '../../lib/accountAuth.js'

const BodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const parsed = BodySchema.safeParse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Payload invalide' })

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch {
    return res.status(503).json({ success: false, error: 'Service indisponible' })
  }

  const email = normalizeEmail(parsed.data.email)
  const { data, error } = await supabase
    .from('app_accounts')
    .select('id,email,password_hash')
    .eq('email', email)
    .eq('role', 'client')
    .maybeSingle()

  if (error) return res.status(500).json({ success: false, error: 'Lecture compte impossible' })
  if (!data) return res.status(401).json({ success: false, error: 'Email incorrect' })
  if (!verifyPassword(parsed.data.password, data.password_hash)) {
    return res.status(401).json({ success: false, error: 'Mot de passe incorrect' })
  }

  const token = await createAccountSession(supabase, { accountId: data.id, email: data.email, role: 'client' })
  return res.status(200).json({
    success: true,
    token,
    user: { email: data.email, displayName: data.email.split('@')[0] || 'Passager' },
  })
}
