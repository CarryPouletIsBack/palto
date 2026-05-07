import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

// left,top,right,bottom (Nominatim viewbox format)
const REUNION_VIEWBOX = '55.18,-20.85,55.92,-21.39'
const REUNION_BOUNDS = {
  minLon: 55.18,
  maxLon: 55.92,
  minLat: -21.39,
  maxLat: -20.85,
}

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

async function searchWithPhoton(
  q: string,
  language: 'fr' | 'en',
  limit: number
): Promise<Array<{ display_name?: string; lon?: string; lat?: string }>> {
  const params = new URLSearchParams({
    q,
    lang: language,
    limit: String(limit),
  })
  const upstream = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!upstream.ok) return []
  const payload = (await upstream.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] }
      properties?: { name?: string; city?: string; country?: string }
    }>
  }
  return (payload.features ?? [])
    .map((f) => {
      const coords = f.geometry?.coordinates
      const lon = coords?.[0]
      const lat = coords?.[1]
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
      const p = f.properties ?? {}
      const label = [p.name, p.city, p.country].filter(Boolean).join(', ')
      return {
        display_name: label || `${lat}, ${lon}`,
        lon: String(lon),
        lat: String(lat),
      }
    })
    .filter((v): v is { display_name?: string; lon?: string; lat?: string } => v !== null)
}

async function reverseWithPhoton(
  lon: string,
  lat: string,
  language: 'fr' | 'en'
): Promise<{ display_name?: string } | null> {
  const params = new URLSearchParams({
    lon,
    lat,
    lang: language,
  })
  const upstream = await fetch(`https://photon.komoot.io/reverse?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!upstream.ok) return null
  const payload = (await upstream.json()) as {
    features?: Array<{ properties?: { name?: string; city?: string; country?: string } }>
  }
  const first = payload.features?.[0]?.properties
  if (!first) return null
  const label = [first.name, first.city, first.country].filter(Boolean).join(', ')
  return { display_name: label || '' }
}

function toSafeViewbox(raw: string | undefined): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value) return null
  // Format attendu: left,top,right,bottom
  if (!/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(value)) return null
  return value
}

function isInsideReunion(lonRaw: string | number | undefined, latRaw: string | number | undefined): boolean {
  const lon = typeof lonRaw === 'number' ? lonRaw : Number.parseFloat(String(lonRaw ?? ''))
  const lat = typeof latRaw === 'number' ? latRaw : Number.parseFloat(String(latRaw ?? ''))
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false
  return (
    lon >= REUNION_BOUNDS.minLon &&
    lon <= REUNION_BOUNDS.maxLon &&
    lat >= REUNION_BOUNDS.minLat &&
    lat <= REUNION_BOUNDS.maxLat
  )
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
      const safeViewbox = toSafeViewbox(parsed.data.viewbox) ?? REUNION_VIEWBOX
      params.set('viewbox', safeViewbox)
      params.set('bounded', '1')
      params.set('email', 'contact@palto.fr')
      const upstream = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: nominatimHeaders(),
      })
      if (!upstream.ok) {
        console.warn('[geocode] upstream search non-ok', upstream.status)
        const fallback = await searchWithPhoton(q, language, limit)
        return res.status(200).json(fallback.filter((row) => isInsideReunion(row.lon, row.lat)))
      }
      const payload = (await upstream.json()) as Array<{ display_name?: string; lon?: string; lat?: string }>
      return res.status(200).json(payload.filter((row) => isInsideReunion(row.lon, row.lat)))
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
        email: 'contact@palto.fr',
      })
      const upstream = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: nominatimHeaders(),
      })
      const reverseFallback = async () => {
        const fallbackReverse = await reverseWithPhoton(lon, lat, language)
        if (fallbackReverse?.display_name?.trim()) return fallbackReverse
        const fallbackSearch = await searchWithPhoton(`${lat},${lon}`, language, 1)
        const first = fallbackSearch[0]
        return { display_name: first?.display_name ?? '' }
      }
      if (!upstream.ok) {
        console.warn('[geocode] upstream reverse non-ok', upstream.status)
        if (!isInsideReunion(lon, lat)) return res.status(200).json({ display_name: '' })
        const fallback = await reverseFallback()
        return res.status(200).json(fallback)
      }
      if (!isInsideReunion(lon, lat)) return res.status(200).json({ display_name: '' })
      const payload = (await upstream.json()) as { display_name?: string }
      if (!payload.display_name?.trim()) {
        const fallback = await reverseFallback()
        return res.status(200).json(fallback)
      }
      return res.status(200).json(payload)
    }

    return res.status(400).json({ error: 'mode requis (search|reverse)' })
  } catch (error) {
    console.error('[geocode]', error)
    return res.status(500).json({ error: 'Geocoding indisponible' })
  }
}
