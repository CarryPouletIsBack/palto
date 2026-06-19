import { DEFAULT_USER_ORIGIN } from '../constants/defaultUserOrigin';
import type { GeoPoint } from '../services/distanceGeo';
import type { NearbyDriver } from './nearbyDrivers';

const localModules = import.meta.glob<{ LOCAL_DEV_NEARBY_DRIVERS: NearbyDriver[] }>(
  './localDevNearbyDriver.local.ts',
  { eager: true },
);

/** Recale les positions mock autour du pickup courant (motif conservé depuis DEFAULT_USER_ORIGIN). */
function repositionLocalDevDrivers(drivers: NearbyDriver[], origin: GeoPoint): NearbyDriver[] {
  const dLat = origin.latitude - DEFAULT_USER_ORIGIN.latitude;
  const dLng = origin.longitude - DEFAULT_USER_ORIGIN.longitude;
  return drivers.map((driver) => ({
    ...driver,
    latitude: driver.latitude + dLat,
    longitude: driver.longitude + dLng,
  }));
}

/** Chauffeurs injectés en dev via `localDevNearbyDriver.local.ts` (gitignoré). */
export function getLocalDevNearbyDrivers(origin?: GeoPoint): NearbyDriver[] {
  if (!import.meta.env.DEV) return [];
  const mod = Object.values(localModules)[0];
  const drivers = mod?.LOCAL_DEV_NEARBY_DRIVERS ?? [];
  if (!origin || drivers.length === 0) return drivers;
  return repositionLocalDevDrivers(drivers, origin);
}
