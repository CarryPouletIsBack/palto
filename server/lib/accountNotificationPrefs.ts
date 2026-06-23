import type { SupabaseClient } from '@supabase/supabase-js'

export type PaltoAccountRole = 'client' | 'chauffeur'

export async function accountAcceptsEmailNotifications(
  supabase: SupabaseClient,
  email: string,
  role: PaltoAccountRole
): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false

  const { data, error } = await supabase
    .from('app_accounts')
    .select('notify_email')
    .ilike('email', normalized)
    .eq('role', role)
    .maybeSingle()

  if (error) throw error
  if (!data) return true
  return data.notify_email !== false
}
