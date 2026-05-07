/**
 * Exemple CLI : distance orthodromique + montant indicatif barème kilométrique.
 *
 * Usage :
 *   npx --yes tsx scripts/calc-frais-transport.ts <latDépart> <lonDépart> <latArrivée> <lonArrivée> [options]
 *   npx --yes tsx scripts/calc-frais-transport.ts <latArrivée> <lonArrivée> [options]
 *   (2 coordonnées → origine par défaut : 3 Allée Dachau, 97420 Le Port)
 *
 * Options :
 *   --cyclo              cyclomoteur ≤ 50 cm³ (sinon moto > 50 cm³)
 *   --auto --cv <3-7>   automobile (thermique par défaut)
 *   --electrique         100 % électrique (barème voiture ou majoration moto selon catégorie)
 *   --moto-cv <1|2|3>    1 = 1–2 CV, 2 = 3–5 CV, 3 = 6+ CV (moto > 50 cm³ uniquement)
 *   --ar                 compter un aller-retour pour le barème
 *   --plafond-40         plafond 40 km sur l’aller (domicile–travail, approximation)
 *
 * Exemple (Saint-Denis → Saint-Pierre, La Réunion, moto 3–5 CV thermique, A-R) :
 *   npx --yes tsx scripts/calc-frais-transport.ts -20.8789 55.4481 -21.3393 55.4781 --moto-cv 2 --ar
 */

import { estimerFraisTransportDepuisCoordonnees } from '../src/services/fraisTransportEstimation'
import type {
  CategorieVehiculeBarème,
  MotorisationBarème,
  PuissanceFiscaleAuto,
  PuissanceFiscaleMotoGt50,
} from '../src/services/baremeKilometriqueFiscal'

function parseNum(s: string | undefined): number | null {
  if (s === undefined) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.length < 2) {
    console.log(`Documentation fiscale : https://www.impots.gouv.fr/particulier/frais-de-transport\n`)
    console.log(
      `Usage:\n  npx tsx scripts/calc-frais-transport.ts <lat1> <lon1> <lat2> <lon2> [options]\n  npx tsx scripts/calc-frais-transport.ts <lat2> <lon2> [options]   (origine : 3 Allée Dachau, Le Port)\n\nOptions: --cyclo --auto --cv 3-7 --electrique --moto-cv 1|2|3 --ar --plafond-40`
    )
    process.exit(argv.includes('--help') ? 0 : 1)
  }

  const fourPoint =
    argv.length >= 4 &&
    !argv[0].startsWith('--') &&
    parseNum(argv[0]) !== null &&
    parseNum(argv[1]) !== null &&
    parseNum(argv[2]) !== null &&
    parseNum(argv[3]) !== null

  let lat1: number | null
  let lon1: number | null
  let lat2: number | null
  let lon2: number | null
  let optOffset: number

  if (fourPoint) {
    lat1 = parseNum(argv[0])
    lon1 = parseNum(argv[1])
    lat2 = parseNum(argv[2])
    lon2 = parseNum(argv[3])
    optOffset = 4
  } else {
    lat1 = null
    lon1 = null
    lat2 = parseNum(argv[0])
    lon2 = parseNum(argv[1])
    optOffset = 2
  }

  if (lat2 === null || lon2 === null || (fourPoint && (lat1 === null || lon1 === null))) {
    console.error('Coordonnées invalides.')
    process.exit(1)
  }

  let categorie: CategorieVehiculeBarème = 'deux_roues_gt_50cm3'
  let motorisation: MotorisationBarème = 'thermique_hydrogene_hybride'
  let puissanceMotoGt50: PuissanceFiscaleMotoGt50 = 'cv_3_4_5'
  let puissanceAutoCv: PuissanceFiscaleAuto | undefined
  let compterAllerRetour = false
  let appliquerPlafondFiscal40KmSurAller = false

  for (let i = optOffset; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--cyclo') categorie = 'deux_roues_lte_50cm3'
    if (a === '--auto') categorie = 'automobile'
    if (a === '--electrique') motorisation = 'electrique_100'
    if (a === '--ar') compterAllerRetour = true
    if (a === '--plafond-40') appliquerPlafondFiscal40KmSurAller = true
    if (a === '--moto-cv') {
      const band = argv[i + 1]
      if (band === '1' || band === '2' || band === '3') {
        i++
        if (band === '1') puissanceMotoGt50 = 'cv_1_2'
        else if (band === '2') puissanceMotoGt50 = 'cv_3_4_5'
        else puissanceMotoGt50 = 'cv_6_plus'
      }
    }
    if (a === '--cv') {
      const cv = Number(argv[i + 1]) as PuissanceFiscaleAuto
      if ([3, 4, 5, 6, 7].includes(cv)) {
        i++
        puissanceAutoCv = cv
      }
    }
  }

  const r = estimerFraisTransportDepuisCoordonnees({
    ...(fourPoint && lat1 !== null && lon1 !== null ? { origine: { latitude: lat1, longitude: lon1 } } : {}),
    destination: { latitude: lat2, longitude: lon2 },
    categorie,
    motorisation,
    puissanceAutoCv: categorie === 'automobile' ? puissanceAutoCv ?? 4 : undefined,
    puissanceMotoGt50: categorie === 'deux_roues_gt_50cm3' ? puissanceMotoGt50 : undefined,
    compterAllerRetour,
    appliquerPlafondFiscal40KmSurAller,
  })

  console.log(JSON.stringify(r, null, 2))
}

main()
