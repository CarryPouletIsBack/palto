/**
 * Valide un document chauffeur (PDF) : format, contenu, plaque, date d’expiration.
 *
 * Usage :
 *   npx --yes tsx scripts/validate-chauffeur-document.ts --type permis --file ./permis.pdf
 *   npx --yes tsx scripts/validate-chauffeur-document.ts --type carte-grise --file ./cg.pdf --plate AA-123-BB
 *
 * Types : permis | assurance | carte-grise | controle-technique
 */

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import {
  validateChauffeurDocument,
  type ChauffeurLegalDocumentType,
} from '../server/lib/chauffeurDocumentValidation.js'

const DOC_TYPES: ChauffeurLegalDocumentType[] = [
  'permis',
  'assurance',
  'carte-grise',
  'controle-technique',
]

function parseArgs(argv: string[]) {
  let docType: ChauffeurLegalDocumentType | null = null
  let filePath: string | null = null
  let plate: string | null = null
  let mimeType = 'application/pdf'

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  npx --yes tsx scripts/validate-chauffeur-document.ts --type <permis|assurance|carte-grise|controle-technique> --file <chemin> [--plate AA-123-BB] [--mime application/pdf]

Exemple :
  npx --yes tsx scripts/validate-chauffeur-document.ts --type permis --file ./permis.pdf`)
      process.exit(0)
    }
    if (arg === '--type') {
      const next = argv[i + 1]
      if (next && DOC_TYPES.includes(next as ChauffeurLegalDocumentType)) {
        docType = next as ChauffeurLegalDocumentType
      }
      i += 1
      continue
    }
    if (arg === '--file') {
      filePath = argv[i + 1] ?? null
      i += 1
      continue
    }
    if (arg === '--plate') {
      plate = argv[i + 1] ?? null
      i += 1
      continue
    }
    if (arg === '--mime') {
      mimeType = argv[i + 1] ?? mimeType
      i += 1
    }
  }

  return { docType, filePath, plate, mimeType }
}

function main() {
  const { docType, filePath, plate, mimeType } = parseArgs(process.argv.slice(2))
  if (!docType || !filePath) {
    console.error('Arguments requis : --type et --file')
    process.exit(1)
  }

  const buffer = readFileSync(filePath)
  const result = validateChauffeurDocument({
    docType,
    fileName: basename(filePath),
    mimeType,
    buffer,
    expectedPlate: plate,
  })

  console.log(`Fichier : ${filePath}`)
  console.log(`Type    : ${docType}`)
  console.log(`Statut  : ${result.valid ? 'VALIDÉ' : 'REJETÉ'}`)
  console.log(`Résumé  : ${result.summary}`)
  if (result.expiry) console.log(`Expiration : ${result.expiry}`)
  if (result.extractedPlate) console.log(`Plaque     : ${result.extractedPlate}`)
  if (result.extractedVehicle?.label) {
    console.log(`Véhicule   : ${result.extractedVehicle.label}`)
    if (result.extractedVehicle.vehicleTypeSlug) {
      console.log(`Catégorie  : ${result.extractedVehicle.vehicleTypeSlug}`)
    }
    if (result.extractedVehicle.motorisation) {
      console.log(`Motoris.   : ${result.extractedVehicle.motorisation}`)
    }
  }
  console.log('\nContrôles :')
  for (const check of result.checks) {
    console.log(`  [${check.ok ? 'OK' : 'KO'}] ${check.id} — ${check.message}`)
  }

  process.exit(result.valid ? 0 : 2)
}

main()
