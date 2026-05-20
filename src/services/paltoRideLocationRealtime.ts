/**
 * Positions client / chauffeur : Supabase Realtime **broadcast** sur `ride_geo:{courseId}`.
 */
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { apiBaseUrl, supabaseRealtimeConfigured } from '../constants/featureFlags'
import { CLIENT_AUTH_TOKEN_KEY, DASHBOARD_AUTH_TOKEN_KEY } from './authService'

export type RideGeoRole = 'client' | 'driver'

export type RideGeoPayload = {
  role: RideGeoRole
  lng: number
  lat: number
  at: number
}

const BROADCAST_EVENT = 'geo'

let supabaseSingleton: SupabaseClient | null = null

function getAnonClient(): SupabaseClient | null {
  if (!supabaseRealtimeConfigured()) return null
  if (supabaseSingleton) return supabaseSingleton
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
  if (!url || !anon) return null
  supabaseSingleton = createClient(url, anon, {
    realtime: { params: { eventsPerSecond: 12 } },
  })
  return supabaseSingleton
}

async function fetchRealtimeAccessToken(): Promise<string | null> {
  const dash = localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)?.trim()
  const client = localStorage.getItem(CLIENT_AUTH_TOKEN_KEY)?.trim()
  const bearer = dash || client
  if (!bearer) return null
  const res = await fetch(`${apiBaseUrl()}/auth?action=realtime-token`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${bearer}` },
  })
  if (!res.ok) return null
  const data = (await res.json().catch(() => ({}))) as { accessToken?: string }
  return typeof data.accessToken === 'string' && data.accessToken.trim() ? data.accessToken.trim() : null
}

async function ensureRealtimeAuth(): Promise<SupabaseClient | null> {
  const sb = getAnonClient()
  if (!sb) return null
  const token = await fetchRealtimeAccessToken()
  if (!token) return null
  sb.realtime.setAuth(token)
  return sb
}

export function isRideGeoBroadcastEnabled(): boolean {
  return Boolean(supabaseRealtimeConfigured())
}

type Room = {
  sb: SupabaseClient
  channel: RealtimeChannel
  listeners: Set<(p: RideGeoPayload) => void>
  refCount: number
}

const rooms = new Map<string, Room>()

function dispatch(room: Room, raw: unknown) {
  const p = raw as Partial<RideGeoPayload>
  if (!p || (p.role !== 'client' && p.role !== 'driver')) return
  if (typeof p.lng !== 'number' || typeof p.lat !== 'number' || !Number.isFinite(p.lng + p.lat)) return
  const payload: RideGeoPayload = {
    role: p.role,
    lng: p.lng,
    lat: p.lat,
    at: typeof p.at === 'number' ? p.at : Date.now(),
  }
  room.listeners.forEach((fn) => {
    try {
      fn(payload)
    } catch {
      /* ignore */
    }
  })
}

/**
 * Rejoint la salle d’une course : réception broadcast + envoi via le même canal.
 */
export async function joinRideGeoRoom(
  courseId: string,
  onGeo: (payload: RideGeoPayload) => void
): Promise<{ send: (role: RideGeoRole, lng: number, lat: number) => Promise<void>; leave: () => void } | null> {
  const sb = await ensureRealtimeAuth()
  if (!sb) return null

  let room = rooms.get(courseId)
  if (!room) {
    const listeners = new Set<(p: RideGeoPayload) => void>()
    const channel = sb
      .channel(`ride_geo:${courseId}`, { config: { broadcast: { self: true } } })
      .on('broadcast', { event: BROADCAST_EVENT }, ({ payload }) => {
        const r = rooms.get(courseId)
        if (r) dispatch(r, payload)
      })

    try {
      await new Promise<void>((resolve, reject) => {
        const t = window.setTimeout(() => reject(new Error('ride_geo subscribe timeout')), 12000)
        channel.subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            window.clearTimeout(t)
            resolve()
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            window.clearTimeout(t)
            reject(err ?? new Error(String(status)))
          }
        })
      })
    } catch {
      try {
        void sb.removeChannel(channel)
      } catch {
        /* ignore */
      }
      return null
    }

    room = { sb, channel, listeners, refCount: 0 }
    rooms.set(courseId, room)
  }

  room.listeners.add(onGeo)
  room.refCount += 1

  const send = async (role: RideGeoRole, lng: number, lat: number) => {
    const r = rooms.get(courseId)
    if (!r) return
    await r.channel.send({
      type: 'broadcast',
      event: BROADCAST_EVENT,
      payload: { role, lng, lat, at: Date.now() } satisfies RideGeoPayload,
    })
  }

  const leave = () => {
    const r = rooms.get(courseId)
    if (!r) return
    r.listeners.delete(onGeo)
    r.refCount -= 1
    if (r.refCount <= 0) {
      try {
        void r.sb.removeChannel(r.channel)
      } catch {
        /* ignore */
      }
      rooms.delete(courseId)
    }
  }

  return { send, leave }
}
