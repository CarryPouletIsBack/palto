import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getVerifiedDashboardEmail } from '../lib/chauffeurAuth'

const MemberSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'driver']),
  status: z.enum(['pending', 'active']),
  invitedAt: z.string(),
  vehiclePlate: z.string().optional(),
  vehicleModel: z.string().optional(),
  zoneId: z.string().optional(),
  availability: z.string().optional(),
})

const OrgSchema = z.object({
  id: z.string(),
  name: z.string(),
  fleetCode: z.string(),
  base: z.string(),
  createdAt: z.string(),
  adminEmail: z.string().email(),
  members: z.array(MemberSchema),
  coverImageUrl: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
})

const BodySchema = z.object({
  organization: OrgSchema.nullable(),
})

declare global {
  var __paltoChauffeurOrgStore: Record<string, z.infer<typeof OrgSchema> | null> | undefined
}

function store(): Record<string, z.infer<typeof OrgSchema> | null> {
  if (!globalThis.__paltoChauffeurOrgStore) globalThis.__paltoChauffeurOrgStore = {}
  return globalThis.__paltoChauffeurOrgStore
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const dashboardEmail = getVerifiedDashboardEmail(req)
  if (!dashboardEmail) {
    res.status(401).json({ error: 'Non autorise' })
    return
  }

  if (req.method === 'GET') {
    const organization = store()[dashboardEmail] ?? null
    res.status(200).json({ organization })
    return
  }

  if (req.method === 'PUT') {
    const parsed = BodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })
      return
    }
    store()[dashboardEmail] = parsed.data.organization
    res.status(200).json({ ok: true })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
