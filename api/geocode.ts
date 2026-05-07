import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const SearchQuerySchema = z.object({
  mode: z.literal('search'),
  q: z.string().min(1),
  language: z.enum(['fr', 'en']).optional(),
  limit: z.coerce.number().int().min(1).max(10).optional(),
  viewbox: z.string().optional(),
  bounded: z.union([z.literal('0'), z.literal('1')]).optional(),
  addressdetails: z.union([z.literal('0'), z.literal('1')]).optional(),
})

const ReverseQuerySchema = z.object({
  mode: z.literal('reverse'),
  lon: z.string().min(1),
  lat: z.string().min(1),
  language: z.enum(['fr', 'en']).optional(),
})

function nominatimHeaders() {
  return {
    Accept: 'application/json',
    'Accept-Language': 'fr,en;q=0.8',
    // Nominatim demande un user-agent explicite pour identifier l'application.
    'User-Agent': 'palto/1.0 (https://palto-six.vercel.app)',
  }
}

function toSafeViewbox(raw: string | undefined): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value) return null
  // Format attendu: left,top,right,bottom
  if (!/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(value)) return null
  return value
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const modeRaw = Array.isArray(req.query.mode) ? req.query.mode[0] : req.query.mode
  const mode = typeof modeRaw === 'string' ? modeRaw : ''

  try {
    if (mode === 'search') {
      const parsed = SearchQuerySchema.safeParse(req.query)
      if (!parsed.success) return res.status(400).json({ error: 'Query invalide' })

      const { q, language = 'fr', limit = 5, bounded = '0', addressdetails = '0' } = parsed.data
      const params = new URLSearchParams({
        q,
        format: 'jsonv2',
        limit: String(limit),
        'accept-language': language,
        addressdetails,
      })
      const safeViewbox = toSafeViewbox(parsed.data.viewbox)
      if (bounded === '1' && safeViewbox) {
        params.set('viewbox', safeViewbox)
        params.set('bounded', '1')
      }
      const upstream = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: nominatimHeaders(),
      })
      if (!upstream.ok) {
        console.warn('[geocode] upstream search non-ok', upstream.status)
        // Ne pas casser l'UI avec un 502: on renvoie une liste vide.
        return res.status(200).json([])
      }
      const payload = await upstream.json()
      return res.status(200).json(payload)
    }

    if (mode === 'reverse') {
      const parsed = ReverseQuerySchema.safeParse(req.query)
      if (!parsed.success) return res.status(400).json({ error: 'Query invalide' })

      const { lon, lat, language = 'fr' } = parsed.data
      const params = new URLSearchParams({
        lon,
        lat,
        format: 'jsonv2',
        'accept-language': language,
      })
      const upstream = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: nominatimHeaders(),
      })
      if (!upstream.ok) {
        console.warn('[geocode] upstream reverse non-ok', upstream.status)
        // Fallback non bloquant côté client.
        return res.status(200).json({ display_name: '' })
      }
      const payload = await upstream.json()
      return res.status(200).json(payload)
    }

    return res.status(400).json({ error: 'mode requis (search|reverse)' })
  } catch (error) {
    console.error('[geocode]', error)
    return res.status(500).json({ error: 'Geocoding indisponible' })
  }
}
