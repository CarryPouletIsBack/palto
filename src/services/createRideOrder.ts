import { apiBaseUrl } from '../constants/featureFlags'
import { getClientAuthorizationHeader } from './authService'

const API_BASE_URL = apiBaseUrl()

export type CreateRideOrderPayload = {
  bookingKind: 'instant' | 'scheduled'
  scheduledDate: string
  scheduledTime: string
  pickupAddress: string
  dropoffAddress: string
  amountEur: number
  distanceKm?: number | null
  routeElevationM?: number | null
  clientFullName?: string | null
  clientEmail: string
  clientPhone?: string | null
  clientComment?: string | null
  requestedDriverExternalKey?: string | null
  requestedChauffeurAccountId?: string | null
  pickupLng?: number | null
  pickupLat?: number | null
  dropoffLng?: number | null
  dropoffLat?: number | null
  paymentMethod?: 'card' | 'cash'
}

export type CreateRideOrderResult = {
  courseId: string
  externalCode: string
  driverAmountEur?: number
  paltoFeeEur?: number
  totalChargeEur?: number
  stripeEnabled?: boolean
  stripeClientSecret?: string | null
  stripePaymentIntentId?: string | null
  stripeCustomerId?: string | null
  stripePublishableKey?: string | null
  /** Paiement Stripe non prepare (commande conservee, fallback hors ligne). */
  stripeSetupWarning?: string | null
}

export async function createRideOrder(body: CreateRideOrderPayload): Promise<CreateRideOrderResult> {
  const auth = getClientAuthorizationHeader()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (auth) headers.Authorization = auth

  const res = await fetch(`${API_BASE_URL}/rides/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as CreateRideOrderResult & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
  if (!data.courseId || !data.externalCode) {
    throw new Error('Reponse serveur inattendue')
  }
  return data
}
