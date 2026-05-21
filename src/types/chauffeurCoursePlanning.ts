export type CourseStatut = 'En attente' | 'Acceptee' | 'En cours' | 'Terminee' | 'Annulee'

export type BookingKindUi = 'scheduled' | 'instant'

export type CourseRowState = {
  id: string
  clientId: string
  date: string
  heure: string
  client: string
  depart: string
  arrivee: string
  km: number
  statut: CourseStatut
  montant: number
  modePaiement?: 'carte' | 'especes'
  startedAt?: number
  routeSnapDeviationKm?: number
  bookingKind?: BookingKindUi
  clientComment?: string
  /** Renseignés quand les courses viennent de l’API (join `clients`). */
  clientPhone?: string
  clientEmail?: string
  pickupLng?: number
  pickupLat?: number
  dropoffLng?: number
  dropoffLat?: number
  cancelledAt?: string | null
  cancelledReason?: string | null
  stripePaymentStatus?: string | null
  cancellationFeeCapturedCents?: number | null
}
