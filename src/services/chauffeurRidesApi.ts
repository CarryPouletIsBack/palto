import type { BookingKindUi, CourseRowState, CourseStatut } from '../types/chauffeurCoursePlanning'
import { apiBaseUrl, useChauffeurRidesPersist } from '../constants/featureFlags'
import { simplifyAddressDisplay } from './addressDisplay'

const API_BASE_URL = apiBaseUrl()
const AUTH_TOKEN_KEY = 'dashboard_token'

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/** Active le mode « courses depuis l’API » (GET/POST chauffeur) — désactivé par défaut. */
export function ridesPersistenceEnabled(): boolean {
  return useChauffeurRidesPersist()
}

type ApiRide = {
  id: string
  client_id: string | null
  scheduled_date: string
  scheduled_time: string
  pickup_address: string
  dropoff_address: string
  status: string
  amount_eur: number
  distance_km: number | null
  pickup_lng?: number | null
  pickup_lat?: number | null
  dropoff_lng?: number | null
  dropoff_lat?: number | null
  booking_kind: string
  started_at: string | null
  client_comment?: string | null
  payment_method?: string | null
  stripe_payment_intent_id?: string | null
  clients: { full_name: string; email: string | null; phone: string } | null
}

function mapPaymentMode(row: ApiRide): 'carte' | 'especes' {
  const pm = (row.payment_method ?? '').trim().toLowerCase()
  if (pm === 'card') return 'carte'
  if (pm === 'cash') return 'especes'
  if (row.stripe_payment_intent_id?.trim()) return 'carte'
  return 'especes'
}

function mapStatus(s: string): CourseStatut {
  switch (s) {
    case 'pending':
      return 'En attente'
    case 'accepted':
      return 'Acceptee'
    case 'in_progress':
      return 'En cours'
    case 'completed':
      return 'Terminee'
    case 'cancelled':
      return 'Annulee'
    default:
      return 'En attente'
  }
}

function mapBookingKind(k: string): BookingKindUi | undefined {
  if (k === 'scheduled' || k === 'instant') return k
  return undefined
}

function toHeure(scheduledTime: string): string {
  const t = scheduledTime.trim()
  if (t.length >= 5 && /^\d{2}:\d{2}/.test(t)) return t.slice(0, 5)
  return t.slice(0, 5) || '00:00'
}

function mapRide(row: ApiRide): CourseRowState {
  const km = typeof row.distance_km === 'number' && Number.isFinite(row.distance_km) ? row.distance_km : 0
  return {
    id: row.id,
    clientId: row.client_id ?? '',
    date: row.scheduled_date,
    heure: toHeure(row.scheduled_time),
    client: row.clients?.full_name?.trim() || 'Client',
    depart: simplifyAddressDisplay(row.pickup_address),
    arrivee: simplifyAddressDisplay(row.dropoff_address),
    km,
    statut: mapStatus(row.status),
    montant: row.amount_eur,
    modePaiement: mapPaymentMode(row),
    startedAt: row.started_at ? Date.parse(row.started_at) : undefined,
    bookingKind: mapBookingKind(row.booking_kind),
    clientComment: row.client_comment?.trim() || undefined,
    clientPhone: row.clients?.phone?.trim() || undefined,
    clientEmail: row.clients?.email?.trim() || undefined,
    pickupLng: typeof row.pickup_lng === 'number' && Number.isFinite(row.pickup_lng) ? row.pickup_lng : undefined,
    pickupLat: typeof row.pickup_lat === 'number' && Number.isFinite(row.pickup_lat) ? row.pickup_lat : undefined,
    dropoffLng:
      typeof row.dropoff_lng === 'number' && Number.isFinite(row.dropoff_lng) ? row.dropoff_lng : undefined,
    dropoffLat:
      typeof row.dropoff_lat === 'number' && Number.isFinite(row.dropoff_lat) ? row.dropoff_lat : undefined,
  }
}

export async function fetchChauffeurRidesFromApi(): Promise<CourseRowState[]> {
  const res = await fetch(`${API_BASE_URL}/chauffeur?resource=rides`, {
    method: 'GET',
    headers: {
      ...authHeaders(),
    },
  })
  const data = (await res.json().catch(() => ({}))) as { rides?: ApiRide[]; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
  return (data.rides ?? []).map(mapRide)
}

export async function postChauffeurRideAction(
  courseId: string,
  action: 'accept' | 'start' | 'complete' | 'cancel'
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/chauffeur?resource=rides-action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ courseId, action }),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
}
