import {
  extractVehicleFromCarteGrise,
  type ExtractedVehicleInfo,
} from './chauffeurCarteGriseExtract.js'

export type ChauffeurLegalDocumentType = 'permis' | 'assurance' | 'carte-grise' | 'controle-technique'

export type DocumentValidationCheck = {
  id: string
  ok: boolean
  message: string
}

export type ChauffeurDocumentValidationResult = {
  valid: boolean
  status: 'ok' | 'rejected'
  checks: DocumentValidationCheck[]
  expiry: string | null
  extractedPlate: string | null
  extractedVehicle: ExtractedVehicleInfo | null
  summary: string
}

export type ValidateChauffeurDocumentInput = {
  docType: ChauffeurLegalDocumentType
  fileName: string
  mimeType: string
  buffer: Buffer
  expectedPlate?: string | null
}

const MIN_BYTES = 4_096
const MAX_BYTES = 12 * 1024 * 1024

const KEYWORDS: Record<ChauffeurLegalDocumentType, string[]> = {
  permis: ['PERMIS', 'CONDUITE', 'REPUBLIQUE', 'CATEGOR', 'CÉGOR', 'FRANCAISE', 'FRANÇAISE'],
  assurance: ['ASSURANCE', 'ATTESTATION', 'RESPONSABIL', 'VEHICULE', 'VÉHICULE', 'POLICE'],
  'carte-grise': ['IMMATRICULATION', 'CERTIFICAT', 'CARTE', 'GRISE', 'VEHICULE', 'VÉHICULE'],
  'controle-technique': ['CONTROLE', 'CONTRÔLE', 'TECHNIQUE', 'PROCES', 'PROCÈS', 'VERBAL'],
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
}

function detectMime(buffer: Buffer, fileName: string, mimeType: string): string | null {
  const declared = mimeType.trim().toLowerCase()
  if (declared.startsWith('image/') || declared === 'application/pdf') return declared

  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf'
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  return null
}

function extractTextFromPdf(buffer: Buffer): string {
  const latin = buffer.toString('latin1')
  const chunks: string[] = []
  const parenMatches = latin.match(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g) ?? []
  for (const match of parenMatches) {
    const inner = match.slice(1, -1).replace(/\\n/g, ' ').replace(/\\r/g, ' ').trim()
    if (inner.length >= 2) chunks.push(inner)
  }
  const streamMatches = latin.match(/stream[\s\S]*?endstream/g) ?? []
  for (const block of streamMatches) {
    const ascii = block.replace(/[^\x20-\x7E\u00C0-\u024F]/g, ' ')
    if (ascii.length >= 12) chunks.push(ascii)
  }
  return chunks.join(' ').replace(/\s+/g, ' ').trim()
}

function extractDocumentText(buffer: Buffer, mime: string): string {
  if (mime === 'application/pdf') return extractTextFromPdf(buffer)
  return ''
}

function findFrenchPlate(text: string): string | null {
  const match = text.match(/\b([A-HJ-NP-TV-Z]{2}[-\s]?\d{3}[-\s]?[A-HJ-NP-TV-Z]{2})\b/i)
  if (!match?.[1]) return null
  return match[1].replace(/\s/g, '').toUpperCase().replace(/([A-Z]{2})(\d{3})([A-Z]{2})/, '$1-$2-$3')
}

function normalizePlate(plate: string | null | undefined): string | null {
  const raw = String(plate ?? '').trim().toUpperCase().replace(/\s+/g, '')
  if (!raw) return null
  const compact = raw.replace(/-/g, '')
  const match = compact.match(/^([A-HJ-NP-TV-Z]{2})(\d{3})([A-HJ-NP-TV-Z]{2})$/)
  if (!match) return raw.includes('-') ? raw : null
  return `${match[1]}-${match[2]}-${match[3]}`
}

function parseFrenchDate(value: string): Date | null {
  const m = value.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  let year = Number(m[3])
  if (year < 100) year += year >= 70 ? 1900 : 2000
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }
  return date
}

function findBestExpiryDate(text: string): string | null {
  const normalized = text.replace(/\s+/g, ' ')
  const datedSections = normalized.split(/valid|expire|expiration|echeance|échéance|jusqu/i)
  const candidates: Date[] = []

  const scan = (chunk: string) => {
    const matches = chunk.match(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g) ?? []
    for (const token of matches) {
      const parsed = parseFrenchDate(token)
      if (parsed) candidates.push(parsed)
    }
  }

  scan(normalized)
  for (const section of datedSections.slice(1)) {
    scan(section.slice(0, 40))
  }

  const future = candidates.filter((d) => d.getTime() >= Date.now() - 24 * 60 * 60 * 1000)
  const pool = future.length > 0 ? future : candidates
  if (!pool.length) return null

  pool.sort((a, b) => b.getTime() - a.getTime())
  const best = pool[0]
  return best.toISOString().slice(0, 10)
}

function countKeywordHits(docType: ChauffeurLegalDocumentType, text: string): number {
  const haystack = normalizeText(text)
  let hits = 0
  for (const keyword of KEYWORDS[docType]) {
    if (haystack.includes(normalizeText(keyword))) hits += 1
  }
  return hits
}

function requiredKeywordHits(docType: ChauffeurLegalDocumentType): number {
  switch (docType) {
    case 'permis':
      return 2
    case 'assurance':
      return 2
    case 'carte-grise':
      return 2
    case 'controle-technique':
      return 2
    default: {
      const _exhaustive: never = docType
      return _exhaustive
    }
  }
}

function formatExpiryFr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}/${m}/${y}`
}

export function validateChauffeurDocument(
  input: ValidateChauffeurDocumentInput
): ChauffeurDocumentValidationResult {
  const checks: DocumentValidationCheck[] = []
  const { buffer, docType, fileName, mimeType } = input

  const sizeOk = buffer.length >= MIN_BYTES && buffer.length <= MAX_BYTES
  checks.push({
    id: 'file_size',
    ok: sizeOk,
    message: sizeOk
      ? `Taille fichier acceptable (${Math.round(buffer.length / 1024)} Ko).`
      : `Taille invalide (${buffer.length} octets). Min ${MIN_BYTES}, max ${MAX_BYTES}.`,
  })

  const mime = detectMime(buffer, fileName, mimeType)
  const mimeOk =
    mime === 'application/pdf' ||
    mime === 'image/jpeg' ||
    mime === 'image/png' ||
    mime === 'image/webp'
  checks.push({
    id: 'file_format',
    ok: mimeOk,
    message: mimeOk
      ? `Format reconnu (${mime}).`
      : 'Format non supporté. Utilisez PDF, JPG, PNG ou WEBP.',
  })

  if (!sizeOk || !mimeOk || !mime) {
    return {
      valid: false,
      status: 'rejected',
      checks,
      expiry: null,
      extractedPlate: null,
      extractedVehicle: null,
      summary: 'Fichier rejeté : format ou taille invalide.',
    }
  }

  const extractedText = extractDocumentText(buffer, mime)
  const isImage = mime.startsWith('image/')

  if (isImage) {
    checks.push({
      id: 'readable_content',
      ok: buffer.length >= 20_000,
      message:
        buffer.length >= 20_000
          ? 'Image reçue.'
          : 'Image trop légère ou illisible.',
    })
    checks.push({
      id: 'document_keywords',
      ok: false,
      message:
        'Vérification automatique impossible sur une photo. Téléversez un PDF numérique (export ou scan OCR).',
    })
    return {
      valid: false,
      status: 'rejected',
      checks,
      expiry: null,
      extractedPlate: null,
      extractedVehicle: null,
      summary: 'Document photo : envoyez un PDF pour une validation automatique.',
    }
  }

  const readableOk = extractedText.length >= 24
  checks.push({
    id: 'readable_content',
    ok: readableOk,
    message: readableOk
      ? 'Texte extrait du PDF.'
      : 'PDF illisible ou scanné sans texte extractible.',
  })

  const keywordHits = countKeywordHits(docType, extractedText)
  const keywordNeed = requiredKeywordHits(docType)
  const keywordsOk = keywordHits >= keywordNeed
  checks.push({
    id: 'document_keywords',
    ok: keywordsOk,
    message: keywordsOk
      ? `Document cohérent avec « ${docType} » (${keywordHits} indicateur(s) trouvé(s)).`
      : `Le contenu ne correspond pas à un document « ${docType} » (${keywordHits}/${keywordNeed} indicateurs).`,
  })

  const extractedPlate = findFrenchPlate(extractedText)
  const expectedPlate = normalizePlate(input.expectedPlate)
  const needsPlate = docType === 'carte-grise' || docType === 'assurance'
  const plateOk =
    !needsPlate ||
    (expectedPlate
      ? Boolean(extractedPlate && normalizePlate(extractedPlate) === expectedPlate)
      : Boolean(extractedPlate))
  checks.push({
    id: 'plate_match',
    ok: plateOk,
    message: plateOk
      ? expectedPlate
        ? `Plaque concordante (${expectedPlate}).`
        : extractedPlate
          ? `Plaque détectée (${extractedPlate}).`
          : 'Plaque non requise pour ce type de document.'
      : expectedPlate
        ? `Plaque attendue ${expectedPlate}, détectée ${extractedPlate ?? 'aucune'}.`
        : 'Plaque d’immatriculation introuvable sur le document.',
  })

  const expiryIso = findBestExpiryDate(extractedText)
  const expiryOk = Boolean(expiryIso)
  checks.push({
    id: 'expiry_date',
    ok: expiryOk,
    message: expiryOk
      ? `Date de validité détectée (${formatExpiryFr(expiryIso!)}).`
      : 'Aucune date de validité lisible trouvée.',
  })

  const extractedVehicle =
    docType === 'carte-grise' ? extractVehicleFromCarteGrise(extractedText) : null
  if (extractedVehicle?.label) {
    checks.push({
      id: 'vehicle_identity',
      ok: true,
      message: `Véhicule détecté : ${extractedVehicle.label}${
        extractedVehicle.vehicleTypeSlug ? ` (${extractedVehicle.vehicleTypeSlug})` : ''
      }.`,
    })
  }

  const criticalOk = checks
    .filter((c) =>
      ['file_size', 'file_format', 'readable_content', 'document_keywords', 'plate_match'].includes(c.id)
    )
    .every((c) => c.ok)

  const valid = criticalOk && expiryOk

  const summary = valid
    ? extractedVehicle?.label
      ? `Document validé — véhicule : ${extractedVehicle.label}${
          expiryIso ? `, valide jusqu’au ${formatExpiryFr(expiryIso)}` : ''
        }.`
      : `Document validé${expiryIso ? ` — valide jusqu’au ${formatExpiryFr(expiryIso)}` : ''}.`
    : checks.find((c) => !c.ok)?.message ?? 'Document rejeté.'

  return {
    valid,
    status: valid ? 'ok' : 'rejected',
    checks,
    expiry: expiryIso ? formatExpiryFr(expiryIso) : null,
    extractedPlate,
    extractedVehicle,
    summary,
  }
}
