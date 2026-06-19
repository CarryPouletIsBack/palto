import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { createAccountSession, normalizeEmail, type AccountRole } from './accountAuth.js'
import { mergeAccountSnapshots } from './clientProfileMerge.js'
import {
  sanitizeAccountSnapshot,
  sanitizeSavedPlacesSnapshot,
} from './clientProfileSanitize.js'

export type OAuthProvider = 'google' | 'facebook'

export type OAuthStatePayload = {
  role: AccountRole
  provider: OAuthProvider
  returnTo: string
  nonce: string
  exp: number
}

export type OAuthUserProfile = {
  providerUserId: string
  email: string
  emailVerified: boolean
  fullName: string
  pictureUrl: string | null
}

const OAUTH_EXCHANGE_TTL_MS = 2 * 60 * 1000
const STATE_TTL_MS = 10 * 60 * 1000

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const FACEBOOK_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth'
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token'
const FACEBOOK_USER_URL = 'https://graph.facebook.com/me'

function oauthStateSecret(): string {
  return (
    process.env.OAUTH_STATE_SECRET?.trim() ||
    process.env.SUPABASE_JWT_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    'palto-oauth-dev-only'
  )
}

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
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() || 'http'
  return `${proto}://${host}`
}

function oauthCallbackUrl(baseUrl: string, provider: OAuthProvider): string {
  return `${baseUrl}/api/auth?action=oauth-callback&provider=${provider}`
}

function signOAuthState(payload: OAuthStatePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', oauthStateSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function parseOAuthState(raw: string): OAuthStatePayload | null {
  const trimmed = raw.trim()
  const dot = trimmed.lastIndexOf('.')
  if (dot <= 0) return null
  const body = trimmed.slice(0, dot)
  const sig = trimmed.slice(dot + 1)
  const expected = createHmac('sha256', oauthStateSecret()).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload
    if (payload.role !== 'client' && payload.role !== 'chauffeur') return null
    if (payload.provider !== 'google' && payload.provider !== 'facebook') return null
    if (!payload.nonce || typeof payload.exp !== 'number') return null
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function sanitizeReturnTo(returnTo: string | undefined, baseUrl: string, role: AccountRole): string {
  const fallback = role === 'chauffeur' ? '/fr/dashboard' : '/fr/compte'
  const raw = (returnTo ?? '').trim()
  if (!raw) return fallback
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  try {
    const url = new URL(raw)
    const base = new URL(baseUrl)
    if (url.origin === base.origin && url.pathname.startsWith('/')) {
      return `${url.pathname}${url.search}`
    }
  } catch {
    /* ignore */
  }
  return fallback
}

function redirectOAuthError(res: VercelResponse, returnTo: string, code: string, role: AccountRole): void {
  const url = new URL(returnTo, 'http://local')
  url.searchParams.set('oauth_error', code)
  url.searchParams.set('oauth_role', role)
  res.redirect(302, `${url.pathname}${url.search}`)
}

function providerConfig(provider: OAuthProvider): { clientId: string; clientSecret: string } | null {
  if (provider === 'google') {
    const clientId = process.env.PALTO_GOOGLE_OAUTH_CLIENT_ID?.trim()
    const clientSecret = process.env.PALTO_GOOGLE_OAUTH_CLIENT_SECRET?.trim()
    if (!clientId || !clientSecret) return null
    return { clientId, clientSecret }
  }
  const clientId = process.env.PALTO_FACEBOOK_APP_ID?.trim()
  const clientSecret = process.env.PALTO_FACEBOOK_APP_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export function isOAuthProviderConfigured(provider: OAuthProvider): boolean {
  return providerConfig(provider) != null
}

function buildProviderAuthUrl(provider: OAuthProvider, redirectUri: string, state: string): string {
  const cfg = providerConfig(provider)
  if (!cfg) throw new Error('OAUTH_NOT_CONFIGURED')

  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
      state,
    })
    return `${GOOGLE_AUTH_URL}?${params.toString()}`
  }

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'email,public_profile',
    state,
  })
  return `${FACEBOOK_AUTH_URL}?${params.toString()}`
}

async function exchangeGoogleCode(code: string, redirectUri: string): Promise<OAuthUserProfile> {
  const cfg = providerConfig('google')
  if (!cfg) throw new Error('OAUTH_NOT_CONFIGURED')

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const tokenData = (await tokenRes.json().catch(() => null)) as { access_token?: string; error?: string } | null
  if (!tokenRes.ok || !tokenData?.access_token) {
    throw new Error(tokenData?.error || 'GOOGLE_TOKEN_FAILED')
  }

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const user = (await userRes.json().catch(() => null)) as {
    sub?: string
    email?: string
    email_verified?: boolean
    name?: string
    picture?: string
  } | null
  if (!userRes.ok || !user?.sub || !user.email) throw new Error('GOOGLE_PROFILE_FAILED')

  return {
    providerUserId: user.sub,
    email: normalizeEmail(user.email),
    emailVerified: user.email_verified !== false,
    fullName: (user.name ?? '').trim(),
    pictureUrl: typeof user.picture === 'string' && user.picture.trim() ? user.picture.trim() : null,
  }
}

async function exchangeFacebookCode(code: string, redirectUri: string): Promise<OAuthUserProfile> {
  const cfg = providerConfig('facebook')
  if (!cfg) throw new Error('OAUTH_NOT_CONFIGURED')

  const tokenUrl = new URL(FACEBOOK_TOKEN_URL)
  tokenUrl.searchParams.set('client_id', cfg.clientId)
  tokenUrl.searchParams.set('client_secret', cfg.clientSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const tokenRes = await fetch(tokenUrl)
  const tokenData = (await tokenRes.json().catch(() => null)) as {
    access_token?: string
    error?: { message?: string }
  } | null
  if (!tokenRes.ok || !tokenData?.access_token) {
    throw new Error(tokenData?.error?.message || 'FACEBOOK_TOKEN_FAILED')
  }

  const userUrl = new URL(FACEBOOK_USER_URL)
  userUrl.searchParams.set('fields', 'id,email,name,picture.type(large)')
  userUrl.searchParams.set('access_token', tokenData.access_token)

  const userRes = await fetch(userUrl)
  const user = (await userRes.json().catch(() => null)) as {
    id?: string
    email?: string
    name?: string
    picture?: { data?: { url?: string } }
  } | null
  if (!userRes.ok || !user?.id) throw new Error('FACEBOOK_PROFILE_FAILED')
  if (!user.email?.trim()) throw new Error('FACEBOOK_EMAIL_REQUIRED')

  const fbPicture = user.picture?.data?.url?.trim()

  return {
    providerUserId: user.id,
    email: normalizeEmail(user.email),
    emailVerified: true,
    fullName: (user.name ?? '').trim(),
    pictureUrl: fbPicture || null,
  }
}

async function findAccountByOAuth(
  supabase: SupabaseClient,
  provider: OAuthProvider,
  providerUserId: string,
  role: AccountRole
) {
  const { data: identities, error } = await supabase
    .from('app_oauth_identities')
    .select('account_id, provider_email')
    .eq('provider', provider)
    .eq('provider_user_id', providerUserId)

  if (error) throw error
  if (!identities?.length) return null

  const accountIds = identities.map((row) => row.account_id)
  const { data: account, error: accountErr } = await supabase
    .from('app_accounts')
    .select('id,email,full_name,role')
    .in('id', accountIds)
    .eq('role', role)
    .maybeSingle()

  if (accountErr) throw accountErr
  return account
}

async function linkOAuthIdentity(
  supabase: SupabaseClient,
  input: {
    accountId: string
    provider: OAuthProvider
    providerUserId: string
    providerEmail: string
  }
): Promise<void> {
  const { error } = await supabase.from('app_oauth_identities').insert({
    account_id: input.accountId,
    provider: input.provider,
    provider_user_id: input.providerUserId,
    provider_email: input.providerEmail,
    updated_at: new Date().toISOString(),
  })
  if (error && error.code !== '23505') throw error
}

function splitOAuthFullName(fullName: string): { prenom: string; nom: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { prenom: '', nom: '' }
  return { prenom: parts[0] ?? '', nom: parts.slice(1).join(' ') }
}

async function seedClientOAuthProfile(
  supabase: SupabaseClient,
  account: { id: string; email: string },
  profile: OAuthUserProfile,
  provider: OAuthProvider
): Promise<void> {
  const pictureUrl = profile.pictureUrl?.trim()
  if (!pictureUrl) return

  const { prenom, nom } = splitOAuthFullName(profile.fullName)

  const { data: existingRow } = await supabase
    .from('client_profile_data')
    .select('account_snapshot, saved_places')
    .eq('account_id', account.id)
    .maybeSingle()

  const existingAccount = sanitizeAccountSnapshot(existingRow?.account_snapshot ?? {})
  const existingPlaces = sanitizeSavedPlacesSnapshot(existingRow?.saved_places ?? {})

  const account_snapshot = mergeAccountSnapshots(existingAccount, {
    prenom: prenom || existingAccount.prenom,
    nom: nom || existingAccount.nom,
    email: account.email,
    profilePhotoUrl: pictureUrl,
    profilePhotoName: provider,
  })

  const { error } = await supabase.from('client_profile_data').upsert(
    {
      account_id: account.id,
      account_snapshot,
      saved_places: existingPlaces,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'account_id' }
  )
  if (error) console.warn('[oauth] client_profile_data upsert', error)
}

async function ensureClientRow(
  supabase: SupabaseClient,
  email: string,
  fullName: string,
  phone: string | null
): Promise<void> {
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
    return
  }

  const { error: clientErr } = await supabase.from('clients').insert({
    full_name: fullName,
    phone,
    email,
  })
  if (clientErr) console.warn('[oauth] clients insert', clientErr)
}

async function createOAuthClientAccount(
  supabase: SupabaseClient,
  profile: OAuthUserProfile
): Promise<{ id: string; email: string; full_name: string | null }> {
  const fullName = profile.fullName || profile.email.split('@')[0] || 'Passager'
  const { data, error } = await supabase
    .from('app_accounts')
    .insert({
      email: profile.email,
      role: 'client',
      password_hash: null,
      full_name: fullName,
      phone: null,
    })
    .select('id,email,full_name')
    .single()

  if (error || !data) {
    if (error?.code === '23505') throw new Error('EMAIL_EXISTS')
    throw error ?? new Error('CLIENT_CREATE_FAILED')
  }

  await ensureClientRow(supabase, profile.email, fullName, null)
  return data
}

async function resolveOrCreateOAuthAccount(
  supabase: SupabaseClient,
  provider: OAuthProvider,
  role: AccountRole,
  profile: OAuthUserProfile
): Promise<{ id: string; email: string; full_name: string | null }> {
  const linked = await findAccountByOAuth(supabase, provider, profile.providerUserId, role)
  if (linked) return linked

  const { data: emailAccount, error: emailErr } = await supabase
    .from('app_accounts')
    .select('id,email,full_name,role')
    .eq('email', profile.email)
    .eq('role', role)
    .maybeSingle()

  if (emailErr) throw emailErr

  if (emailAccount) {
    if (!profile.emailVerified) throw new Error('EMAIL_NOT_VERIFIED')
    await linkOAuthIdentity(supabase, {
      accountId: emailAccount.id,
      provider,
      providerUserId: profile.providerUserId,
      providerEmail: profile.email,
    })
    return emailAccount
  }

  if (role === 'chauffeur') {
    throw new Error('CHAUFFEUR_ACCOUNT_REQUIRED')
  }

  return createOAuthClientAccount(supabase, profile)
}

async function createOAuthExchangeSession(
  supabase: SupabaseClient,
  input: { accountId: string; email: string; role: AccountRole }
): Promise<string> {
  const exchangeToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + OAUTH_EXCHANGE_TTL_MS).toISOString()
  const { error } = await supabase.from('app_sessions').insert({
    token: exchangeToken,
    account_id: input.accountId,
    email: normalizeEmail(input.email),
    role: input.role,
    expires_at: expiresAt,
  })
  if (error) throw error
  return exchangeToken
}

export async function handleOAuthStart(req: VercelRequest, res: VercelResponse): Promise<void> {
  const providerRaw = Array.isArray(req.query.provider) ? req.query.provider[0] : req.query.provider
  const roleRaw = Array.isArray(req.query.role) ? req.query.role[0] : req.query.role
  const returnToRaw = Array.isArray(req.query.returnTo) ? req.query.returnTo[0] : req.query.returnTo

  const provider = typeof providerRaw === 'string' ? providerRaw.trim().toLowerCase() : ''
  const role = typeof roleRaw === 'string' ? roleRaw.trim().toLowerCase() : ''
  if (provider !== 'google' && provider !== 'facebook') {
    res.status(400).json({ error: 'Provider invalide' })
    return
  }
  if (role !== 'client' && role !== 'chauffeur') {
    res.status(400).json({ error: 'Role invalide' })
    return
  }
  if (!isOAuthProviderConfigured(provider)) {
    res.status(503).json({ error: 'OAUTH_NOT_CONFIGURED' })
    return
  }

  const baseUrl = appBaseUrlFromRequest(req)
  const returnTo = sanitizeReturnTo(typeof returnToRaw === 'string' ? returnToRaw : undefined, baseUrl, role)
  const state = signOAuthState({
    role,
    provider,
    returnTo,
    nonce: randomBytes(16).toString('hex'),
    exp: Date.now() + STATE_TTL_MS,
  })

  const redirectUri = oauthCallbackUrl(baseUrl, provider)
  try {
    const authUrl = buildProviderAuthUrl(provider, redirectUri, state)
    res.redirect(302, authUrl)
  } catch {
    res.status(503).json({ error: 'OAUTH_NOT_CONFIGURED' })
  }
}

export async function handleOAuthCallback(req: VercelRequest, res: VercelResponse): Promise<void> {
  const providerRaw = Array.isArray(req.query.provider) ? req.query.provider[0] : req.query.provider
  const provider = typeof providerRaw === 'string' ? providerRaw.trim().toLowerCase() : ''
  if (provider !== 'google' && provider !== 'facebook') {
    res.status(400).send('Provider invalide')
    return
  }

  const oauthError = Array.isArray(req.query.error) ? req.query.error[0] : req.query.error
  const stateRaw = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state
  const codeRaw = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code

  const state = typeof stateRaw === 'string' ? parseOAuthState(stateRaw) : null
  const returnTo = state?.returnTo ?? (state?.role === 'chauffeur' ? '/fr/dashboard' : '/fr/compte')
  const role = state?.role ?? 'client'

  if (oauthError) {
    redirectOAuthError(res, returnTo, 'OAUTH_DENIED', role)
    return
  }
  if (!state || state.provider !== provider) {
    redirectOAuthError(res, returnTo, 'OAUTH_STATE_INVALID', role)
    return
  }
  if (typeof codeRaw !== 'string' || !codeRaw.trim()) {
    redirectOAuthError(res, returnTo, 'OAUTH_CODE_MISSING', role)
    return
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch {
    redirectOAuthError(res, returnTo, 'SERVICE_UNAVAILABLE', role)
    return
  }

  const baseUrl = appBaseUrlFromRequest(req)
  const redirectUri = oauthCallbackUrl(baseUrl, provider)

  let profile: OAuthUserProfile
  try {
    profile =
      provider === 'google'
        ? await exchangeGoogleCode(codeRaw.trim(), redirectUri)
        : await exchangeFacebookCode(codeRaw.trim(), redirectUri)
  } catch (error) {
    console.error('[oauth/callback] exchange', error)
    redirectOAuthError(res, returnTo, 'OAUTH_EXCHANGE_FAILED', role)
    return
  }

  let account: { id: string; email: string; full_name: string | null }
  try {
    account = await resolveOrCreateOAuthAccount(supabase, provider, state.role, profile)
    await linkOAuthIdentity(supabase, {
      accountId: account.id,
      provider,
      providerUserId: profile.providerUserId,
      providerEmail: profile.email,
    })
    if (state.role === 'client') {
      await seedClientOAuthProfile(supabase, account, profile, provider)
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : 'OAUTH_ACCOUNT_FAILED'
    console.error('[oauth/callback] account', error)
    redirectOAuthError(res, returnTo, code, role)
    return
  }

  let exchangeToken: string
  try {
    exchangeToken = await createOAuthExchangeSession(supabase, {
      accountId: account.id,
      email: account.email,
      role: state.role,
    })
  } catch (error) {
    console.error('[oauth/callback] exchange session', error)
    redirectOAuthError(res, returnTo, 'OAUTH_SESSION_FAILED', role)
    return
  }

  const url = new URL(returnTo, 'http://local')
  url.searchParams.set('oauth_exchange', exchangeToken)
  url.searchParams.set('oauth_role', state.role)
  res.redirect(302, `${url.pathname}${url.search}`)
}

export async function handleOAuthExchange(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body =
    typeof req.body === 'string'
      ? (() => {
          try {
            return JSON.parse(req.body) as unknown
          } catch {
            return null
          }
        })()
      : req.body

  const exchange =
    body && typeof body === 'object' && 'exchange' in body && typeof (body as { exchange: unknown }).exchange === 'string'
      ? (body as { exchange: string }).exchange.trim()
      : ''
  const roleRaw =
    body && typeof body === 'object' && 'role' in body && typeof (body as { role: unknown }).role === 'string'
      ? (body as { role: string }).role.trim().toLowerCase()
      : ''

  if (!exchange || (roleRaw !== 'client' && roleRaw !== 'chauffeur')) {
    res.status(400).json({ success: false, error: 'Payload invalide' })
    return
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch {
    res.status(503).json({ success: false, error: 'Service indisponible' })
    return
  }

  const { data: session, error: sessionErr } = await supabase
    .from('app_sessions')
    .select('token,account_id,email,role,expires_at')
    .eq('token', exchange)
    .maybeSingle()

  if (sessionErr) {
    console.error('[oauth/exchange] session read', sessionErr)
    res.status(500).json({ success: false, error: 'Verification impossible' })
    return
  }
  if (!session || session.role !== roleRaw) {
    res.status(401).json({ success: false, error: 'Echange invalide ou expire' })
    return
  }

  const expiresAtMs = Date.parse(session.expires_at)
  if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
    await supabase.from('app_sessions').delete().eq('token', exchange)
    res.status(401).json({ success: false, error: 'Echange invalide ou expire' })
    return
  }

  const { data: account, error: accountErr } = await supabase
    .from('app_accounts')
    .select('id,email,full_name,role')
    .eq('id', session.account_id)
    .eq('role', roleRaw)
    .maybeSingle()

  if (accountErr || !account) {
    res.status(401).json({ success: false, error: 'Compte introuvable' })
    return
  }

  await supabase.from('app_sessions').delete().eq('token', exchange)

  const token = await createAccountSession(supabase, {
    accountId: account.id,
    email: account.email,
    role: roleRaw,
  })

  const displayName =
    (account.full_name ?? '').trim() ||
    account.email.split('@')[0] ||
    (roleRaw === 'chauffeur' ? 'Chauffeur' : 'Passager')

  let profilePhotoUrl: string | null = null
  if (roleRaw === 'client') {
    const { data: profRow } = await supabase
      .from('client_profile_data')
      .select('account_snapshot')
      .eq('account_id', account.id)
      .maybeSingle()
    const snap = sanitizeAccountSnapshot(profRow?.account_snapshot ?? {})
    profilePhotoUrl =
      typeof snap.profilePhotoUrl === 'string' && snap.profilePhotoUrl.trim()
        ? snap.profilePhotoUrl.trim()
        : null
  }

  res.status(200).json({
    success: true,
    token,
    user: { email: account.email, displayName, profilePhotoUrl },
  })
}

export async function handleOAuthProviders(req: VercelRequest, res: VercelResponse): Promise<void> {
  const baseUrl = appBaseUrlFromRequest(req)
  res.status(200).json({
    google: isOAuthProviderConfigured('google'),
    facebook: isOAuthProviderConfigured('facebook'),
    /** URI exacte à copier dans Google / Meta (Authorized redirect URIs). */
    redirectUris: {
      google: oauthCallbackUrl(baseUrl, 'google'),
      facebook: oauthCallbackUrl(baseUrl, 'facebook'),
    },
    appBaseUrl: baseUrl,
  })
}
