/** Erreur Supabase/PostgREST quand la migration `0010_chauffeur_profile_data` n’est pas appliquée. */
export function isChauffeurProfileTableMissing(error: {
  code?: string
  message?: string
  details?: string
} | null): boolean {
  if (!error) return false
  const code = String(error.code ?? '')
  const msg = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase()
  if (code === 'PGRST205' || code === '42P01') return true
  return (
    msg.includes('chauffeur_profile_data') &&
    (msg.includes('does not exist') ||
      msg.includes('not found') ||
      msg.includes('schema cache') ||
      msg.includes('could not find'))
  )
}

export const CHAUFFEUR_PROFILE_TABLE_MISSING_HINT =
  'Table chauffeur_profile_data absente : executez scripts/apply-migration-0010.sql dans le SQL Editor Supabase.'
