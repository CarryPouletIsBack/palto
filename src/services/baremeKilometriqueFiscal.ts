/**
 * Barème kilométrique administratif (frais professionnels, déclaration au réel ou référence IK).
 *
 * Références :
 * - [Frais de transport | impots.gouv.fr](https://www.impots.gouv.fr/particulier/frais-de-transport)
 *   (véhicules thermiques / hydrogène / hybrides **vs** 100 % électriques, barèmes distincts).
 * - Tableaux **2025** (gel par rapport à l’exercice précédent) retranscrits de sources publiques
 *   de synthèse ; pour valeur opposable, utiliser le simulateur officiel et le BOFiP.
 *
 * **`d`** = distance parcourue **à titre professionnel sur l’année** (km), en principe cumul
 * des trajets éligibles — ici on peut passer une distance de trajet pour une **estimation**.
 */

/** Motorisation au sens des six barèmes (3 électriques + 3 « autres »). */
export type MotorisationBarème = 'thermique_hydrogene_hybride' | 'electrique_100'

/** Catégories de véhicules alignées sur la documentation des frais de transport. */
export type CategorieVehiculeBarème =
  | 'automobile'
  | 'deux_roues_gt_50cm3'
  | 'deux_roues_lte_50cm3'

/** Tranches de puissance fiscale pour motos > 50 cm³ (véhicules thermiques / hybrides / H₂). */
export type PuissanceFiscaleMotoGt50 = 'cv_1_2' | 'cv_3_4_5' | 'cv_6_plus'

/** Puissance fiscale pour automobile (CV). */
export type PuissanceFiscaleAuto = 3 | 4 | 5 | 6 | 7

type Tranche3 = {
  /** km inclus dans la 1re tranche */
  borne1: number
  coef1: number
  /** km inclus dans la 2e tranche (borne2 exclusive côté implémentation : d <= borne2) */
  borne2: number
  coef2: number
  /** constante € ajoutée dans la 2e tranche (continuité aux bornes) */
  const2Euro: number
  /** coefficient €/km au-delà de borne2 */
  coef3: number
}

function montantTranches3(dKm: number, t: Tranche3): number {
  const d = Math.max(0, dKm)
  if (d <= t.borne1) return d * t.coef1
  if (d <= t.borne2) return d * t.coef2 + t.const2Euro
  return d * t.coef3
}

/** Automobile thermique / hydrogène / hybride (non 100 % électrique) — barème 2025 (gel). */
const AUTO_THERMIQUE: Record<PuissanceFiscaleAuto, Tranche3> = {
  3: { borne1: 5000, coef1: 0.529, borne2: 20000, coef2: 0.316, const2Euro: 1065, coef3: 0.37 },
  4: { borne1: 5000, coef1: 0.606, borne2: 20000, coef2: 0.34, const2Euro: 1330, coef3: 0.407 },
  5: { borne1: 5000, coef1: 0.636, borne2: 20000, coef2: 0.357, const2Euro: 1395, coef3: 0.427 },
  6: { borne1: 5000, coef1: 0.665, borne2: 20000, coef2: 0.374, const2Euro: 1457, coef3: 0.447 },
  7: { borne1: 5000, coef1: 0.697, borne2: 20000, coef2: 0.394, const2Euro: 1515, coef3: 0.47 },
}

/** Automobile 100 % électrique — barème 2025 (gel). */
const AUTO_ELECTRIQUE: Record<PuissanceFiscaleAuto, Tranche3> = {
  3: { borne1: 5000, coef1: 0.635, borne2: 20000, coef2: 0.379, const2Euro: 1278, coef3: 0.444 },
  4: { borne1: 5000, coef1: 0.727, borne2: 20000, coef2: 0.408, const2Euro: 1596, coef3: 0.488 },
  5: { borne1: 5000, coef1: 0.763, borne2: 20000, coef2: 0.428, const2Euro: 1674, coef3: 0.512 },
  6: { borne1: 5000, coef1: 0.798, borne2: 20000, coef2: 0.449, const2Euro: 1748, coef3: 0.536 },
  7: { borne1: 5000, coef1: 0.836, borne2: 20000, coef2: 0.473, const2Euro: 1818, coef3: 0.564 },
}

/** Motocyclettes 2 ou 3 roues **> 50 cm³**, thermique / hydrogène / hybride. */
const MOTO_GT50_THERMIQUE: Record<PuissanceFiscaleMotoGt50, Tranche3> = {
  cv_1_2: { borne1: 3000, coef1: 0.395, borne2: 6000, coef2: 0.099, const2Euro: 891, coef3: 0.248 },
  cv_3_4_5: { borne1: 3000, coef1: 0.468, borne2: 6000, coef2: 0.082, const2Euro: 1158, coef3: 0.275 },
  cv_6_plus: { borne1: 3000, coef1: 0.606, borne2: 6000, coef2: 0.079, const2Euro: 1583, coef3: 0.343 },
}

/** Cyclomoteurs ≤ 50 cm³ (thermique / hydrogène / hybride) — une seule ligne de puissance. */
const CYCLO_THERMIQUE: Tranche3 = {
  borne1: 3000,
  coef1: 0.315,
  borne2: 6000,
  coef2: 0.079,
  const2Euro: 711,
  coef3: 0.198,
}

/** Majoration appliquée au barème **thermique moto > 50 cm³** pour estimer le 100 % électrique
 *  lorsque le tableau « moto électrique » n’est pas recopié ici — à recouper avec le simulateur DGFiP. */
const MAJORATION_ELECTRIQUE_MOTO_SUR_THERMIQUE = 1.2

export function montantBaremeAutomobile(
  distanceProfessionnelleKm: number,
  cv: PuissanceFiscaleAuto,
  motorisation: MotorisationBarème
): number {
  const table = motorisation === 'electrique_100' ? AUTO_ELECTRIQUE : AUTO_THERMIQUE
  return montantTranches3(distanceProfessionnelleKm, table[cv])
}

export function montantBaremeDeuxRouesSup50Cm3(
  distanceProfessionnelleKm: number,
  bandeCv: PuissanceFiscaleMotoGt50,
  motorisation: MotorisationBarème
): number {
  const base = montantTranches3(distanceProfessionnelleKm, MOTO_GT50_THERMIQUE[bandeCv])
  if (motorisation === 'electrique_100') {
    return base * MAJORATION_ELECTRIQUE_MOTO_SUR_THERMIQUE
  }
  return base
}

export function montantBaremeDeuxRouesLte50Cm3(
  distanceProfessionnelleKm: number,
  motorisation: MotorisationBarème
): number {
  const base = montantTranches3(distanceProfessionnelleKm, CYCLO_THERMIQUE)
  if (motorisation === 'electrique_100') {
    return base * MAJORATION_ELECTRIQUE_MOTO_SUR_THERMIQUE
  }
  return base
}

/** Point d’entrée unique selon la catégorie et la motorisation. */
export function montantBaremeKm(
  distanceProfessionnelleKm: number,
  params: {
    categorie: CategorieVehiculeBarème
    motorisation: MotorisationBarème
    /** Obligatoire si `automobile` ou `deux_roues_gt_50cm3` */
    puissanceAutoCv?: PuissanceFiscaleAuto
    puissanceMotoGt50?: PuissanceFiscaleMotoGt50
  }
): number {
  switch (params.categorie) {
    case 'automobile': {
      const cv = params.puissanceAutoCv ?? 4
      return montantBaremeAutomobile(distanceProfessionnelleKm, cv, params.motorisation)
    }
    case 'deux_roues_gt_50cm3': {
      const bande = params.puissanceMotoGt50 ?? 'cv_3_4_5'
      return montantBaremeDeuxRouesSup50Cm3(distanceProfessionnelleKm, bande, params.motorisation)
    }
    case 'deux_roues_lte_50cm3':
      return montantBaremeDeuxRouesLte50Cm3(distanceProfessionnelleKm, params.motorisation)
    default: {
      const _exhaustive: never = params.categorie
      throw new Error(`Catégorie non gérée: ${_exhaustive}`)
    }
  }
}
