import { getDashboardAuthorizationHeader } from './authService'
import type { ChauffeurActivityStatsForView, ChauffeurHeatmapStatsForView } from '../components/DashboardStats'
import { apiBaseUrl, useStatsApi } from '../constants/featureFlags'

const API_BASE_URL = apiBaseUrl()

export function statsApiEnabled(): boolean {
  return useStatsApi()
}

export type ChauffeurStatsApiPayload = {
  stats: ChauffeurActivityStatsForView
  heatmap?: ChauffeurHeatmapStatsForView
}

export async function fetchChauffeurStatsFromApi(): Promise<ChauffeurStatsApiPayload> {
  const auth = getDashboardAuthorizationHeader()
  if (!auth) throw new Error('Token dashboard absent')
  const res = await fetch(`${API_BASE_URL}/chauffeur?resource=stats`, {
    method: 'GET',
    headers: { Authorization: auth },
  })
  const data = (await res.json().catch(() => ({}))) as {
    stats?: ChauffeurActivityStatsForView
    heatmap?: ChauffeurHeatmapStatsForView
    error?: string
  }
  if (!res.ok || !data.stats) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
  return { stats: data.stats, heatmap: data.heatmap }
}
