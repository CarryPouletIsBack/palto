import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { createAccountSession, hashPassword, normalizeEmail, verifyPassword } from './accountAuth.js'
import {
  AccountRegistrationIdentitySchema,
  buildAccountFullName,
  normalizeRegistrationPhone,
  registrationDisplayName,
} from './accountRegistrationFields.js'
import { getPaltoAppSessionByToken } from './paltoAppSession.js'
import { signPaltoSupabaseRealtimeJwt } from './paltoRealtimeJwt.js'

function parseJsonBody(req: VercelRequest): unknown {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  return req.body
}

const LoginBodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
})

const ClientRegisterBodySchema = AccountRegistrationIdentitySchema.extend({
  email: z.string().email().max(320),
  password: z.string().min(6).max(128),
})

const ChauffeurRegisterBodySchema = AccountRegistrationIdentitySchema.extend({
  email: z.string().email().max(320),
  password: z.string().min(6).max(128),
  vehicleType: z.enum(['berline', 'utilitaire', 'moto', 'scooter']),
  deliveryEquipped: z.boolean(),
})

export async function handleAuthClientLogin(req: VercelRequest, res: VercelResponse) {
  const body = parseJsonBody(req)
  if (body === null) return res.status(400).json({ success: false, error: 'Payload JSON invalide' })
  const parsed = LoginBodySchema.safeParse(body)
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
    .select('id,email,password_hash,full_name')
    .eq('email', email)
    .eq('role', 'client')
    .maybeSingle()

  if (error) {
    console.error('[auth/client/login]', error)
    return res.status(500).json({ success: false, error: `Lecture compte impossible${error.code ? ` (${error.code})` : ''}` })
  }
  if (!data) return res.status(401).json({ success: false, error: 'Email incorrect' })
  if (!verifyPassword(parsed.data.password, data.password_hash)) {
    return res.status(401).json({ success: false, error: 'Mot de passe incorrect' })
  }

  const token = await createAccountSession(supabase, { accountId: data.id, email: data.email, role: 'client' })
  return res.status(200).json({
    success: true,
    token,
    user: {
      email: data.email,
      displayName: (data.full_name ?? '').trim() || data.email.split('@')[0] || 'Passager',
    },
  })
}

export async function handleAuthClientRegister(req: VercelRequest, res: VercelResponse) {
  const body = parseJsonBody(req)
  if (body === null) return res.status(400).json({ success: false, error: 'Payload JSON invalide' })
  const parsed = ClientRegisterBodySchema.safeParse(body)
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
      role: 'client',
      password_hash: passwordHash,
      full_name: fullName,
      phone,
    })
    .select('id,email,full_name')
    .single()

  if (error || !data) {
    if (error?.code === '23505') return res.status(409).json({ success: false, error: 'EMAIL_EXISTS' })
    console.error('[auth/client/register]', error)
    return res.status(500).json({
      success: false,
      error: `Creation compte impossible${error?.code ? ` (${error.code})` : ''}`,
    })
  }

  const { data: existingClients } = await supabase
    .from('clients')
    .select('id')
    .ilike('email', email)
    .order('created_at', { ascending: false })
    .limit(1)

  const existingClient = existingClients?.[0]
  if (existingClient?.id) {
    await supabase
      .from('clients')
      .update({ full_name: fullName, phone, updated_at: new Date().toISOString() })
      .eq('id', existingClient.id)
  } else {
    const { error: clientErr } = await supabase.from('clients').insert({
      full_name: fullName,
      phone,
      email,
    })
    if (clientErr) console.warn('[auth/client/register] clients insert', clientErr)
  }

  const token = await createAccountSession(supabase, { accountId: data.id, email: data.email, role: 'client' })
  return res.status(201).json({
    success: true,
    token,
    user: { email: data.email, displayName },
  })
}

export async function handleAuthChauffeurLogin(req: VercelRequest, res: VercelResponse) {
  const body = parseJsonBody(req)
  if (body === null) return res.status(400).json({ success: false, error: 'Payload JSON invalide' })
  const parsed = LoginBodySchema.safeParse(body)
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
    .select('id,email,password_hash,full_name')
    .eq('email', email)
    .eq('role', 'chauffeur')
    .maybeSingle()

  if (error) {
    console.error('[auth/chauffeur/login]', error)
    return res.status(500).json({ success: false, error: `Lecture compte impossible${error.code ? ` (${error.code})` : ''}` })
  }
  if (!data) return res.status(401).json({ success: false, error: 'Email incorrect' })
  if (!verifyPassword(parsed.data.password, data.password_hash)) {
    return res.status(401).json({ success: false, error: 'Mot de passe incorrect' })
  }

  const token = await createAccountSession(supabase, { accountId: data.id, email: data.email, role: 'chauffeur' })
  return res.status(200).json({
    success: true,
    token,
    user: {
      email: data.email,
      displayName: (data.full_name ?? '').trim() || data.email.split('@')[0] || 'Chauffeur',
    },
  })
}

export async function handleAuthChauffeurRegister(req: VercelRequest, res: VercelResponse) {
  const body = parseJsonBody(req)
  if (body === null) return res.status(400).json({ success: false, error: 'Payload JSON invalide' })
  const parsed = ChauffeurRegisterBodySchema.safeParse(body)
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
    console.error('[auth/chauffeur/register]', error)
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

export async function handleAuthRealtimeToken(req: VercelRequest, res: VercelResponse) {
  const raw = req.headers.authorization
  if (!raw?.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Authorization Bearer requis' })
  }
  const paltoToken = raw.slice(7).trim()
  if (!paltoToken) return res.status(401).json({ error: 'Token vide' })

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    console.error('[auth/realtime-token]', e)
    return res.status(503).json({ error: 'Service indisponible' })
  }

  const session = await getPaltoAppSessionByToken(supabase, paltoToken)
  if (!session) return res.status(401).json({ error: 'Session invalide ou expiree' })

  try {
    const accessToken = signPaltoSupabaseRealtimeJwt({
      accountId: session.accountId,
      email: session.email,
      paltoRole: session.role,
      driverKey: session.role === 'chauffeur' ? session.accountId : undefined,
      ttlSeconds: 3600,
    })
    return res.status(200).json({ accessToken, expiresIn: 3600 })
  } catch (e) {
    console.error('[auth/realtime-token] sign', e)
    return res.status(503).json({ error: 'Configuration JWT Supabase manquante (SUPABASE_JWT_SECRET)' })
  }
}
