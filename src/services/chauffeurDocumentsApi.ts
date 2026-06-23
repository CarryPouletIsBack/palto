import { apiBaseUrl } from '../constants/featureFlags'
import { DASHBOARD_AUTH_TOKEN_KEY } from './authService'

export type ChauffeurDocumentKey = 'permis' | 'assurance' | 'carte-grise' | 'controle-technique'

const API_BASE_URL = apiBaseUrl()

export type DocumentValidationApiResult = {
  valid: boolean
  status: 'ok' | 'rejected'
  summary: string
  expiry: string | null
  extractedPlate: string | null
  extractedVehicle: {
    brand: string | null
    model: string | null
    label: string | null
    vehicleTypeSlug: 'berline' | 'utilitaire' | 'moto' | 'scooter' | null
    motorisation: 'thermique_hydrogene_hybride' | 'electrique_100' | null
  } | null
  checks: Array<{ id: string; ok: boolean; message: string }>
}

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)?.trim()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const raw = String(reader.result ?? '')
      const comma = raw.indexOf(',')
      resolve(comma >= 0 ? raw.slice(comma + 1) : raw)
    }
    reader.onerror = () => reject(new Error('Lecture fichier impossible'))
    reader.readAsDataURL(file)
  })
}

export async function validateChauffeurDocumentUpload(input: {
  docType: ChauffeurDocumentKey
  file: File
  expectedPlate?: string | null
}): Promise<{ success: boolean; result?: DocumentValidationApiResult; error?: string }> {
  try {
    const headers = authHeaders()
    if (!('Authorization' in headers)) {
      return { success: false, error: 'SESSION_REQUIRED' }
    }
    const dataBase64 = await fileToBase64(input.file)
    const response = await fetch(`${API_BASE_URL}/chauffeur?resource=document-validate`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docType: input.docType,
        fileName: input.file.name,
        mimeType: input.file.type || 'application/octet-stream',
        dataBase64,
        expectedPlate: input.expectedPlate ?? undefined,
      }),
    })
    const data = (await response.json().catch(() => null)) as {
      success?: boolean
      result?: DocumentValidationApiResult
      error?: string
    } | null
    if (!response.ok || !data?.success || !data.result) {
      return { success: false, error: data?.error || `Erreur serveur (${response.status})` }
    }
    return { success: true, result: data.result }
  } catch (error) {
    console.error('[chauffeurDocumentsApi] validate', error)
    return { success: false, error: 'NETWORK_ERROR' }
  }
}
