import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { apiBaseUrl, supabaseRealtimeConfigured } from '../constants/featureFlags'
import { CLIENT_AUTH_TOKEN_KEY, DASHBOARD_AUTH_TOKEN_KEY, PALTO_CLIENT_SESSION_CHANGED_EVENT } from './authService'

type Listener = () => void

const listeners = new Set<Listener>()
let supabaseSingleton: SupabaseClient | null = null
let channel: RealtimeChannel | null = null
let reconnectTimer: number | null = null
let debounceTimer: number | null = null
let started = false
let connectPromise: Promise<void> | null = null

function getPaltoBearerForRealtime(): string | null {
  if (typeof window === 'undefined') return null
  const dash = localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)?.trim()
  if (dash) return dash
  const client = localStorage.getItem(CLIENT_AUTH_TOKEN_KEY)?.trim()
  return client || null
}

function emitDebounced(ms: number) {
  if (debounceTimer != null) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null
    listeners.forEach((fn) => {
      try {
        fn()
      } catch {
        /* ignore */
      }
    })
  }, ms)
}

function getBrowserSupabase(): SupabaseClient {
  if (supabaseSingleton) return supabaseSingleton
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
  if (!url || !anon) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants')
  supabaseSingleton = createClient(url, anon, {
    realtime: { params: { eventsPerSecond: 8 } },
  })
  return supabaseSingleton
}

async function fetchRealtimeAccessToken(): Promise<string | null> {
  const bearer = getPaltoBearerForRealtime()
  if (!bearer) return null
  const res = await fetch(`${apiBaseUrl()}/auth/realtime-token`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${bearer}` },
  })
  if (!res.ok) return null
  const data = (await res.json().catch(() => ({}))) as { accessToken?: string }
  return typeof data.accessToken === 'string' && data.accessToken.trim() ? data.accessToken.trim() : null
}

function teardownChannel() {
  if (reconnectTimer != null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  const sb = supabaseSingleton
  if (channel && sb) {
    try {
      void sb.removeChannel(channel)
    } catch {
      /* ignore */
    }
  }
  channel = null
}

async function connectRealtime(): Promise<void> {
  if (!supabaseRealtimeConfigured()) return
  const token = await fetchRealtimeAccessToken()
  if (!token) {
    scheduleReconnect()
    return
  }
  const sb = getBrowserSupabase()
  sb.realtime.setAuth(token)
  teardownChannel()
  channel = sb
    .channel('palto-courses-events')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'courses' },
      () => emitDebounced(120)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'course_events' },
      () => emitDebounced(120)
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        scheduleReconnect()
      }
    })
}

function scheduleReconnect() {
  if (reconnectTimer != null) return
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    void startRealtimeConnection()
  }, 5000)
}

async function startRealtimeConnection(): Promise<void> {
  if (!started) return
  if (!supabaseRealtimeConfigured()) return
  try {
    await connectRealtime()
  } catch (e) {
    console.warn('[paltoCoursesRealtime] connect', e)
    scheduleReconnect()
  }
}

function ensureConnecting() {
  if (connectPromise) return connectPromise
  connectPromise = startRealtimeConnection().finally(() => {
    connectPromise = null
  })
  return connectPromise
}

/**
 * Abonnement mutualisé : un seul canal Realtime pour toute l’app.
 * @returns fonction de désabonnement
 */
export function subscribePaltoCoursesRealtime(onUpdate: Listener): () => void {
  if (!supabaseRealtimeConfigured()) {
    return () => {}
  }
  listeners.add(onUpdate)
  started = true
  void ensureConnecting()

  const onAuthBump = () => {
    teardownChannel()
    void ensureConnecting()
  }
  window.addEventListener('storage', onAuthBump)
  window.addEventListener('palto:realtime-reconnect', onAuthBump as EventListener)
  window.addEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, onAuthBump as EventListener)

  return () => {
    listeners.delete(onUpdate)
    window.removeEventListener('storage', onAuthBump)
    window.removeEventListener('palto:realtime-reconnect', onAuthBump as EventListener)
    window.removeEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, onAuthBump as EventListener)
    if (listeners.size === 0) {
      started = false
      teardownChannel()
    }
  }
}

/** Force une reconnexion (ex. après login programmatique même onglet). */
export function bumpPaltoCoursesRealtimeReconnect(): void {
  window.dispatchEvent(new Event('palto:realtime-reconnect'))
}
