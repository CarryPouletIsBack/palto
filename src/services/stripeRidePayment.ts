import { apiBaseUrl } from '../constants/featureFlags'

const API_BASE_URL = apiBaseUrl()

export async function confirmRidePaymentAuthorized(courseId: string): Promise<{
  ok: boolean
  status: string
}> {
  const res = await fetch(`${API_BASE_URL}/stripe?action=confirm-authorized`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId }),
  })
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; status?: string; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
  if (!data.ok) {
    throw new Error('Paiement non autorise sur la carte')
  }
  return { ok: true, status: data.status ?? 'requires_capture' }
}
