import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'
import { getPaltoAppSessionByToken } from '../../server/lib/paltoAppSession.js'
import {
  accountSnapshotHasContent,
  sanitizeAccountSnapshot,
  sanitizeSavedPlacesSnapshot,
  savedPlacesSnapshotHasContent,
} from '../../server/lib/clientProfileSanitize.js'
import { mergeAccountSnapshots, mergeSavedPlacesSnapshots } from '../../server/lib/clientProfileMerge.js'

const PutBodySchema = z.object({
  account: z.unknown().optional(),
  savedPlaces: z.unknown().optional(),
})

function readBearerToken(req: VercelRequest): string | null {
  const raw = req.headers.authorization
  if (!raw?.toLowerCase().startsWith('bearer ')) return null
  const token = raw.slice(7).trim()
  return token || null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const token = readBearerToken(req)
  if (!token) {
    res.status(401).json({ error: 'Non autorise' })
    return
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    console.error('[client/profile]', e)
    res.status(503).json({ error: 'Service indisponible' })
    return
  }

  const session = await getPaltoAppSessionByToken(supabase, token)
  if (!session) {
    res.status(401).json({ error: 'Non autorise' })
    return
  }

  if (session.role !== 'client') {
    res.status(403).json({ error: 'Token chauffeur non utilisable pour le profil client' })
    return
  }
  const clientAccountId = session.accountId

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('client_profile_data')
      .select('account_snapshot, saved_places, updated_at')
      .eq('account_id', clientAccountId)
      .maybeSingle()

    if (error) {
      console.error('[client/profile] GET failed', error)
      res.status(500).json({ error: 'Lecture profil impossible' })
      return
    }

    const account = sanitizeAccountSnapshot(data?.account_snapshot ?? {})
    const savedPlaces = sanitizeSavedPlacesSnapshot(data?.saved_places ?? {})
    res.status(200).json({
      account,
      savedPlaces,
      updatedAt: data?.updated_at ?? null,
      hasAccount: accountSnapshotHasContent(account),
      hasSavedPlaces: savedPlacesSnapshotHasContent(savedPlaces),
    })
    return
  }

  let body: unknown = req.body
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body)
    } catch {
      res.status(400).json({ error: 'Payload JSON invalide' })
      return
    }
  }
  const parsed = PutBodySchema.safeParse(body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })
    return
  }

  const incomingAccount = sanitizeAccountSnapshot(parsed.data.account ?? {})
  const incomingPlaces = sanitizeSavedPlacesSnapshot(parsed.data.savedPlaces ?? {})

  const { data: existingRow } = await supabase
    .from('client_profile_data')
    .select('account_snapshot, saved_places')
    .eq('account_id', clientAccountId)
    .maybeSingle()

  const existingAccount = sanitizeAccountSnapshot(existingRow?.account_snapshot ?? {})
  const existingPlaces = sanitizeSavedPlacesSnapshot(existingRow?.saved_places ?? {})

  const account = mergeAccountSnapshots(existingAccount, incomingAccount)
  const savedPlaces = mergeSavedPlacesSnapshots(existingPlaces, incomingPlaces)

  if (!accountSnapshotHasContent(account) && !savedPlacesSnapshotHasContent(savedPlaces)) {
    res.status(400).json({ error: 'Rien a enregistrer' })
    return
  }

  const emailNorm = session.email
  const accountWithEmail = {
    ...account,
    email: (account.email && String(account.email).trim()) || emailNorm,
  }

  const { data, error } = await supabase
    .from('client_profile_data')
    .upsert(
      {
        account_id: clientAccountId,
        account_snapshot: accountWithEmail,
        saved_places: savedPlaces,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id' }
    )
    .select('updated_at')
    .single()

  if (error || !data) {
    console.error('[client/profile] PUT failed', error)
    res.status(500).json({ error: 'Enregistrement profil impossible' })
    return
  }

  res.status(200).json({
    ok: true,
    updatedAt: data.updated_at,
  })
}
