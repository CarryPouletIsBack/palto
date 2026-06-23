import type { ChauffeurVehicleType } from '../constants/chauffeurRegistrationStorage'
import type { CourseRowState } from '../types/chauffeurCoursePlanning'

/** Offre job chauffeur : pré-réservation client (page Go, course programmée). */
export type ChauffeurJobOffer = {
  id: string
  postedAt: string
  clientName: string
  clientPhotoUrl?: string | null
  pickupLabel: string
  dropoffLabel: string
  pickupLng: number
  pickupLat: number
  dropoffLng: number
  dropoffLat: number
  scheduledDate: string
  scheduledTime: string
  amountEur: number
  vehicleRequired: ChauffeurVehicleType
  luggage: boolean
  babySeat: boolean
  distanceKm: number
  deliveryWindowLabel: string
}

/** Données de démo — remplacées par l’API quand les pré-réservations Go alimenteront Jobs. */
export const CHAUFFEUR_JOBS_MOCK: ChauffeurJobOffer[] = [
  {
    id: 'job-demo-1',
    postedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    clientName: 'Marie Dupont',
    clientPhotoUrl: null,
    pickupLabel: 'Aéroport Roland-Garros',
    dropoffLabel: 'Saint-Denis, centre-ville',
    pickupLng: 55.5103,
    pickupLat: -20.8871,
    dropoffLng: 55.4481,
    dropoffLat: -20.8789,
    scheduledDate: '2026-06-02',
    scheduledTime: '14:30',
    amountEur: 68,
    vehicleRequired: 'utilitaire',
    luggage: true,
    babySeat: false,
    distanceKm: 32,
    deliveryWindowLabel: '1 h',
  },
  {
    id: 'job-demo-2',
    postedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    clientName: 'Jean Morel',
    clientPhotoUrl: null,
    pickupLabel: 'Saint-Pierre, Place de la Mairie',
    dropoffLabel: 'Le Tampon, Clinique',
    pickupLng: 55.4781,
    pickupLat: -21.3393,
    dropoffLng: 55.5175,
    dropoffLat: -21.2826,
    scheduledDate: '2026-06-03',
    scheduledTime: '08:15',
    amountEur: 42,
    vehicleRequired: 'berline',
    luggage: false,
    babySeat: true,
    distanceKm: 18,
    deliveryWindowLabel: '45 min',
  },
  {
    id: 'job-demo-3',
    postedAt: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(),
    clientName: 'Sophie Laurent',
    clientPhotoUrl: null,
    pickupLabel: 'Saint-Paul, Hermitage-les-Bains',
    dropoffLabel: 'Saint-Denis, Jardin de l’État',
    pickupLng: 55.2862,
    pickupLat: -21.1096,
    dropoffLng: 55.452,
    dropoffLat: -20.8789,
    scheduledDate: '2026-06-04',
    scheduledTime: '19:00',
    amountEur: 55,
    vehicleRequired: 'berline',
    luggage: true,
    babySeat: false,
    distanceKm: 24,
    deliveryWindowLabel: '50 min',
  },
  {
    id: 'job-demo-4',
    postedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    clientName: 'Lucas Payet',
    clientPhotoUrl: null,
    pickupLabel: 'Le Port, zone commerciale',
    dropoffLabel: 'Saint-Leu, centre',
    pickupLng: 55.2944,
    pickupLat: -20.9373,
    dropoffLng: 55.2876,
    dropoffLat: -21.1706,
    scheduledDate: '2026-06-02',
    scheduledTime: '11:00',
    amountEur: 38,
    vehicleRequired: 'berline',
    luggage: false,
    babySeat: false,
    distanceKm: 14,
    deliveryWindowLabel: '35 min',
  },
]

export function jobMatchesChauffeurVehicle(
  job: ChauffeurJobOffer,
  chauffeurVehicle: ChauffeurVehicleType | string | null | undefined
): boolean {
  if (!chauffeurVehicle?.trim()) return true
  const v = chauffeurVehicle.trim().toLowerCase()
  if (v === job.vehicleRequired) return true
  // Utilitaire / van : même famille pour la démo.
  if (job.vehicleRequired === 'utilitaire' && (v === 'utilitaire' || v === 'van')) return true
  return false
}

/** Nombre de jobs visibles pour le chauffeur (onglet « Pour vous »). */
export function countChauffeurJobsForDriver(input: {
  acceptedJobIds: ReadonlySet<string>
  dismissedJobIds: ReadonlySet<string>
  chauffeurVehicleType?: ChauffeurVehicleType | string | null
}): number {
  return CHAUFFEUR_JOBS_MOCK.filter(
    (job) =>
      !input.dismissedJobIds.has(job.id) &&
      !input.acceptedJobIds.has(job.id) &&
      jobMatchesChauffeurVehicle(job, input.chauffeurVehicleType)
  ).length
}

export function vehicleTypeLabel(
  type: ChauffeurVehicleType,
  language: 'fr' | 'en'
): string {
  const fr: Record<ChauffeurVehicleType, string> = {
    berline: 'Berline',
    utilitaire: 'Van / utilitaire',
    moto: 'Moto',
    scooter: 'Scooter',
  }
  const en: Record<ChauffeurVehicleType, string> = {
    berline: 'Sedan',
    utilitaire: 'Van',
    moto: 'Motorcycle',
    scooter: 'Scooter',
  }
  return (language === 'en' ? en : fr)[type]
}

function clientIdFromJobClientName(clientName: string): string {
  const slug =
    clientName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'client'
  return `CL-job-${slug}`
}

/** Transforme une offre Jobs acceptée en ligne planning / courses. */
export function chauffeurJobToCourseRow(job: ChauffeurJobOffer): CourseRowState {
  return {
    id: `JOB-${job.id}`,
    clientId: clientIdFromJobClientName(job.clientName),
    date: job.scheduledDate,
    heure: job.scheduledTime,
    client: job.clientName.trim() || 'Client',
    depart: job.pickupLabel,
    arrivee: job.dropoffLabel,
    km: job.distanceKm,
    statut: 'Acceptee',
    montant: job.amountEur,
    modePaiement: 'carte',
    bookingKind: 'scheduled',
    pickupLng: job.pickupLng,
    pickupLat: job.pickupLat,
    dropoffLng: job.dropoffLng,
    dropoffLat: job.dropoffLat,
  }
}
