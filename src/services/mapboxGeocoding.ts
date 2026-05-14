/** Résultat du géocodage forward (OpenStreetMap). */
import { apiBaseUrl, isGeocodeHttpProxyAvailable } from '../constants/featureFlags'
import { isLngLatInsideReunionIsland, REUNION_ISLAND_BBOX } from '../constants/reunionIsland'

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

function normCompactAlphaNum(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/** Partie « voie + n° » de la requête : tout avant un code postal 97xxx éventuel. */
function queryStreetCompactFromNorm(queryNorm: string): string {
  const head = queryNorm.replace(/\b97\d{3}\b.*$/i, '').trim()
  return normCompactAlphaNum(head)
}

/** Partie voie du libellé BAN/OSM : avant le premier 97xxx. */
function labelStreetCompactFromNorm(labelNorm: string): string {
  const head = labelNorm.split(/\b97\d{3}\b/i)[0] ?? labelNorm
  return normCompactAlphaNum(head)
}

/** Alignement requête → libellé sur la tête de voie (évite « da » → Saint-Denis). */
function streetHeadAlignmentScore(queryCompact: string, labelStreetCompact: string): number {
  if (!queryCompact || queryCompact.length < 2) return 0
  if (!labelStreetCompact) return 0
  if (labelStreetCompact.startsWith(queryCompact)) {
    return 140 + Math.min(queryCompact.length, 24) * 5
  }
  let i = 0
  const n = Math.min(queryCompact.length, labelStreetCompact.length)
  while (i < n && queryCompact[i] === labelStreetCompact[i]) i += 1
  return i * 8
}

function haversineDistanceKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * Si la BAN est injoignable (blocage réseau, `ERR_CONNECTION_REFUSED`, etc.), on arrête de l’appeler
 * pour ne pas saturer la console — Nominatim reste utilisé. Réinitialisé au rechargement ; rouvert si une requête BAN réussit.
 */
let banGeocodeClientCircuitOpen = false

function markBanGeocodeClientUnreachable(): void {
  banGeocodeClientCircuitOpen = true
}

function markBanGeocodeClientReachable(): void {
  banGeocodeClientCircuitOpen = false
}

/**
 * Recherche BAN depuis le navigateur (CORS ouverte) — repli si `/api/geocode` est indisponible ou renvoie vide.
 */
async function searchBanClientSuggestions(
  query: string,
  limit: number,
  signal?: AbortSignal
): Promise<GeocodeSuggestion[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  if (banGeocodeClientCircuitOpen) return []
  try {
    const params = new URLSearchParams({
      q: trimmed,
      limit: String(Math.min(Math.max(limit, 8), 20)),
      autocomplete: '1',
    })
    params.set('lat', '-21.115141')
    params.set('lon', '55.536384')
    const pc = extractPostalCode(trimmed)
    if (pc && /^97/.test(pc)) params.set('postcode', pc)
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal,
    })
    if (!res.ok) return []
    markBanGeocodeClientReachable()
    const payload = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] }
        properties?: { label?: string }
      }>
    }
    const out: GeocodeSuggestion[] = []
    for (const f of payload.features ?? []) {
      const coords = f.geometry?.coordinates
      const label = typeof f.properties?.label === 'string' ? f.properties.label.trim() : ''
      if (!coords || coords.length < 2 || !label) continue
      const [lon, lat] = coords
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
      if (!isLngLatInsideReunionIsland(lon, lat)) continue
      out.push({ label, longitude: lon, latitude: lat })
      if (out.length >= limit) break
    }
    return out
  } catch (e) {
    if (signal?.aborted || (e as { name?: string }).name === 'AbortError') return []
    markBanGeocodeClientUnreachable()
    return []
  }
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
    if (!isGeocodeHttpProxyAvailable()) return null
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

    const data = (await res.json()) as unknown
    if (!Array.isArray(data)) return null
    const first = data[0] as { lon?: string; lat?: string }
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
  const banFirst = await searchBanClientSuggestions(trimmed, 1)
  if (banFirst[0]) return { longitude: banFirst[0].longitude, latitude: banFirst[0].latitude }
  if (!/reunion|réunion/i.test(trimmed)) {
    const banReu = await searchBanClientSuggestions(`${trimmed}, La Réunion`, 1)
    if (banReu[0]) return { longitude: banReu[0].longitude, latitude: banReu[0].latitude }
  }
  const nomi = await searchNominatimForwardClientSuggestions(trimmed, 1, undefined, options?.language ?? 'fr')
  if (nomi[0]) return { longitude: nomi[0].longitude, latitude: nomi[0].latitude }
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
    /** Annule les réponses obsolètes quand la saisie change. */
    signal?: AbortSignal
  }
): Promise<GeocodeSuggestion[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const signal = options?.signal
  const lang = options?.language ?? 'fr'
  const cap = Math.min(Math.max(options?.limit ?? 10, 6), 15)
  const queryTokens = tokenize(trimmed)
  const queryPostalCode = extractPostalCode(trimmed)
  const queryNorm = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

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
    if (signal?.aborted) return []
    if (!isGeocodeHttpProxyAvailable()) return []
    try {
      const params = new URLSearchParams({
        q,
        format: 'jsonv2',
        addressdetails: '0',
        limit: String(cap),
        language: lang,
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
      const res = await fetch(url, { signal })
      if (!res.ok) return []
      const data = (await res.json()) as unknown
      if (!Array.isArray(data)) return []
      return parse(data as Array<{ display_name?: string; lon?: string; lat?: string }>)
    } catch (e) {
      if (signal?.aborted || (e as { name?: string }).name === 'AbortError') return []
      return []
    }
  }

  const qWithReunion = /reunion|réunion/i.test(trimmed) ? trimmed : `${trimmed}, La Reunion`
  const tries: Array<[string, boolean]> = [
    [trimmed, true],
    [qWithReunion, true],
    [trimmed, false],
    [qWithReunion, false],
  ]

  const banReuQuery = /reunion|réunion/i.test(trimmed) ? null : `${trimmed}, La Réunion`
  /** La BAN trie par défaut ; on récupère plus de lignes pour les re-classer côté client. */
  const banFetchLimit = Math.min(20, Math.max(cap, 16))

  const [apiLists, banList, banReuList, nomiList] = await Promise.all([
    Promise.all(tries.map(([q, bounded]) => fetchList(q, bounded))),
    searchBanClientSuggestions(trimmed, banFetchLimit, signal),
    banReuQuery ? searchBanClientSuggestions(banReuQuery, banFetchLimit, signal) : Promise.resolve([] as GeocodeSuggestion[]),
    searchNominatimForwardClientSuggestions(trimmed, Math.max(cap, 12), signal, lang),
  ])

  const merged = new Map<string, GeocodeSuggestion>()
  for (const out of apiLists) {
    for (const item of out) {
      const key = `${item.label.toLowerCase()}|${item.longitude.toFixed(6)}|${item.latitude.toFixed(6)}`
      if (!merged.has(key)) merged.set(key, item)
    }
  }
  for (const item of banList) {
    const key = `${item.label.toLowerCase()}|${item.longitude.toFixed(6)}|${item.latitude.toFixed(6)}`
    if (!merged.has(key)) merged.set(key, item)
  }
  for (const item of banReuList) {
    const key = `${item.label.toLowerCase()}|${item.longitude.toFixed(6)}|${item.latitude.toFixed(6)}`
    if (!merged.has(key)) merged.set(key, item)
  }
  for (const item of nomiList) {
    const key = `${item.label.toLowerCase()}|${item.longitude.toFixed(6)}|${item.latitude.toFixed(6)}`
    if (!merged.has(key)) merged.set(key, item)
  }

  if (merged.size === 0) return []

  const queryStreetCompact = queryStreetCompactFromNorm(queryNorm)
  const labelWords = (ln: string) =>
    ln
      .split(/[^a-z0-9]+/)
      .map((w) => w.trim())
      .filter(Boolean)
  const proximityLon = options?.proximity?.[0]
  const proximityLat = options?.proximity?.[1]

  const scoreSuggestion = (s: GeocodeSuggestion): number => {
    const labelNorm = s.label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    let score = 0
    const labelStreetC = labelStreetCompactFromNorm(labelNorm)
    score += streetHeadAlignmentScore(queryStreetCompact, labelStreetC)

    if (queryNorm.length >= 4 && labelNorm.includes(queryNorm)) score += 45
    else if (queryNorm.length >= 6) {
      const prefix = queryNorm.slice(0, 12)
      if (labelNorm.includes(prefix)) score += 28
    }
    if (queryPostalCode) {
      const labelPostalCode = extractPostalCode(s.label)
      if (labelPostalCode === queryPostalCode) score += 100
      else score -= 45
    }
    const words = labelWords(labelNorm)
    for (const tok of queryTokens) {
      if (tok.length < 2) continue
      const isNumeric = /^\d+$/.test(tok)
      if (tok.length <= 3 && !isNumeric) {
        if (words.includes(tok)) score += 8
        else score -= 3
      } else if (isNumeric && tok.length === 5 && /^97/.test(tok)) {
        if (extractPostalCode(s.label) === tok) score += 12
      } else {
        if (words.includes(tok)) score += 6
        else if (labelNorm.includes(tok)) score += 2
        else score -= 1
      }
    }
    if (
      Number.isFinite(proximityLon) &&
      Number.isFinite(proximityLat) &&
      Number.isFinite(s.longitude) &&
      Number.isFinite(s.latitude)
    ) {
      const d = haversineDistanceKm(proximityLon, proximityLat, s.longitude, s.latitude)
      if (d < 35) score += Math.round(Math.max(0, 35 - d))
    }
    return score
  }

  return [...merged.values()]
    .sort((a, b) => scoreSuggestion(b) - scoreSuggestion(a))
    .slice(0, options?.limit ?? 10)
}

type NominatimAddressFields = Record<string, string | undefined>

function looksLikeCoordinatesOnlyLabel(value: string): boolean {
  return /^-?\d{1,3}\.?\d*\s*,\s*-?\d{1,3}\.?\d*$/.test(value.trim())
}

function sanitizeReverseGeocodeLabel(name: string | null): string | null {
  if (!name) return null
  const t = name.trim()
  if (!t) return null
  if (looksLikeCoordinatesOnlyLabel(t)) return null
  return t
}

/** Construit un libellé à partir du bloc `address` (jsonv2) quand `display_name` est vide ou inutile. */
export function labelFromNominatimAddress(addr: NominatimAddressFields | undefined): string | null {
  if (!addr || typeof addr !== 'object') return null
  const house = addr.house_number?.trim() ?? ''
  const road = addr.road?.trim() ?? ''
  const pedestrian = addr.pedestrian?.trim() ?? ''
  const path = addr.path?.trim() ?? ''
  const streetLine = [house, road || pedestrian || path].filter(Boolean).join(' ').trim()
  const suburb = addr.suburb?.trim() ?? ''
  const neighbourhood = addr.neighbourhood?.trim() ?? ''
  const village = addr.village?.trim() ?? ''
  const town = addr.town?.trim() ?? ''
  const city = addr.city?.trim() ?? ''
  const municipality = addr.municipality?.trim() ?? ''
  const locality =
    [suburb, neighbourhood, village, town, city, municipality].find((x) => x && x.length > 0) ?? ''
  const postcode = addr.postcode?.trim() ?? ''
  const parts: string[] = []
  if (streetLine) parts.push(streetLine)
  if (locality) parts.push(locality)
  if (postcode && !parts.some((p) => p.includes(postcode))) parts.push(postcode)
  const built = parts.join(', ').replace(/\s+,/g, ',').trim()
  return built.length > 0 ? built : null
}

const REUNION_NOMINATIM_VIEWBOX = `${REUNION_ISLAND_BBOX.west},${REUNION_ISLAND_BBOX.north},${REUNION_ISLAND_BBOX.east},${REUNION_ISLAND_BBOX.south}`

type NominatimSearchHit = {
  lat?: string
  lon?: string
  display_name?: string
  address?: NominatimAddressFields
}

/**
 * Recherche forward Nominatim depuis le navigateur (repli si la BAN est bloquée / injoignable).
 */
async function searchNominatimForwardClientSuggestions(
  query: string,
  limit: number,
  signal: AbortSignal | undefined,
  language: 'fr' | 'en'
): Promise<GeocodeSuggestion[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const q = /reunion|réunion/i.test(trimmed) ? trimmed : `${trimmed}, La Réunion`
  const cap = Math.min(Math.max(limit, 6), 15)

  const run = async (bounded: '0' | '1'): Promise<GeocodeSuggestion[]> => {
    const params = new URLSearchParams({
      q,
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(cap),
      'accept-language': language,
      email: 'contact@palto.fr',
      viewbox: REUNION_NOMINATIM_VIEWBOX,
      bounded,
      countrycodes: 'fr',
    })
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Palto/1 (https://palto.fr; contact@palto.fr)',
      },
      signal,
    })
    if (!res.ok) return []
    const data = (await res.json()) as unknown
    if (!Array.isArray(data)) return []
    const out: GeocodeSuggestion[] = []
    for (const row of data as NominatimSearchHit[]) {
      const lon = row.lon ? Number.parseFloat(row.lon) : Number.NaN
      const lat = row.lat ? Number.parseFloat(row.lat) : Number.NaN
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
      if (!isLngLatInsideReunionIsland(lon, lat)) continue
      const fromAddr = labelFromNominatimAddress(row.address)
      const dn = typeof row.display_name === 'string' ? row.display_name.trim() : ''
      const label = (fromAddr && fromAddr.length > 0 ? fromAddr : dn) || null
      if (!label || looksLikeCoordinatesOnlyLabel(label)) continue
      out.push({ label, longitude: lon, latitude: lat })
      if (out.length >= cap) break
    }
    return out
  }

  try {
    const strict = await run('1')
    if (strict.length > 0) return strict
    return await run('0')
  } catch (e) {
    if (signal?.aborted || (e as { name?: string }).name === 'AbortError') return []
    return []
  }
}

async function parseGeocodeReverseJson(res: Response): Promise<string | null> {
  try {
    const data = (await res.json()) as {
      display_name?: string
      address?: NominatimAddressFields
    }
    const dn = typeof data?.display_name === 'string' ? data.display_name.trim() : ''
    if (dn && !looksLikeCoordinatesOnlyLabel(dn)) return dn
    return labelFromNominatimAddress(data?.address)
  } catch {
    return null
  }
}

/**
 * Reverse BAN depuis le navigateur : CORS ouverte sur api-adresse.data.gouv.fr.
 * Indispensable quand `/api/geocode` n’est pas joignable (dev mobile, réseau) et que Nominatim bloque le client.
 */
async function reverseGeocodeBanPublic(longitude: number, latitude: number): Promise<string | null> {
  if (banGeocodeClientCircuitOpen) return null
  try {
    const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${encodeURIComponent(String(longitude))}&lat=${encodeURIComponent(String(latitude))}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    markBanGeocodeClientReachable()
    const data = (await res.json()) as {
      features?: Array<{ properties?: { label?: string; name?: string } }>
    }
    const p = data.features?.[0]?.properties
    const label =
      typeof p?.label === 'string'
        ? p.label.trim()
        : typeof p?.name === 'string'
          ? p.name.trim()
          : ''
    return label.length > 0 ? label : null
  } catch {
    markBanGeocodeClientUnreachable()
    return null
  }
}

/**
 * Adresse lisible à partir de coordonnées (proxy `/api/geocode`, puis Nominatim direct si besoin).
 */
export async function geocodeReverse(
  longitude: number,
  latitude: number,
  _accessToken?: string,
  options?: { language?: 'fr' | 'en' }
): Promise<string | null> {
  const lang = options?.language ?? 'fr'
  const proxyParams = new URLSearchParams({
    lon: String(longitude),
    lat: String(latitude),
    format: 'jsonv2',
    language: lang,
    mode: 'reverse',
  })

  try {
    if (isGeocodeHttpProxyAvailable()) {
      const res = await fetch(`${apiBaseUrl()}/geocode?${proxyParams.toString()}`)
      if (res.ok) {
        const name = sanitizeReverseGeocodeLabel(await parseGeocodeReverseJson(res))
        if (name) return name
      }
    }
  } catch {
    /* pas de proxy local, réseau, etc. */
  }

  const banLabel = sanitizeReverseGeocodeLabel(await reverseGeocodeBanPublic(longitude, latitude))
  if (banLabel) return banLabel

  try {
    const q = new URLSearchParams({
      lon: String(longitude),
      lat: String(latitude),
      format: 'jsonv2',
      addressdetails: '1',
      'accept-language': lang,
      email: 'contact@palto.fr',
    })
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${q.toString()}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return sanitizeReverseGeocodeLabel(await parseGeocodeReverseJson(res))
  } catch {
    return null
  }
}

export type ReverseGeocodeFallbackKind = 'pickup' | 'destination' | 'mapPoint'

/** Libellé si le géocodage inverse ne renvoie pas d’adresse (évite d’afficher des coordonnées brutes). */
export function reverseGeocodeDisplayFallback(
  language: string,
  kind: ReverseGeocodeFallbackKind
): string {
  const isEn = language === 'en'
  if (kind === 'pickup') {
    return isEn ? 'Pickup selected on the map' : 'Départ sélectionné sur la carte'
  }
  if (kind === 'destination') {
    return isEn ? 'Address selected on the map' : 'Adresse sélectionnée sur la carte'
  }
  return isEn ? 'Location from map' : 'Lieu indiqué sur la carte'
}
