/** sessionStorage : snapshot course pour l’écran navigation (ou app chauffeur). */
export const CHAUFFEUR_NAV_COURSE_STORAGE_KEY = 'palto:chauffeur-nav-course'

/** CustomEvent<{ id: string }> — émis quand une course est terminée côté navigation. */
export const CHAUFFEUR_COURSE_COMPLETED_EVENT = 'palto:chauffeur-course-completed'

export type ChauffeurNavCourseSnapshot = {
  id: string
  depart: string
  arrivee: string
  client: string
  km: number
  date: string
  heure: string
  montantPrevuEuros: number
  modePaiement: string
  startedAt: number
  pickupLng?: number
  pickupLat?: number
  dropoffLng?: number
  dropoffLat?: number
}
