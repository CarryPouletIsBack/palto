import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

import { accountAcceptsEmailNotifications } from './accountNotificationPrefs.js'

const REUNION_TIME_ZONE = 'Indian/Reunion'
const FROM_FALLBACK = 'Palto <onboarding@resend.dev>'

type NotificationType =
  | 'driver_new_ride_request'
  | 'driver_scheduled_new_ride'
  | 'client_ride_starts_soon'
  | `status_${string}_client`
  | `status_${string}_driver`

type NotificationClaim = {
  id: string
}

type CourseEmailRow = {
  id: string
  external_code: string | null
  status: string
  booking_kind: string
  scheduled_date: string
  scheduled_time: string
  pickup_address: string
  dropoff_address: string
  client_id: string | null
  assigned_driver_external_key: string | null
  requested_driver_external_key: string | null
  cancelled_reason: string | null
}

const STATUS_LABEL_FR: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptee',
  in_progress: 'En cours',
  completed: 'Terminee',
  cancelled: 'Annulee',
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return null
  return new Resend(apiKey)
}

export function formatDateTimeReunion(dateIso: string): string {
  const date = new Date(dateIso)
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: REUNION_TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function toReunionCourseIso(scheduledDate: string, scheduledTime: string): string {
  return `${scheduledDate}T${String(scheduledTime).slice(0, 8)}+04:00`
}

async function claimNotification(
  supabase: SupabaseClient,
  input: {
    courseId: string
    type: NotificationType
    recipientEmail: string
    scheduledFor?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<NotificationClaim | null> {
  const { data, error } = await supabase
    .from('course_notifications_log')
    .insert({
      course_id: input.courseId,
      notification_type: input.type,
      recipient_email: input.recipientEmail,
      status: 'processing',
      scheduled_for: input.scheduledFor ?? null,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single()

  if (!error && data?.id) return { id: String(data.id) }
  if (error?.code === '23505') return null
  throw error
}

async function markNotificationSent(supabase: SupabaseClient, claim: NotificationClaim): Promise<void> {
  const { error } = await supabase
    .from('course_notifications_log')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', claim.id)
  if (error) throw error
}

async function releaseNotificationClaim(supabase: SupabaseClient, claim: NotificationClaim): Promise<void> {
  await supabase.from('course_notifications_log').delete().eq('id', claim.id).eq('status', 'processing')
}

async function sendClaimedEmail(
  supabase: SupabaseClient,
  input: {
    courseId: string
    type: NotificationType
    to: string
    recipientRole: 'client' | 'chauffeur'
    subject: string
    lines: string[]
    scheduledFor?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<{ sent: boolean; skipped: boolean; reason?: string }> {
  const resend = getResendClient()
  if (!resend) {
    console.warn('[rideEmailNotifications] skip', input.type, 'RESEND_API_KEY manquante')
    return { sent: false, skipped: true, reason: 'RESEND_API_KEY manquante' }
  }

  const to = input.to.trim().toLowerCase()
  if (!to) {
    console.warn('[rideEmailNotifications] skip', input.type, 'email destinataire manquant')
    return { sent: false, skipped: true, reason: 'Email destinataire manquant' }
  }

  const acceptsEmail = await accountAcceptsEmailNotifications(supabase, to, input.recipientRole)
  if (!acceptsEmail) {
    console.info('[rideEmailNotifications] skip', input.type, to, 'notify_email desactive')
    return { sent: false, skipped: true, reason: 'Notifications email desactivees' }
  }

  const fromEmail = process.env.RESEND_FROM?.trim() || FROM_FALLBACK
  const claim = await claimNotification(supabase, {
    courseId: input.courseId,
    type: input.type,
    recipientEmail: to,
    scheduledFor: input.scheduledFor,
    metadata: input.metadata,
  })
  if (!claim) {
    console.info('[rideEmailNotifications] skip', input.type, to, 'deja envoye')
    return { sent: false, skipped: true, reason: 'Deja envoye' }
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: input.subject,
      text: input.lines.join('\n'),
    })
    await markNotificationSent(supabase, claim)
    return { sent: true, skipped: false }
  } catch (error) {
    await releaseNotificationClaim(supabase, claim)
    throw error
  }
}

export async function notifyDriverNewRideRequest(params: {
  supabase: SupabaseClient
  courseId: string
  externalCode: string
  driverEmail: string
  driverName: string
  clientName: string
  pickupAddress: string
  dropoffAddress: string
  scheduledAtIso: string
  amountEur: number
  bookingKind?: 'instant' | 'scheduled'
}): Promise<{ sent: boolean; skipped: boolean; reason?: string }> {
  const scheduled = params.bookingKind === 'scheduled'
  return sendClaimedEmail(params.supabase, {
    courseId: params.courseId,
    type: scheduled ? 'driver_scheduled_new_ride' : 'driver_new_ride_request',
    to: params.driverEmail,
    recipientRole: 'chauffeur',
    subject: scheduled
      ? `Reservation programmee (${params.externalCode})`
      : `Nouvelle demande de course (${params.externalCode})`,
    lines: [
      `Bonjour ${params.driverName || 'chauffeur'},`,
      '',
      scheduled
        ? 'Un client vous a choisi pour une course programmee sur Palto.'
        : 'Vous avez une nouvelle demande de course immediate.',
      `Code: ${params.externalCode}`,
      `Client: ${params.clientName || 'Client'}`,
      `Depart: ${params.pickupAddress}`,
      `Arrivee: ${params.dropoffAddress}`,
      `Depart prevu: ${formatDateTimeReunion(params.scheduledAtIso)} (heure Reunion)`,
      `Montant: ${params.amountEur.toFixed(2)} EUR`,
      '',
      'Ouvrez votre dashboard chauffeur pour accepter la course.',
    ],
    metadata: { external_code: params.externalCode, booking_kind: params.bookingKind ?? 'instant' },
  })
}

export async function notifyClientRideStartsSoon(params: {
  supabase: SupabaseClient
  courseId: string
  externalCode: string
  clientEmail: string
  clientName: string
  pickupAddress: string
  dropoffAddress: string
  scheduledAtIso: string
}): Promise<{ sent: boolean; skipped: boolean; reason?: string }> {
  return sendClaimedEmail(params.supabase, {
    courseId: params.courseId,
    type: 'client_ride_starts_soon',
    to: params.clientEmail,
    recipientRole: 'client',
    subject: `Rappel: votre course ${params.externalCode} commence bientot`,
    scheduledFor: params.scheduledAtIso,
    metadata: { external_code: params.externalCode },
    lines: [
      `Bonjour ${params.clientName || 'client'},`,
      '',
      `Votre course ${params.externalCode} commence dans environ 30 minutes.`,
      `Depart: ${params.pickupAddress}`,
      `Arrivee: ${params.dropoffAddress}`,
      `Heure prevue: ${formatDateTimeReunion(params.scheduledAtIso)} (heure Reunion)`,
      '',
      'Merci d etre pret quelques minutes avant le depart.',
    ],
  })
}

function actorLabelFr(actor: 'client' | 'chauffeur' | 'system'): string {
  if (actor === 'client') return 'Le client'
  if (actor === 'chauffeur') return 'Le chauffeur'
  return 'Palto'
}

async function loadCourseForEmail(
  supabase: SupabaseClient,
  courseId: string
): Promise<CourseEmailRow | null> {
  const { data, error } = await supabase
    .from('courses')
    .select(
      'id, external_code, status, booking_kind, scheduled_date, scheduled_time, pickup_address, dropoff_address, client_id, assigned_driver_external_key, requested_driver_external_key, cancelled_reason'
    )
    .eq('id', courseId)
    .maybeSingle()
  if (error) throw error
  return (data as CourseEmailRow | null) ?? null
}

async function resolveDriverEmail(
  supabase: SupabaseClient,
  driverKey: string | null
): Promise<{ email: string; name: string } | null> {
  const key = driverKey?.trim()
  if (!key) return null

  const byId = await supabase
    .from('app_accounts')
    .select('email, full_name')
    .eq('id', key)
    .eq('role', 'chauffeur')
    .maybeSingle()
  if (byId.error) throw byId.error

  let row = byId.data
  if (!row?.email && key.includes('@')) {
    const byEmail = await supabase
      .from('app_accounts')
      .select('email, full_name')
      .ilike('email', key)
      .eq('role', 'chauffeur')
      .maybeSingle()
    if (byEmail.error) throw byEmail.error
    row = byEmail.data
  }

  const email = String(row?.email ?? '').trim()
  if (!email) return null
  return {
    email,
    name: String(row?.full_name ?? '').trim() || 'Chauffeur',
  }
}

async function resolveClientEmail(
  supabase: SupabaseClient,
  clientId: string | null
): Promise<{ email: string; name: string } | null> {
  if (!clientId) return null
  const { data, error } = await supabase
    .from('clients')
    .select('email, full_name')
    .eq('id', clientId)
    .maybeSingle()
  if (error) throw error
  const email = String(data?.email ?? '').trim()
  if (!email) return null
  return {
    email,
    name: String(data?.full_name ?? '').trim() || 'Client',
  }
}

export async function notifyRideStatusChange(params: {
  supabase: SupabaseClient
  courseId: string
  newStatus: string
  actor: 'client' | 'chauffeur' | 'system'
  detailNote?: string
}): Promise<{ clientSent: boolean; driverSent: boolean }> {
  const course = await loadCourseForEmail(params.supabase, params.courseId)
  if (!course) return { clientSent: false, driverSent: false }

  const code = course.external_code ?? `COURSE-${course.id.slice(0, 8).toUpperCase()}`
  const statusLabel = STATUS_LABEL_FR[params.newStatus] ?? params.newStatus
  const whenIso = toReunionCourseIso(course.scheduled_date, course.scheduled_time)
  const whenLabel = formatDateTimeReunion(whenIso)
  const actor = actorLabelFr(params.actor)
  const reasonLine = params.detailNote?.trim()
    ? `Detail: ${params.detailNote.trim()}`
    : course.cancelled_reason?.trim()
      ? `Detail: ${course.cancelled_reason.trim()}`
      : null

  const client = await resolveClientEmail(params.supabase, course.client_id)
  const driverKey = course.assigned_driver_external_key ?? course.requested_driver_external_key
  const driver = await resolveDriverEmail(params.supabase, driverKey)

  let clientSent = false
  let driverSent = false

  if (client) {
    const result = await sendClaimedEmail(params.supabase, {
      courseId: course.id,
      type: `status_${params.newStatus}_client`,
      to: client.email,
      recipientRole: 'client',
      subject: `Course ${code} — ${statusLabel}`,
      metadata: { external_code: code, new_status: params.newStatus, actor: params.actor },
      lines: [
        `Bonjour ${client.name},`,
        '',
        `Votre course ${code} a ete mise a jour.`,
        `Nouveau statut: ${statusLabel}`,
        `${actor} a modifie l etat de la course.`,
        `Depart: ${course.pickup_address}`,
        `Arrivee: ${course.dropoff_address}`,
        `Horaire prevu: ${whenLabel} (heure Reunion)`,
        ...(reasonLine ? ['', reasonLine] : []),
        '',
        'Consultez votre compte client Palto pour le suivi.',
      ],
    })
    clientSent = result.sent
  }

  if (driver) {
    const result = await sendClaimedEmail(params.supabase, {
      courseId: course.id,
      type: `status_${params.newStatus}_driver`,
      to: driver.email,
      recipientRole: 'chauffeur',
      subject: `Course ${code} — ${statusLabel}`,
      metadata: { external_code: code, new_status: params.newStatus, actor: params.actor },
      lines: [
        `Bonjour ${driver.name},`,
        '',
        `La course ${code} a ete mise a jour.`,
        `Nouveau statut: ${statusLabel}`,
        `${actor} a modifie l etat de la course.`,
        `Depart: ${course.pickup_address}`,
        `Arrivee: ${course.dropoff_address}`,
        `Horaire prevu: ${whenLabel} (heure Reunion)`,
        ...(reasonLine ? ['', reasonLine] : []),
        '',
        'Ouvrez votre dashboard chauffeur pour les details.',
      ],
    })
    driverSent = result.sent
  }

  console.info('[rideEmailNotifications] status change', {
    courseId: params.courseId,
    newStatus: params.newStatus,
    actor: params.actor,
    clientSent,
    driverSent,
    driverKey: driverKey ?? null,
  })
  return { clientSent, driverSent }
}
