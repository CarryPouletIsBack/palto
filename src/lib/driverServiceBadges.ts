import type { NearbyDriver } from '../data/nearbyDrivers'

/** Badges services affichés sur la carte chauffeur (données compte / API nearby). */
export function driverServiceBadges(driver: NearbyDriver): string[] {
  const badges: string[] = []
  if (driver.petFriendly !== false) badges.push('Animaux')
  if (driver.luggageAssistance !== false) badges.push('Bagages')
  if (driver.insulatedBag) badges.push('Sac isotherme')
  else if (driver.deliveryEquipped) badges.push('Livraison')
  return badges
}
