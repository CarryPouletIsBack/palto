/**
 * Les 24 communes de La Réunion (France).
 * @see https://fr.wikipedia.org/wiki/Liste_des_communes_de_La_R%C3%A9union
 */
export const REUNION_COMMUNES_FR = [
  'Bras-Panon',
  'Cilaos',
  'Entre-Deux',
  "L'Étang-Salé",
  'La Plaine-des-Palmistes',
  'La Possession',
  'Le Port',
  'Les Avirons',
  'Les Trois-Bassins',
  'Le Tampon',
  'Petite-Île',
  'Saint-André',
  'Saint-Benoît',
  'Saint-Denis',
  'Saint-Joseph',
  'Saint-Leu',
  'Saint-Louis',
  'Saint-Paul',
  'Saint-Pierre',
  'Saint-Philippe',
  'Sainte-Marie',
  'Sainte-Rose',
  'Sainte-Suzanne',
  'Salazie',
] as const

export type ReunionCommuneFr = (typeof REUNION_COMMUNES_FR)[number]

/** Liste triée pour affichage (ordre alphabétique français). */
export const REUNION_COMMUNES_SORTED: readonly string[] = [...REUNION_COMMUNES_FR].sort((a, b) =>
  a.localeCompare(b, 'fr', { sensitivity: 'base' })
)

export const DEFAULT_HERO_COMMUNE: ReunionCommuneFr = 'Le Port'

/** Anciennes orthographes (sans accent, libellés raccourcis) → commune canonique. */
const LEGACY_COMMUNE_ALIASES: Record<string, ReunionCommuneFr> = {
  'Saint-Andre': 'Saint-André',
  'Saint-Benoit': 'Saint-Benoît',
  "L'Etang-Sale": "L'Étang-Salé",
  'L Etang-Sale': "L'Étang-Salé",
  'Trois-Bassins': 'Les Trois-Bassins',
  'Petite-Ile': 'Petite-Île',
}

/** Valeur fiable pour `<select>` (commune exacte ou alias legacy). */
export function normalizeReunionCommuneForSelect(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  const insensitive = REUNION_COMMUNES_FR.find(
    (c) => c.localeCompare(raw, 'fr', { sensitivity: 'base' }) === 0
  )
  if (insensitive) return insensitive
  return LEGACY_COMMUNE_ALIASES[raw] ?? ''
}
