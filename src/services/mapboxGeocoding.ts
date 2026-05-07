/** Résultat du géocodage forward (OpenStreetMap). */
import { apiBaseUrl } from '../constants/featureFlags'

export type GeocodeCoordinates = {
  longitude: number
  latitude: number
}

export type GeocodeSuggestion = {
  label: string
  longitude: number
  latitude: number
}

function extractPostalCode(value: string): string | null {
  const m = value.match(/\b(\d{5})\b/)
  return m?.[1] ?? null
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

/**
 * Résout une adresse ou un lieu en coordonnées via Nominatim (OpenStreetMap).
 */
export async function geocodeForward(
  query: string,
  _accessToken?: string,
  options?: { language?: 'fr' | 'en'; proximity?: [number, number]; bbox?: string }
): Promise<GeocodeCoordinates | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const fetchCandidate = async (q: string, bounded: boolean): Promise<GeocodeCoordinates | null> => {
    const params = new URLSearchParams({
      q,
      format: 'jsonv2',
      limit: '1',
      'accept-language': options?.language ?? 'fr',
    })
    if (bounded && options?.bbox) {
      // Nominatim utilise: left,top,right,bottom
      const [left, bottom, right, top] = options.bbox.split(',').map((v) => v.trim())
      if (left && bottom && right && top) {
        params.set('viewbox', `${left},${top},${right},${bottom}`)
        params.set('bounded', '1')
      }
    }
    params.set('mode', 'search')
    const url = `${apiBaseUrl()}/geocode?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) return null

    const data = (await res.json()) as Array<{ lon?: string; lat?: string }>
    const first = data?.[0]
    const lon = first?.lon ? Number.parseFloat(first.lon) : Number.NaN
    const lat = first?.lat ? Number.parseFloat(first.lat) : Number.NaN
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
    return { longitude: lon, latitude: lat }
  }

  const qWithReunion = /reunion|réunion/i.test(trimmed) ? trimmed : `${trimmed}, La Reunion`
  const attempts: Array<[string, boolean]> = [
    [trimmed, true],
    [qWithReunion, true],
    [qWithReunion, false],
    [trimmed, false],
  ]
  for (const [q, bounded] of attempts) {
    const candidate = await fetchCandidate(q, bounded)
    if (candidate) return candidate
  }
  return null
}

/**
 * Retourne une liste de suggestions d’adresses via Nominatim (OpenStreetMap).
 */
export async function geocodeForwardSuggestions(
  query: string,
  _accessToken?: string,
  options?: {
    language?: 'fr' | 'en'
    proximity?: [number, number]
    bbox?: string
    limit?: number
  }
): Promise<GeocodeSuggestion[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const queryTokens = tokenize(trimmed)
  const queryPostalCode = extractPostalCode(trimmed)

  const parse = (data: Array<{ display_name?: string; lon?: string; lat?: string }>): GeocodeSuggestion[] =>
    data
      .map((f) => {
        const placeName = typeof f.display_name === 'string' ? f.display_name.trim() : ''
        const lon = f.lon ? Number.parseFloat(f.lon) : Number.NaN
        const lat = f.lat ? Number.parseFloat(f.lat) : Number.NaN
        if (!Number.isFinite(lon) || !Number.isFinite(lat) || !placeName) return null
        return { label: placeName, longitude: lon, latitude: lat }
      })
      .filter((v): v is GeocodeSuggestion => v !== null)

  const fetchList = async (q: string, bounded: boolean): Promise<GeocodeSuggestion[]> => {
    const params = new URLSearchParams({
      q,
      format: 'jsonv2',
      addressdetails: '0',
      limit: String(options?.limit ?? 5),
      'accept-language': options?.language ?? 'fr',
    })
    if (bounded && options?.bbox) {
      const [left, bottom, right, top] = options.bbox.split(',').map((v) => v.trim())
      if (left && bottom && right && top) {
        params.set('viewbox', `${left},${top},${right},${bottom}`)
        params.set('bounded', '1')
      }
    }
    params.set('mode', 'search')
    const url = `${apiBaseUrl()}/geocode?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = (await res.json()) as Array<{ display_name?: string; lon?: string; lat?: string }>
    return parse(data)
  }

  const qWithReunion = /reunion|réunion/i.test(trimmed) ? trimmed : `${trimmed}, La Reunion`
  const tries: Array<[string, boolean]> = [
    [trimmed, true],
    [qWithReunion, true],
    [trimmed, false],
    [qWithReunion, false],
  ]

  const merged = new Map<string, GeocodeSuggestion>()
  for (const [q, bounded] of tries) {
    const out = await fetchList(q, bounded)
    for (const item of out) {
      const key = `${item.label.toLowerCase()}|${item.longitude.toFixed(6)}|${item.latitude.toFixed(6)}`
      if (!merged.has(key)) merged.set(key, item)
    }
  }

  if (merged.size === 0) return []

  const scoreSuggestion = (s: GeocodeSuggestion): number => {
    const labelNorm = s.label.toLowerCase()
    const labelTokens = tokenize(s.label)
    let score = 0
    if (queryPostalCode) {
      const labelPostalCode = extractPostalCode(s.label)
      if (labelPostalCode === queryPostalCode) score += 100
      else score -= 20
    }
    for (const tok of queryTokens) {
      if (labelTokens.includes(tok)) score += 6
      else if (labelNorm.includes(tok)) score += 2
      else score -= 1
    }
    return score
  }

  return [...merged.values()]
    .sort((a, b) => scoreSuggestion(b) - scoreSuggestion(a))
    .slice(0, options?.limit ?? 5)
}

/**
 * Adresse lisible à partir de coordonnées (géocodage inverse Nominatim OSM).
 */
export async function geocodeReverse(
  longitude: number,
  latitude: number,
  _accessToken?: string,
  options?: { language?: 'fr' | 'en' }
): Promise<string | null> {
  const params = new URLSearchParams({
    lon: String(longitude),
    lat: String(latitude),
    format: 'jsonv2',
    'accept-language': options?.language ?? 'fr',
  })
  params.set('mode', 'reverse')
  const url = `${apiBaseUrl()}/geocode?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) return null

  const data = (await res.json()) as { display_name?: string }
  const name = data?.display_name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}
