import type { VercelRequest } from '@vercel/node'

/** Valide le token dashboard (base64 email:timestamp) contre DASHBOARD_EMAIL. */
export function getVerifiedDashboardEmail(req: VercelRequest): string | null {
  const raw = req.headers.authorization
  if (!raw?.toLowerCase().startsWith('bearer ')) return null
  const token = raw.slice(7).trim()
  if (!token) return null
  const expected = process.env.DASHBOARD_EMAIL?.trim()
  if (!expected) return null
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const email = decoded.split(':')[0]?.trim()
    if (!email || email !== expected) return null
    return email
  } catch {
    return null
  }
}

export function getChauffeurDriverExternalKey(): string {
  return (process.env.CHAUFFEUR_DRIVER_EXTERNAL_KEY ?? 'd1').trim() || 'd1'
}
