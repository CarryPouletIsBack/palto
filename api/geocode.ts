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
    .filter((v): v is { display_name: string; lon: string; lat: string } => v !== null)
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

/** Codes postaux DROM (dont 974xx La Réunion) pour filtrer la BAN. */
const RE_FR_OVERSEAS_POSTCODE = /\b(97[0-8]\d{3}|98\d{3})\b/

function extractOverseasPostcode(q: string): string | null {
  const m = q.match(RE_FR_OVERSEAS_POSTCODE)
  return m ? m[1] : null
}

/** Centre approximatif La Réunion — tri par proximité côté API adresse. */
const REUNION_BIAS_LON = '55.536384'
const REUNION_BIAS_LAT = '-21.115141'

type GeocodeSearchRow = { display_name: string; lon: string; lat: string }

function normalizeAscii(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function cleanDisplayName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\bfrance\b/gi, '')
    .replace(/\bla reunion\b/gi, '')
    .replace(/\breunion\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function addressTokenSignature(label: string): string {
  const tokens = normalizeAscii(label)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
  return [...new Set(tokens)].sort().join('|')
}

function haversineMeters(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * Base Adresse Nationale — meilleure précision numéro + voie (France / DROM dont 974).
 * https://adresse.data.gouv.fr/api-doc/adresse
 */
async function searchWithBan(q: string, maxNeeded: number): Promise<GeocodeSearchRow[]> {
  const trimmed = q.trim()
  if (!trimmed) return []
  const postcode = extractOverseasPostcode(trimmed)
  const params = new URLSearchParams({
    q: trimmed,
    limit: String(Math.min(20, Math.max(maxNeeded * 3, 8))),
    autocomplete: '1',
    lon: REUNION_BIAS_LON,
    lat: REUNION_BIAS_LAT,
  })
  if (postcode) params.set('postcode', postcode)

  let upstream: Response
  try {
    upstream = await fetch(`https://api-adresse.data.gouv.fr/search/?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'palto/1.0 (https://palto-six.vercel.app)',
      },
    })
  } catch {
    return []
  }
  if (!upstream.ok) return []

  const payload = (await upstream.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] }
      properties?: { label?: string; score?: number }
    }>
  }

  const scored: Array<GeocodeSearchRow & { _score: number }> = []
  for (const f of payload.features ?? []) {
    const coords = f.geometry?.coordinates
    const label = typeof f.properties?.label === 'string' ? f.properties.label.trim() : ''
    if (!coords || coords.length < 2 || !label) continue
    const [lon, lat] = coords
    if (!isInsideReunion(lon, lat)) continue
    scored.push({
      display_name: label,
      lon: String(lon),
      lat: String(lat),
      _score: typeof f.properties?.score === 'number' ? f.properties.score : 0,
    })
  }
  scored.sort((a, b) => b._score - a._score)
  return scored.map(({ display_name, lon, lat }) => ({ display_name, lon, lat })).slice(0, maxNeeded)
}

function mergeBanAndNominatim(ban: GeocodeSearchRow[], nomi: GeocodeSearchRow[], limit: number): GeocodeSearchRow[] {
  const out: GeocodeSearchRow[] = []
  const seenCoordAndLabel = new Set<string>()
  const seenAddressSignature = new Set<string>()

  for (const raw of ban) {
    if (out.length >= limit) break
    const row = { ...raw, display_name: cleanDisplayName(raw.display_name) }
    if (!row.display_name) continue
    const key = `${row.lon}|${row.lat}|${normalizeAscii(row.display_name)}`
    const signature = addressTokenSignature(row.display_name)
    if (seenCoordAndLabel.has(key) || seenAddressSignature.has(signature)) continue
    seenCoordAndLabel.add(key)
    seenAddressSignature.add(signature)
    out.push(row)
  }

  for (const raw of nomi) {
    if (out.length >= limit) break
    const row = { ...raw, display_name: cleanDisplayName(raw.display_name) }
    if (!row.display_name) continue
    const lon = Number.parseFloat(row.lon)
    const lat = Number.parseFloat(row.lat)
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
    const key = `${row.lon}|${row.lat}|${normalizeAscii(row.display_name)}`
    const signature = addressTokenSignature(row.display_name)
    if (seenCoordAndLabel.has(key) || seenAddressSignature.has(signature)) continue
    const near = out.some((b) => haversineMeters(lon, lat, Number.parseFloat(b.lon), Number.parseFloat(b.lat)) < 35)
    if (near) continue
    seenCoordAndLabel.add(key)
    seenAddressSignature.add(signature)
    out.push(row)
  }
  return out
}

async function reverseWithBan(lon: string, lat: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/reverse/?lon=${encodeURIComponent(lon)}&lat=${encodeURIComponent(lat)}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'palto/1.0 (https://palto-six.vercel.app)',
        },
      }
    )
    if (!res.ok) return null
    const payload = (await res.json()) as {
      features?: Array<{ properties?: { label?: string } }>
    }
    const label = payload.features?.[0]?.properties?.label
    return typeof label === 'string' && label.trim() ? label.trim() : null
  } catch {
    return null
  }
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

      const { q, language = 'fr', limit = 5, addressdetails = '0' } = parsed.data
      const cap = Math.min(limit, 10)

      const banRows = await searchWithBan(q, cap)

      const safeViewbox = toSafeViewbox(parsed.data.viewbox) ?? REUNION_VIEWBOX
      const useBounded = parsed.data.bounded !== '0'

      const params = new URLSearchParams({
        q,
        format: 'jsonv2',
        limit: String(Math.min(10, cap * 2)),
        'accept-language': language,
        addressdetails,
        email: 'contact@palto.fr',
      })
      if (useBounded) {
        params.set('viewbox', safeViewbox)
        params.set('bounded', '1')
      } else {
        params.set('countrycodes', 'fr')
      }

      let nomiRows: GeocodeSearchRow[] = []
      const upstream = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: nominatimHeaders(),
      })
      if (upstream.ok) {
        const payload = (await upstream.json()) as Array<{ display_name?: string; lon?: string; lat?: string }>
        nomiRows = payload
          .filter(
            (row) =>
              row.display_name?.trim() &&
              row.lon &&
              row.lat &&
              isInsideReunion(row.lon, row.lat)
          )
          .map((row) => ({
            display_name: row.display_name!.trim(),
            lon: row.lon!,
            lat: row.lat!,
          }))
      } else {
        console.warn('[geocode] upstream search non-ok', upstream.status)
      }

      let merged = mergeBanAndNominatim(banRows, nomiRows, cap)

      if (merged.length === 0) {
        const fallback = await searchWithPhoton(q, language, cap)
        merged = fallback
          .filter((row) => isInsideReunion(row.lon, row.lat) && row.display_name)
          .map((row) => ({
            display_name: row.display_name!.trim(),
            lon: String(row.lon),
            lat: String(row.lat),
          }))
      }

      return res.status(200).json(merged)
    }

    if (mode === 'reverse') {
      const parsed = ReverseQuerySchema.safeParse(req.query)
      if (!parsed.success) return res.status(400).json({ error: 'Query invalide' })

      const { lon, lat, language = 'fr' } = parsed.data
      if (!isInsideReunion(lon, lat)) return res.status(200).json({ display_name: '' })

      const banLabel = await reverseWithBan(lon, lat)
      if (banLabel) return res.status(200).json({ display_name: banLabel })

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
        const fallback = await reverseFallback()
        return res.status(200).json(fallback)
      }
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
