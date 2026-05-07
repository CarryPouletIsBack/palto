import { getDashboardAuthorizationHeader } from './authService'
import { apiBaseUrl, useComplianceApi } from '../constants/featureFlags'
import type {
  ChauffeurComplianceSnapshot,
  ChauffeurLegalDocId,
} from '../constants/chauffeurComplianceStorage'

const API_BASE_URL = apiBaseUrl()

export function complianceApiEnabled(): boolean {
  return useComplianceApi()
}

export async function fetchChauffeurComplianceSnapshotFromApi(email: string): Promise<ChauffeurComplianceSnapshot> {
  const auth = getDashboardAuthorizationHeader()
  if (!auth) throw new Error('Token dashboard absent')
  const url = new URL(`${API_BASE_URL}/chauffeur`, window.location.origin)
  url.searchParams.set('resource', 'compliance')
  url.searchParams.set('email', email)
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Authorization: auth },
  })
  const data = (await res.json().catch(() => ({}))) as {
    snapshot?: ChauffeurComplianceSnapshot
    error?: string
  }
  if (!res.ok || !data.snapshot) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
  return data.snapshot
}

export async function setChauffeurComplianceDocOnApi(
  email: string,
  docId: ChauffeurLegalDocId,
  value: boolean
): Promise<ChauffeurComplianceSnapshot> {
  const auth = getDashboardAuthorizationHeader()
  if (!auth) throw new Error('Token dashboard absent')
  const res = await fetch(`${API_BASE_URL}/chauffeur?resource=compliance`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, docId, value }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    snapshot?: ChauffeurComplianceSnapshot
    error?: string
  }
  if (!res.ok || !data.snapshot) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
  return data.snapshot
}
