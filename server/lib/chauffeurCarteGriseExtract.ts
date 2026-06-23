export type ExtractedVehicleTypeSlug = 'berline' | 'utilitaire' | 'moto' | 'scooter'

export type ExtractedVehicleMotorisation = 'thermique_hydrogene_hybride' | 'electrique_100'

export type ExtractedVehicleInfo = {
  brand: string | null
  model: string | null
  label: string | null
  vehicleTypeSlug: ExtractedVehicleTypeSlug | null
  motorisation: ExtractedVehicleMotorisation | null
}

const BERLINE_GENRES = new Set(['VP', 'BREAK', 'COUPE', 'CAB', 'VOIT'])
const UTILITAIRE_GENRES = new Set(['CTTE', 'VUL', 'CAM', 'TRR', 'TCP', 'VASP'])
const MOTO_GENRES = new Set(['MTL', 'MTT1', 'MTT2', 'MTQ', 'MTM', 'MOT', 'QM'])
const SCOOTER_GENRES = new Set(['CL', 'CYCL', 'QM'])

const ELECTRIC_ENERGY = new Set(['EL', 'ET', 'EM', 'EH', 'EN', 'EP', 'EQ', 'FE', 'FG', 'FL', 'FN', 'FH', 'PH'])

function normalizeExtractText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanFieldValue(raw: string): string {
  return normalizeExtractText(raw)
    .replace(/[^A-Za-z0-9\s\-'.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCaseWords(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function valueAfterLabel(text: string, labels: string[]): string | null {
  const upper = normalizeExtractText(text).toUpperCase()
  const stopLabels = [
    'MARQUE',
    'MODELE',
    'MODÈLE',
    'DENOMINATION',
    'DÉNOMINATION',
    'GENRE',
    'ENERGIE',
    'ÉNERGIE',
    'CARBURANT',
    'EXPIRE',
    'VALID',
    'D.1',
    'D.2',
    'D.3',
    'J.1',
    'P.3',
    'IMMATRICULATION',
    'CERTIFICAT',
  ]

  for (const label of labels) {
    const labelUpper = label.toUpperCase()
    const idx = upper.indexOf(labelUpper)
    if (idx < 0) continue
    let after = upper.slice(idx + labelUpper.length).trim().replace(/^[:.\s-]+/, '')
    let end = after.length
    for (const stop of stopLabels) {
      if (stop === labelUpper) continue
      const stopIdx = after.indexOf(stop)
      if (stopIdx > 0 && stopIdx < end) end = stopIdx
    }
    const value = cleanFieldValue(after.slice(0, end))
    if (value.length >= 2 && value.length <= 48) return value
  }
  return null
}

function extractLabeledValue(text: string, labels: string[], patterns: RegExp[] = []): string | null {
  const fromLabel = valueAfterLabel(text, labels)
  if (fromLabel) return fromLabel

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match?.[1]) continue
    const value = cleanFieldValue(match[1])
    if (value.length >= 2 && value.length <= 48) return value
  }
  return null
}

function mapGenreToVehicleSlug(genre: string | null): ExtractedVehicleTypeSlug | null {
  if (!genre) return null
  const code = genre.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!code) return null
  if (BERLINE_GENRES.has(code)) return 'berline'
  if (UTILITAIRE_GENRES.has(code)) return 'utilitaire'
  if (MOTO_GENRES.has(code)) return 'moto'
  if (SCOOTER_GENRES.has(code)) return 'scooter'
  return null
}

function mapEnergyToMotorisation(energy: string | null): ExtractedVehicleMotorisation | null {
  if (!energy) return null
  const code = energy.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!code) return null
  if (ELECTRIC_ENERGY.has(code)) return 'electrique_100'
  return 'thermique_hydrogene_hybride'
}

function extractCodeAfterKeyword(text: string, keywords: string[], codePattern: RegExp): string | null {
  const upper = normalizeExtractText(text).toUpperCase()
  let bestIdx = -1
  for (const keyword of keywords) {
    const idx = upper.indexOf(keyword.toUpperCase())
    if (idx >= 0 && (bestIdx < 0 || idx < bestIdx)) bestIdx = idx
  }
  if (bestIdx < 0) return null
  const tail = upper.slice(bestIdx)
  const match = tail.match(codePattern)
  return match?.[1] ?? null
}

/** Extrait marque, modèle, genre et énergie d’un texte de carte grise (PDF). */
export function extractVehicleFromCarteGrise(text: string): ExtractedVehicleInfo {
  const brandRaw = extractLabeledValue(
    text,
    ['MARQUE', 'D.1'],
    [/\bD\.?\s*1\b[:\s]*([A-Z0-9][A-Z0-9\-'.]{1,24})/i]
  )

  const modelRaw = extractLabeledValue(
    text,
    ['MODELE', 'MODÈLE', 'DENOMINATION', 'DÉNOMINATION', 'D.3', 'D.2'],
    [/\bD\.?\s*3\b[:\s]*([A-Z0-9][A-Z0-9\-'.]{1,24})/i]
  )

  const genreRaw =
    extractCodeAfterKeyword(text, ['GENRE', 'J.1'], /\b(?:GENRE|J\.?\s*1)\b[:\s]*([A-Z]{2,5})\b/) ??
    extractLabeledValue(text, ['GENRE', 'J.1'], [/\bJ\.?\s*1\b[:\s]*([A-Z]{2,5})\b/i])

  const energyRaw =
    extractCodeAfterKeyword(text, ['ENERGIE', 'ÉNERGIE', 'CARBURANT', 'P.3'], /\b(?:ENERGIE|ÉNERGIE|CARBURANT|P\.?\s*3)\b[:\s]*([A-Z]{2})\b/) ??
    extractLabeledValue(text, ['ENERGIE', 'ÉNERGIE', 'CARBURANT', 'P.3'], [/\bP\.?\s*3\b[:\s]*([A-Z]{2})\b/i])

  const brand = brandRaw ? titleCaseWords(brandRaw) : null
  const model = modelRaw ? cleanFieldValue(modelRaw).toUpperCase() : null
  const label = [brand, model].filter(Boolean).join(' ') || null
  const vehicleTypeSlug = mapGenreToVehicleSlug(genreRaw)
  const motorisation = mapEnergyToMotorisation(energyRaw)

  return {
    brand,
    model,
    label,
    vehicleTypeSlug,
    motorisation,
  }
}
