import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const REUNION_TIME_ZONE = 'Indian/Reunion'
const FROM_FALLBACK = 'Palto <onboarding@resend.dev>'

type NotificationType = 'driver_new_ride_request' | 'client_ride_starts_soon'

type NotificationClaim = {
  id: string
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return null
  return new Resend(apiKey)
}

function formatDateTimeReunion(dateIso: string): string {
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
}): Promise<{ sent: boolean; skipped: boolean; reason?: string }> {
  const resend = getResendClient()
  if (!resend) return { sent: false, skipped: true, reason: 'RESEND_API_KEY manquante' }

  const fromEmail = process.env.RESEND_FROM?.trim() || FROM_FALLBACK
  const to = params.driverEmail.trim().toLowerCase()
  if (!to) return { sent: false, skipped: true, reason: 'Email chauffeur manquant' }

  const claim = await claimNotification(params.supabase, {
    courseId: params.courseId,
    type: 'driver_new_ride_request',
    recipientEmail: to,
    metadata: {
      external_code: params.externalCode,
    },
  })
  if (!claim) return { sent: false, skipped: true, reason: 'Deja envoye' }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Nouvelle demande de course (${params.externalCode})`,
      text: [
        `Bonjour ${params.driverName || 'chauffeur'},`,
        '',
        `Vous avez une nouvelle demande de course.`,
        `Code: ${params.externalCode}`,
        `Client: ${params.clientName || 'Client'}`,
        `Depart: ${params.pickupAddress}`,
        `Arrivee: ${params.dropoffAddress}`,
        `Depart prevu: ${formatDateTimeReunion(params.scheduledAtIso)} (heure Reunion)`,
        `Montant: ${params.amountEur.toFixed(2)} EUR`,
        '',
        'Ouvrez votre dashboard chauffeur pour accepter la course.',
      ].join('\n'),
    })
    await markNotificationSent(params.supabase, claim)
    return { sent: true, skipped: false }
  } catch (error) {
    await releaseNotificationClaim(params.supabase, claim)
    throw error
  }
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
  const resend = getResendClient()
  if (!resend) return { sent: false, skipped: true, reason: 'RESEND_API_KEY manquante' }

  const fromEmail = process.env.RESEND_FROM?.trim() || FROM_FALLBACK
  const to = params.clientEmail.trim().toLowerCase()
  if (!to) return { sent: false, skipped: true, reason: 'Email client manquant' }

  const claim = await claimNotification(params.supabase, {
    courseId: params.courseId,
    type: 'client_ride_starts_soon',
    recipientEmail: to,
    scheduledFor: params.scheduledAtIso,
    metadata: {
      external_code: params.externalCode,
    },
  })
  if (!claim) return { sent: false, skipped: true, reason: 'Deja envoye' }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Rappel: votre course ${params.externalCode} commence bientot`,
      text: [
        `Bonjour ${params.clientName || 'client'},`,
        '',
        `Votre course ${params.externalCode} commence dans environ 30 minutes.`,
        `Depart: ${params.pickupAddress}`,
        `Arrivee: ${params.dropoffAddress}`,
        `Heure prevue: ${formatDateTimeReunion(params.scheduledAtIso)} (heure Reunion)`,
        '',
        'Merci d etre pret quelques minutes avant le depart.',
      ].join('\n'),
    })
    await markNotificationSent(params.supabase, claim)
    return { sent: true, skipped: false }
  } catch (error) {
    await releaseNotificationClaim(params.supabase, claim)
    throw error
  }
}
