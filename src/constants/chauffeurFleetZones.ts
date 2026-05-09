/**
 * Zones d’exploitation type flotte à La Réunion (stockage local).
 * Les libellés affichés passent par i18n (`driverDashboard.fleetZone*`).
 */
export const FLEET_ZONE_IDS = [
  'unset',
  'west',
  'south',
  'east',
  'north',
  'cilaos',
  'circus',
  'plain_cafres',
  'stpaul',
] as const

export type FleetZoneId = (typeof FLEET_ZONE_IDS)[number]

export function isFleetZoneId(v: unknown): v is FleetZoneId {
  return typeof v === 'string' && (FLEET_ZONE_IDS as readonly string[]).includes(v)
}

export const FLEET_AVAILABILITIES = ['available', 'on_course', 'pause', 'off'] as const

export type FleetAvailability = (typeof FLEET_AVAILABILITIES)[number]

export function isFleetAvailability(v: unknown): v is FleetAvailability {
  return typeof v === 'string' && (FLEET_AVAILABILITIES as readonly string[]).includes(v)
}

/** Clé i18n sous driverDashboard (ex. fleetZoneWest). */
export function fleetZoneI18nKey(id: FleetZoneId): string {
  if (id === 'unset') return 'fleetZoneUnset'
  if (id === 'west') return 'fleetZoneWest'
  if (id === 'south') return 'fleetZoneSouth'
  if (id === 'east') return 'fleetZoneEast'
  if (id === 'north') return 'fleetZoneNorth'
  if (id === 'cilaos') return 'fleetZoneCilaos'
  if (id === 'circus') return 'fleetZoneCircus'
  if (id === 'plain_cafres') return 'fleetZonePlainCafres'
  if (id === 'stpaul') return 'fleetZoneStPaul'
  return 'fleetZoneUnset'
}

export function fleetAvailabilityI18nKey(id: FleetAvailability): string {
  if (id === 'available') return 'fleetAvailAvailable'
  if (id === 'on_course') return 'fleetAvailOnCourse'
  if (id === 'pause') return 'fleetAvailPause'
  return 'fleetAvailOff'
}
