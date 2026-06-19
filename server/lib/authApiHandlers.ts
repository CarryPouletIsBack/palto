import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { createAccountSession, hashPassword, normalizeEmail, verifyPassword } from './accountAuth.js'
import {
  AccountRegistrationIdentitySchema,
  buildAccountFullName,
  normalizeRegistrationPhone,
  registrationDisplayName,
} from './accountRegistrationFields.js'
import { getVerifiedChauffeurSession } from './chauffeurAuth.js'
import { getVerifiedClientSession } from './clientAuth.js'
import { getPaltoAppSessionByToken } from './paltoAppSession.js'
import { signPaltoSupabaseRealtimeJwt } from './paltoRealtimeJwt.js'
import { seedChauffeurProfileOnRegister } from './seedChauffeurProfileOnRegister.js'

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

const ForgotPasswordBodySchema = z.object({
  email: z.string().email().max(320),
})

const ResetPasswordBodySchema = z.object({
  token: z.string().min(20).max(256),
  password: z.string().min(6).max(128),
})

const ClientRegisterBodySchema = AccountRegistrationIdentitySchema.extend({
  email: z.string().email().max(320),
  password: z.string().min(6).max(128),
})

const ChauffeurRegisterBodySchema = AccountRegistrationIdentitySchema.extend({
  email: z.string().email().max(320),
  password: z.string().min(6).max(128),
  adresse: z.string().trim().min(3).max(200),
  ville: z.string().trim().min(1).max(120),
  vehicleType: z.enum(['berline', 'utilitaire', 'moto', 'scooter']),
  motorisation: z.enum(['thermique_hydrogene_hybride', 'electrique_100']),
  plaque: z.string().trim().min(5).max(20),
  licenseYear: z.number().int().min(1970).max(new Date().getFullYear()),
  isVtc: z.boolean(),
  deliveryEquipped: z.boolean(),
})

function appBaseUrlFromRequest(req: VercelRequest): string {
  const envBase =
    process.env.APP_BASE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    ''
  if (envBase) {
    if (/^https?:\/\//i.test(envBase)) return envBase.replace(/\/$/, '')
    return `https://${envBase.replace(/\/$/, '')}`
  }
  const host = req.headers.host?.trim() || 'localhost:3000'
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() || 'https'
  return `${proto}://${host}`
}

async function createPasswordResetToken(
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  account: { id: string; email: string },
  role: 'client' | 'chauffeur'
): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const { error } = await supabase.from('app_sessions').insert({
    token,
    account_id: account.id,
    email: account.email,
    role,
    expires_at: expiresAt,
  })
  if (error) throw new Error(`Creation token reset impossible${error.code ? ` (${error.code})` : ''}`)
  return token
}

async function sendForgotPasswordEmail(params: {
  email: string
  role: 'client' | 'chauffeur'
  resetLink: string
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY non configuree')
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM ?? 'Palto <onboarding@resend.dev>'
  const appLabel = params.role === 'chauffeur' ? 'Palto Chauffeur' : 'Palto Client'
  const roleLabel = params.role === 'chauffeur' ? 'chauffeur' : 'client'
  const { error } = await resend.emails.send({
    from,
    to: [params.email],
    subject: `[Palto] Reinitialisation du mot de passe (${appLabel})`,
    html: `<p>Bonjour,</p>
<p>Une demande de reinitialisation a ete faite pour votre compte <strong>${roleLabel}</strong>.</p>
<p><a href="${params.resetLink}">Reinitialiser mon mot de passe</a> (lien valable 30 minutes)</p>
<p>Ou copiez ce lien dans votre navigateur :<br>${params.resetLink}</p>
<p>Si vous n'etes pas a l'origine de cette demande, ignorez ce message ou contactez le support Palto.</p>`,
    text: `Bonjour,

Une demande de reinitialisation a ete faite pour votre compte ${roleLabel}.

Lien de reinitialisation (valable 30 minutes) :
${params.resetLink}

Ouvrez ce lien pour choisir un nouveau mot de passe.
Si vous n'etes pas a l'origine de cette demande, contactez le support Palto.
`,
  })
  if (error) throw new Error(error.message)
}

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
  if (!data.password_hash) {
    return res.status(401).json({
      success: false,
      error: 'OAUTH_ACCOUNT_USE_SOCIAL',
    })
  }
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
  if (!data.password_hash) {
    return res.status(401).json({
      success: false,
      error: 'OAUTH_ACCOUNT_USE_SOCIAL',
    })
  }
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

  await seedChauffeurProfileOnRegister(supabase, {
    accountId: String(data.id),
    email,
    prenom: parsed.data.prenom,
    nom: parsed.data.nom,
    phone,
    adresse: parsed.data.adresse,
    ville: parsed.data.ville,
    vehicleType: parsed.data.vehicleType,
    motorisation: parsed.data.motorisation,
    plaque: parsed.data.plaque,
    licenseYear: parsed.data.licenseYear,
    isVtc: parsed.data.isVtc,
    deliveryEquipped: parsed.data.deliveryEquipped,
  })

  const token = await createAccountSession(supabase, { accountId: data.id, email: data.email, role: 'chauffeur' })
  return res.status(201).json({
    success: true,
    token,
    user: { email: data.email, displayName },
  })
}

export async function handleAuthForgotPassword(
  req: VercelRequest,
  res: VercelResponse,
  role: 'client' | 'chauffeur'
) {
  const body = parseJsonBody(req)
  if (body === null) return res.status(400).json({ success: false, error: 'Payload JSON invalide' })
  const parsed = ForgotPasswordBodySchema.safeParse(body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Email invalide' })

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch {
    return res.status(503).json({ success: false, error: 'Service indisponible' })
  }

  const email = normalizeEmail(parsed.data.email)
  const { data: account, error: readErr } = await supabase
    .from('app_accounts')
    .select('id,email')
    .eq('email', email)
    .eq('role', role)
    .maybeSingle()

  if (readErr) {
    console.error(`[auth/${role}/forgot-password] read`, readErr)
    return res.status(500).json({ success: false, error: 'Lecture compte impossible' })
  }

  // Reponse neutre pour eviter l'enumeration des comptes.
  if (!account) return res.status(200).json({ success: true })

  let resetToken: string
  try {
    resetToken = await createPasswordResetToken(supabase, { id: account.id, email: account.email }, role)
  } catch (error) {
    console.error(`[auth/${role}/forgot-password] token`, error)
    return res.status(500).json({ success: false, error: 'Reinitialisation impossible' })
  }
  const baseUrl = appBaseUrlFromRequest(req)
  const resetLink = `${baseUrl}/fr/reset-password?role=${role}&token=${encodeURIComponent(resetToken)}`

  try {
    await sendForgotPasswordEmail({
      email: account.email,
      role,
      resetLink,
    })
  } catch (error) {
    console.error(`[auth/${role}/forgot-password] email`, error)
    return res.status(503).json({
      success: false,
      error: 'Email de reinitialisation indisponible. Contactez le support.',
    })
  }

  return res.status(200).json({ success: true })
}

export async function handleAuthResetPassword(
  req: VercelRequest,
  res: VercelResponse,
  role: 'client' | 'chauffeur'
) {
  const body = parseJsonBody(req)
  if (body === null) return res.status(400).json({ success: false, error: 'Payload JSON invalide' })
  const parsed = ResetPasswordBodySchema.safeParse(body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Payload invalide' })

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch {
    return res.status(503).json({ success: false, error: 'Service indisponible' })
  }

  const token = parsed.data.token.trim()
  const { data: session, error: sessionErr } = await supabase
    .from('app_sessions')
    .select('token,account_id,email,role,expires_at')
    .eq('token', token)
    .maybeSingle()
  if (sessionErr) {
    console.error(`[auth/${role}/reset-password] session read`, sessionErr)
    return res.status(500).json({ success: false, error: 'Verification token impossible' })
  }
  if (!session || session.role !== role) {
    return res.status(401).json({ success: false, error: 'Token invalide ou expire' })
  }
  const expiresAtMs = Date.parse(session.expires_at)
  if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
    await supabase.from('app_sessions').delete().eq('token', token)
    return res.status(401).json({ success: false, error: 'Token invalide ou expire' })
  }

  const passwordHash = hashPassword(parsed.data.password)
  const { error: updateErr } = await supabase
    .from('app_accounts')
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq('id', session.account_id)
    .eq('role', role)
  if (updateErr) {
    console.error(`[auth/${role}/reset-password] account update`, updateErr)
    return res.status(500).json({ success: false, error: 'Reinitialisation impossible' })
  }

  await supabase.from('app_sessions').delete().eq('token', token)
  return res.status(200).json({ success: true })
}

const DeleteAccountBodySchema = z.object({
  password: z.string().max(128).optional(),
  confirmOAuthDelete: z.boolean().optional(),
})

export async function handleAuthDeleteAccount(
  req: VercelRequest,
  res: VercelResponse,
  role: 'client' | 'chauffeur'
) {
  const body = parseJsonBody(req)
  if (body === null) return res.status(400).json({ success: false, error: 'Payload JSON invalide' })
  const parsed = DeleteAccountBodySchema.safeParse(body)
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Payload invalide' })

  const session =
    role === 'client' ? await getVerifiedClientSession(req) : await getVerifiedChauffeurSession(req)
  if (!session) {
    return res.status(401).json({ success: false, error: 'Session invalide ou expiree' })
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch {
    return res.status(503).json({ success: false, error: 'Service indisponible' })
  }

  const { data: account, error: readErr } = await supabase
    .from('app_accounts')
    .select('id,password_hash')
    .eq('id', session.accountId)
    .eq('role', role)
    .maybeSingle()

  if (readErr) {
    console.error(`[auth/${role}/delete]`, readErr)
    return res.status(500).json({ success: false, error: 'Lecture compte impossible' })
  }
  if (!account) return res.status(404).json({ success: false, error: 'Compte introuvable' })

  if (account.password_hash) {
    const pwd = (parsed.data.password ?? '').trim()
    if (!pwd) {
      return res.status(400).json({ success: false, error: 'Mot de passe requis' })
    }
    if (!verifyPassword(pwd, account.password_hash)) {
      return res.status(401).json({ success: false, error: 'Mot de passe incorrect' })
    }
  } else if (parsed.data.confirmOAuthDelete !== true) {
    return res.status(400).json({
      success: false,
      error: 'OAUTH_DELETE_CONFIRM_REQUIRED',
    })
  }

  if (role === 'client') {
    const { error: clientDelErr } = await supabase.from('clients').delete().ilike('email', session.email)
    if (clientDelErr) console.warn('[auth/client/delete] clients', clientDelErr)
  }

  const { error: delErr } = await supabase.from('app_accounts').delete().eq('id', account.id)
  if (delErr) {
    console.error(`[auth/${role}/delete]`, delErr)
    return res.status(500).json({ success: false, error: 'Suppression compte impossible' })
  }

  return res.status(200).json({ success: true })
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
