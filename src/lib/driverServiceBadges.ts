import type { NearbyDriver } from '../data/nearbyDrivers'

/** Badges services affichés sur la carte chauffeur (uniquement si activés sur le compte). */
export function driverServiceBadges(driver: NearbyDriver): string[] {
  const badges: string[] = []
  if (driver.petFriendly === true) badges.push('Animaux')
  if (driver.luggageAssistance === true) badges.push('Bagages')
  if (driver.insulatedBag === true) badges.push('Sac isotherme')
  else if (driver.deliveryEquipped === true) badges.push('Livraison')
  return badges
}
