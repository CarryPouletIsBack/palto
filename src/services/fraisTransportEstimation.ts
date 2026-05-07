import { DEFAULT_USER_ORIGIN, DEFAULT_USER_ORIGIN_LABEL } from '../constants/defaultUserOrigin'
import { appliquerPlafond40KmDomicileTravail, allerRetourKm, haversineDistanceKm, type GeoPoint } from './distanceGeo'
import {
  montantBaremeKm,
  type CategorieVehiculeBarème,
  type MotorisationBarème,
  type PuissanceFiscaleAuto,
  type PuissanceFiscaleMotoGt50,
} from './baremeKilometriqueFiscal'

export type EstimationFraisTransportInput = {
  /** Si omis : {@link DEFAULT_USER_ORIGIN} (3 Allée Dachau, Le Port). */
  origine?: GeoPoint
  destination: GeoPoint
  categorie: CategorieVehiculeBarème
  motorisation: MotorisationBarème
  puissanceAutoCv?: PuissanceFiscaleAuto
  puissanceMotoGt50?: PuissanceFiscaleMotoGt50
  /** Si true, double la distance aller (trajet domicile–travail aller-retour). */
  compterAllerRetour: boolean
  /** Si true, applique le plafond 40 km sur la distance **aller** avant aller-retour. */
  appliquerPlafondFiscal40KmSurAller: boolean
  /**
   * Distance **professionnelle annuelle** à passer au barème (km).
   * Si omis, on utilise la distance du trajet (aller ou A-R) comme approximation d’un seul segment.
   */
  distanceProfessionnelleAnnuelleKm?: number
}

export type EstimationFraisTransportResult = {
  /** Distance orthodromique aller (brute). */
  distanceAllerBruteKm: number
  /** Distance aller après plafond 40 km éventuel. */
  distanceAllerRetenuKm: number
  /** Kilométrage passé au barème (souvent A-R ou annuel). */
  distanceBarèmeKm: number
  plafond40KmApplique: boolean
  montantBaremeEuros: number
  avertissements: string[]
}

/**
 * Chaîne une distance géographique (Haversine) et une estimation de montant forfaitaire
 * d’après le barème kilométrique (usage **indicatif**, pas conseil fiscal).
 */
export function estimerFraisTransportDepuisCoordonnees(input: EstimationFraisTransportInput): EstimationFraisTransportResult {
  const origine = input.origine ?? DEFAULT_USER_ORIGIN
  const avertissements: string[] = []
  if (input.origine === undefined) {
    avertissements.push(`Origine par défaut (dev) : ${DEFAULT_USER_ORIGIN_LABEL}.`)
  }
  avertissements.push(
    'Distance « à vol d’oiseau » (Haversine), pas l’itinéraire routier réel.',
    'Montant indicatif : le barème s’applique au kilométrage professionnel **annuel** cumulé ; voir https://www.impots.gouv.fr/particulier/frais-de-transport'
  )

  const distanceAllerBruteKm = haversineDistanceKm(origine, input.destination)
  let distanceAllerRetenuKm = distanceAllerBruteKm
  let plafond40 = false
  if (input.appliquerPlafondFiscal40KmSurAller) {
    const p = appliquerPlafond40KmDomicileTravail(distanceAllerRetenuKm)
    distanceAllerRetenuKm = p.distanceAllerRetenuKm
    plafond40 = p.plafondApplique
  }

  let distancePourBarème = input.distanceProfessionnelleAnnuelleKm
  if (distancePourBarème === undefined) {
    const { allerRetourKm: ar } = allerRetourKm(distanceAllerRetenuKm)
    distancePourBarème = input.compterAllerRetour ? ar : distanceAllerRetenuKm
  }

  const montantBrut = montantBaremeKm(distancePourBarème, {
    categorie: input.categorie,
    motorisation: input.motorisation,
    puissanceAutoCv: input.puissanceAutoCv,
    puissanceMotoGt50: input.puissanceMotoGt50,
  })
  const montantBaremeEuros = Math.round(montantBrut * 100) / 100

  return {
    distanceAllerBruteKm: Math.round(distanceAllerBruteKm * 1000) / 1000,
    distanceAllerRetenuKm: Math.round(distanceAllerRetenuKm * 1000) / 1000,
    distanceBarèmeKm: Math.round(distancePourBarème * 1000) / 1000,
    plafond40KmApplique: plafond40,
    montantBaremeEuros,
    avertissements,
  }
}
