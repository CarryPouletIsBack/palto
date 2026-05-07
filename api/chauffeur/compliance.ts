import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getVerifiedDashboardEmail } from '../lib/chauffeurAuth'

const LEGAL_DOC_IDS = [
  'driving_license',
  'vtc_or_goods_capacity',
  'digital_identity',
  'kbis_siret',
  'security_declaration',
  'rc_pro',
  'insurance_civil_pro',
  'vehicle_insurance',
] as const

type LegalDocId = (typeof LEGAL_DOC_IDS)[number]
type ComplianceSnapshot = Record<LegalDocId, boolean>

const QuerySchema = z.object({
  email: z.string().email(),
})

const BodySchema = z.object({
  email: z.string().email(),
  docId: z.enum(LEGAL_DOC_IDS),
  value: z.boolean(),
})

declare global {
  var __paltoComplianceStore: Record<string, Record<string, ComplianceSnapshot>> | undefined
}

function emptySnapshot(): ComplianceSnapshot {
  return {
    driving_license: false,
    vtc_or_goods_capacity: false,
    digital_identity: false,
    kbis_siret: false,
    security_declaration: false,
    rc_pro: false,
    insurance_civil_pro: false,
    vehicle_insurance: false,
  }
}

function store() {
  if (!globalThis.__paltoComplianceStore) globalThis.__paltoComplianceStore = {}
  return globalThis.__paltoComplianceStore
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const dashboardEmail = await getVerifiedDashboardEmail(req)
  if (!dashboardEmail) {
    res.status(401).json({ error: 'Non autorise' })
    return
  }

  const root = store()
  if (!root[dashboardEmail]) root[dashboardEmail] = {}

  if (req.method === 'GET') {
    const parsed = QuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: 'Query invalide', details: parsed.error.flatten() })
      return
    }
    const email = parsed.data.email.trim().toLowerCase()
    const snapshot = root[dashboardEmail][email] ?? emptySnapshot()
    res.status(200).json({ snapshot })
    return
  }

  if (req.method === 'POST') {
    const parsed = BodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })
      return
    }
    const email = parsed.data.email.trim().toLowerCase()
    const current = root[dashboardEmail][email] ?? emptySnapshot()
    current[parsed.data.docId] = parsed.data.value
    root[dashboardEmail][email] = current
    res.status(200).json({ snapshot: current })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
