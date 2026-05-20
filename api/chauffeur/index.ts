import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { expireStaleInstantPendingCourses } from '../../server/lib/expireStaleInstantPendingCourses.js'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'
import { getVerifiedChauffeurSession } from '../../server/lib/chauffeurAuth.js'
import { sameDriverExternalKey } from '../../server/lib/driverIdentity.js'

const ComplianceQuerySchema = z.object({ email: z.string().email() })
const ComplianceBodySchema = z.object({
  email: z.string().email(),
  docId: z.enum([
    'driving_license',
    'vtc_or_goods_capacity',
    'digital_identity',
    'kbis_siret',
    'security_declaration',
    'rc_pro',
    'insurance_civil_pro',
    'vehicle_insurance',
  ]),
  value: z.boolean(),
})
const RideActionBodySchema = z.object({
  courseId: z.string().uuid(),
  action: z.enum(['accept', 'start', 'complete', 'cancel']),
})
const OrgMemberSchema = z.object({
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
  members: z.array(OrgMemberSchema),
  coverImageUrl: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
})
const OrganizationBodySchema = z.object({ organization: OrgSchema.nullable() })

const PresenceBodySchema = z.object({
  lng: z.coerce.number().finite(),
  lat: z.coerce.number().finite(),
  isAvailable: z.boolean().optional(),
})

type CourseRow = {
  id: string
  external_code: string | null
  client_id: string | null
  scheduled_date: string
  scheduled_time: string
  pickup_address: string
  dropoff_address: string
  status: string
  amount_eur: number
  distance_km: number | null
  pickup_lng: number | null
  pickup_lat: number | null
  dropoff_lng: number | null
  dropoff_lat: number | null
  booking_kind: string
  requested_driver_external_key: string | null
  assigned_driver_external_key: string | null
  accepted_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
  clients?: { full_name: string; email: string | null; phone: string } | null
}

type ClientLite = {
  id: string
  full_name: string
  email: string | null
  phone: string
}

declare global {
  var __paltoComplianceStore: Record<string, Record<string, Record<string, boolean>>> | undefined
  var __paltoChauffeurOrgStore: Record<string, z.infer<typeof OrgSchema> | null> | undefined
}

function complianceStore() {
  if (!globalThis.__paltoComplianceStore) globalThis.__paltoComplianceStore = {}
  return globalThis.__paltoComplianceStore
}
function organizationStore() {
  if (!globalThis.__paltoChauffeurOrgStore) globalThis.__paltoChauffeurOrgStore = {}
  return globalThis.__paltoChauffeurOrgStore
}

function emptyComplianceSnapshot(): Record<string, boolean> {
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

function visibleForDriver(row: CourseRow, driverKey: string): boolean {
  if (row.status === 'pending') {
    if (row.booking_kind === 'scheduled') return true
    return sameDriverExternalKey(row.requested_driver_external_key, driverKey)
  }
  if (row.status === 'accepted' || row.status === 'in_progress') {
    return sameDriverExternalKey(row.assigned_driver_external_key, driverKey)
  }
  if (row.status === 'completed' || row.status === 'cancelled') {
    return sameDriverExternalKey(row.assigned_driver_external_key, driverKey)
  }
  return false
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function handleRidesGet(res: VercelResponse, driverKey: string) {
  const supabase = getSupabaseAdmin()
  try {
    await expireStaleInstantPendingCourses(supabase)
  } catch (e) {
    console.error('[chauffeur/rides GET] expire stale instant', e)
  }
  const { data, error } = await supabase
    .from('courses')
    .select(
      'id, external_code, client_id, scheduled_date, scheduled_time, pickup_address, dropoff_address, status, amount_eur, distance_km, pickup_lng, pickup_lat, dropoff_lng, dropoff_lat, booking_kind, requested_driver_external_key, assigned_driver_external_key, accepted_at, started_at, completed_at, cancelled_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return res.status(500).json({ error: 'Lecture impossible' })
  const rows = (data ?? []) as CourseRow[]
  const ridesBase = rows.filter((r) => visibleForDriver(r, driverKey))
  const clientIds = Array.from(
    new Set(ridesBase.map((r) => r.client_id).filter((id): id is string => Boolean(id)))
  )
  let clientMap = new Map<string, ClientLite>()
  if (clientIds.length > 0) {
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id, full_name, email, phone')
      .in('id', clientIds)
    if (!clientsError) {
      clientMap = new Map(((clientsData ?? []) as ClientLite[]).map((c) => [c.id, c]))
    }
  }
  const rides = ridesBase.map((row) => ({
    ...row,
    clients: row.client_id ? clientMap.get(row.client_id) ?? null : null,
  }))
  return res.status(200).json({ rides })
}

async function handleRidesActionPost(
  req: VercelRequest,
  res: VercelResponse,
  driverKey: string,
  dashboardEmail: string
) {
  const parsed = RideActionBodySchema.safeParse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })
  const { courseId, action } = parsed.data
  const supabase = getSupabaseAdmin()
  const { data: row, error: readErr } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle()
  if (readErr || !row) return res.status(404).json({ error: 'Course introuvable' })
  const nowIso = new Date().toISOString()
  if (action === 'accept') {
    if (row.status !== 'pending') return res.status(409).json({ error: 'Course deja traitee' })
    if (row.booking_kind === 'instant' && !sameDriverExternalKey(row.requested_driver_external_key, driverKey)) {
      return res.status(403).json({ error: 'Cette course est reservee a un autre chauffeur' })
    }
    const { data: updated, error: upErr } = await supabase
      .from('courses')
      .update({ status: 'accepted', assigned_driver_external_key: driverKey, accepted_at: nowIso, updated_at: nowIso })
      .eq('id', courseId)
      .eq('status', 'pending')
      .select('id, status')
      .maybeSingle()
    if (upErr || !updated) return res.status(409).json({ error: 'Impossible d accepter' })
    const { data: account } = await supabase
      .from('app_accounts')
      .select('full_name, vehicle_type')
      .eq('email', dashboardEmail)
      .eq('role', 'chauffeur')
      .maybeSingle()
    const fallbackName = dashboardEmail.split('@')[0] || 'Chauffeur'
    const driverName = (account?.full_name ?? '').trim() || fallbackName
    const vehicleLabel = (account?.vehicle_type ?? '').trim() || ''
    await supabase.from('course_events').insert({
      course_id: courseId,
      event_type: 'accepted',
      event_note: 'Course acceptee par chauffeur',
      payload: {
        driverName,
        vehicleLabel,
        driverEmail: dashboardEmail,
      },
    })
    return res.status(200).json({ ok: true, status: updated.status })
  }
  if (action === 'start') {
    if (row.status !== 'accepted' || !sameDriverExternalKey(row.assigned_driver_external_key, driverKey)) {
      return res.status(409).json({ error: 'Course non acceptee par vous' })
    }
    const { data: updated, error: upErr } = await supabase
      .from('courses')
      .update({ status: 'in_progress', started_at: nowIso, updated_at: nowIso })
      .eq('id', courseId)
      .eq('status', 'accepted')
      .select('id, status')
      .maybeSingle()
    if (upErr || !updated) return res.status(409).json({ error: 'Impossible de demarrer' })
    return res.status(200).json({ ok: true, status: updated.status })
  }
  if (action === 'complete') {
    if (row.status !== 'in_progress' || !sameDriverExternalKey(row.assigned_driver_external_key, driverKey)) {
      return res.status(409).json({ error: 'Course non en cours pour vous' })
    }
    const { data: updated, error: upErr } = await supabase
      .from('courses')
      .update({ status: 'completed', completed_at: nowIso, updated_at: nowIso })
      .eq('id', courseId)
      .eq('status', 'in_progress')
      .select('id, status')
      .maybeSingle()
    if (upErr || !updated) return res.status(409).json({ error: 'Impossible de terminer' })
    return res.status(200).json({ ok: true, status: updated.status })
  }
  const { error: upErr } = await supabase
    .from('courses')
    .update({ status: 'cancelled', cancelled_at: nowIso, cancelled_reason: 'Annule depuis le dashboard', updated_at: nowIso })
    .eq('id', courseId)
  if (upErr) return res.status(500).json({ error: 'Annulation impossible' })
  return res.status(200).json({ ok: true, status: 'cancelled' })
}

async function handleStatsGet(res: VercelResponse, driverKey: string) {
  const supabase = getSupabaseAdmin()
  try {
    await expireStaleInstantPendingCourses(supabase)
  } catch (e) {
    console.error('[chauffeur/stats GET] expire stale instant', e)
  }
  const { data, error } = await supabase
    .from('courses')
    .select('status,amount_eur,booking_kind,scheduled_date,requested_driver_external_key,assigned_driver_external_key')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return res.status(500).json({ error: 'Lecture impossible' })
  const rows = ((data ?? []) as Array<Record<string, unknown>>).filter((r) => visibleForDriver(r as unknown as CourseRow, driverKey))
  const completed = rows.filter((r) => r.status === 'completed').length
  const cancelled = rows.filter((r) => r.status === 'cancelled').length
  const inProgress = rows.filter((r) => r.status === 'in_progress').length
  const pending = rows.filter((r) => r.status === 'pending').length
  const acceptedOrInProgress = rows.filter((r) => r.status === 'accepted' || r.status === 'in_progress').length
  const totalIncome = rows.filter((r) => r.status !== 'cancelled').reduce((acc, r) => acc + Number(r.amount_eur ?? 0), 0)
  const acceptanceRate = completed + acceptedOrInProgress > 0 ? Math.round((acceptedOrInProgress / (completed + acceptedOrInProgress)) * 100) : 0
  const cancellationRate = rows.length > 0 ? Math.round((cancelled / rows.length) * 100) : 0
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 363)
  const dayCounts = new Map<string, number>()
  for (const row of rows) {
    if (row.status === 'cancelled' || !row.scheduled_date) continue
    const d = new Date(`${String(row.scheduled_date)}T12:00:00`)
    if (Number.isNaN(d.getTime()) || d < start || d > today) continue
    const key = toIsoDate(d)
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
  }
  const cells = Array.from({ length: 52 }, (_, weekIdx) =>
    Array.from({ length: 7 }, (_, dayIdx) => {
      const date = new Date(start)
      date.setDate(start.getDate() + weekIdx * 7 + dayIdx)
      return dayCounts.get(toIsoDate(date)) ?? 0
    })
  )
  return res.status(200).json({
    stats: { completed, cancelled, inProgress, pending, totalCourses: rows.length, acceptanceRate, cancellationRate, rating: 4.92, onlineHoursWeek: 36, totalIncome, lastPayout: '1 125 EUR · vendredi' },
    heatmap: { totalWeeks: 52, cells, bestMonth: '—', bestDay: '—', longestStreak: '0j', currentStreak: '0j' },
  })
}

async function handleOrganizationGet(res: VercelResponse, dashboardEmail: string) {
  const organization = organizationStore()[dashboardEmail] ?? null
  return res.status(200).json({ organization })
}

async function handleOrganizationPut(req: VercelRequest, res: VercelResponse, dashboardEmail: string) {
  const parsed = OrganizationBodySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })
  organizationStore()[dashboardEmail] = parsed.data.organization
  return res.status(200).json({ ok: true })
}

async function handleComplianceGet(req: VercelRequest, res: VercelResponse, dashboardEmail: string) {
  const parsed = ComplianceQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: 'Query invalide', details: parsed.error.flatten() })
  const root = complianceStore()
  if (!root[dashboardEmail]) root[dashboardEmail] = {}
  const email = parsed.data.email.trim().toLowerCase()
  const snapshot = root[dashboardEmail][email] ?? emptyComplianceSnapshot()
  return res.status(200).json({ snapshot })
}

async function handlePresencePost(
  req: VercelRequest,
  res: VercelResponse,
  accountId: string
) {
  let body: unknown = req.body
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body)
    } catch {
      return res.status(400).json({ error: 'Payload JSON invalide' })
    }
  }
  const parsed = PresenceBodySchema.safeParse(body)
  if (!parsed.success) return res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })

  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()
  const { error } = await supabase.from('chauffeur_presence').upsert(
    {
      account_id: accountId,
      lng: parsed.data.lng,
      lat: parsed.data.lat,
      is_available: parsed.data.isAvailable ?? true,
      updated_at: nowIso,
    },
    { onConflict: 'account_id' }
  )
  if (error) {
    console.error('[chauffeur/presence]', error)
    return res.status(500).json({ error: 'Enregistrement position impossible' })
  }
  return res.status(200).json({ ok: true, updatedAt: nowIso })
}

async function handleCompliancePost(req: VercelRequest, res: VercelResponse, dashboardEmail: string) {
  const parsed = ComplianceBodySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })
  const root = complianceStore()
  if (!root[dashboardEmail]) root[dashboardEmail] = {}
  const email = parsed.data.email.trim().toLowerCase()
  const current = root[dashboardEmail][email] ?? emptyComplianceSnapshot()
  current[parsed.data.docId] = parsed.data.value
  root[dashboardEmail][email] = current
  return res.status(200).json({ snapshot: current })
}

const ChauffeurVehicleTypeSchema = z.enum(['berline', 'utilitaire', 'moto', 'scooter'])

const RideProfileBodySchema = z.object({
  petFriendly: z.boolean(),
  luggageAssistance: z.boolean(),
  insulatedBag: z.boolean(),
  vehicleType: z.union([ChauffeurVehicleTypeSchema, z.literal(''), z.null()]).optional(),
})

function normalizeVehicleTypeForDb(
  vehicleType: z.infer<typeof RideProfileBodySchema>['vehicleType']
): string | null | undefined {
  if (vehicleType === undefined) return undefined
  const trimmed = typeof vehicleType === 'string' ? vehicleType.trim() : vehicleType
  if (!trimmed) return null
  return trimmed
}

async function handleRideProfileGet(res: VercelResponse, accountId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('app_accounts')
    .select('pet_friendly, luggage_assistance, insulated_bag, vehicle_type')
    .eq('id', accountId)
    .eq('role', 'chauffeur')
    .maybeSingle()

  if (error) {
    console.error('[chauffeur/ride-profile GET]', error)
    return res.status(500).json({ error: 'Lecture profil course impossible' })
  }
  if (!data) return res.status(404).json({ error: 'Compte chauffeur introuvable' })

  const vehicleSlug = (data.vehicle_type ?? '').trim().toLowerCase()
  const vehicleType =
    vehicleSlug && ChauffeurVehicleTypeSchema.safeParse(vehicleSlug).success ? vehicleSlug : null

  return res.status(200).json({
    petFriendly: data.pet_friendly === true,
    luggageAssistance: data.luggage_assistance === true,
    insulatedBag: data.insulated_bag === true,
    vehicleType,
  })
}

async function handleRideProfilePut(req: VercelRequest, res: VercelResponse, accountId: string) {
  let body: unknown = req.body
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body)
    } catch {
      return res.status(400).json({ error: 'Payload JSON invalide' })
    }
  }
  const parsed = RideProfileBodySchema.safeParse(body)
  if (!parsed.success) return res.status(400).json({ error: 'Payload invalide', details: parsed.error.flatten() })

  const supabase = getSupabaseAdmin()
  const vehicleTypeDb = normalizeVehicleTypeForDb(parsed.data.vehicleType)
  const update: Record<string, unknown> = {
    pet_friendly: parsed.data.petFriendly,
    luggage_assistance: parsed.data.luggageAssistance,
    insulated_bag: parsed.data.insulatedBag,
    updated_at: new Date().toISOString(),
  }
  if (vehicleTypeDb !== undefined) update.vehicle_type = vehicleTypeDb

  const { error } = await supabase
    .from('app_accounts')
    .update(update)
    .eq('id', accountId)
    .eq('role', 'chauffeur')

  if (error) {
    console.error('[chauffeur/ride-profile]', error)
    return res.status(500).json({ error: 'Enregistrement profil course impossible' })
  }
  return res.status(200).json({ ok: true })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const resourceRaw = Array.isArray(req.query.resource) ? req.query.resource[0] : req.query.resource
  const resource = typeof resourceRaw === 'string' ? resourceRaw.trim().toLowerCase() : ''
  if (!resource) return res.status(400).json({ error: 'resource requis' })

  const session = await getVerifiedChauffeurSession(req)
  if (!session) return res.status(401).json({ error: 'Non autorise' })
  const { email: dashboardEmail, accountId: driverKey } = session

  if (req.method === 'GET' && resource === 'ride-profile') return handleRideProfileGet(res, driverKey)
  if (req.method === 'PUT' && resource === 'ride-profile') return handleRideProfilePut(req, res, driverKey)
  if (req.method === 'POST' && resource === 'presence') return handlePresencePost(req, res, driverKey)
  if (req.method === 'GET' && resource === 'rides') return handleRidesGet(res, driverKey)
  if (req.method === 'POST' && resource === 'rides-action') return handleRidesActionPost(req, res, driverKey, dashboardEmail)
  if (req.method === 'GET' && resource === 'stats') return handleStatsGet(res, driverKey)
  if (req.method === 'GET' && resource === 'organization') return handleOrganizationGet(res, dashboardEmail)
  if (req.method === 'PUT' && resource === 'organization') return handleOrganizationPut(req, res, dashboardEmail)
  if (req.method === 'GET' && resource === 'compliance') return handleComplianceGet(req, res, dashboardEmail)
  if (req.method === 'POST' && resource === 'compliance') return handleCompliancePost(req, res, dashboardEmail)

  return res.status(405).json({ error: 'Method not allowed' })
}
