import { getDashboardAuthorizationHeader } from './authService'
import type { ChauffeurOrgSnapshot } from '../constants/chauffeurOrganizationStorage'
import { apiBaseUrl, useOrgApi } from '../constants/featureFlags'

const API_BASE_URL = apiBaseUrl()

export function organizationApiEnabled(): boolean {
  return useOrgApi()
}

export async function fetchChauffeurOrganizationFromApi(): Promise<ChauffeurOrgSnapshot | null> {
  const auth = getDashboardAuthorizationHeader()
  if (!auth) throw new Error('Token dashboard absent')
  const res = await fetch(`${API_BASE_URL}/chauffeur?resource=organization`, {
    method: 'GET',
    headers: { Authorization: auth },
  })
  const data = (await res.json().catch(() => ({}))) as {
    organization?: ChauffeurOrgSnapshot | null
    error?: string
  }
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)
  return data.organization ?? null
}

export async function saveChauffeurOrganizationToApi(organization: ChauffeurOrgSnapshot | null): Promise<void> {
  const auth = getDashboardAuthorizationHeader()
  if (!auth) throw new Error('Token dashboard absent')
  const res = await fetch(`${API_BASE_URL}/chauffeur?resource=organization`, {
    method: 'PUT',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ organization }),
  })
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
}
