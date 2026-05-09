import { apiBaseUrl } from '../constants/featureFlags'

const API_BASE_URL = apiBaseUrl()

export type CreateRideOrderPayload = {
  bookingKind: 'instant' | 'scheduled'
  scheduledDate: string
  scheduledTime: string
  pickupAddress: string
  dropoffAddress: string
  amountEur: number
  distanceKm?: number | null
  clientFullName?: string | null
  clientEmail: string
  clientPhone?: string | null
  clientComment?: string | null
  requestedDriverExternalKey?: string | null
  /** UUID compte chauffeur (`app_accounts.id`) pour commande instantanée. */
  requestedChauffeurAccountId?: string | null
  pickupLng?: number | null
  pickupLat?: number | null
  dropoffLng?: number | null
  dropoffLat?: number | null
}

export type CreateRideOrderResult = {
  courseId: string
  externalCode: string
}

export async function createRideOrder(body: CreateRideOrderPayload): Promise<CreateRideOrderResult> {
  const res = await fetch(`${API_BASE_URL}/rides/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as {
    courseId?: string
    externalCode?: string
    error?: string
  }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
  if (!data.courseId || !data.externalCode) {
    throw new Error('Reponse serveur inattendue')
  }
  return { courseId: data.courseId, externalCode: data.externalCode }
}
