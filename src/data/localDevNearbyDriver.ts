import type { NearbyDriver } from './nearbyDrivers';

const localModules = import.meta.glob<{ LOCAL_DEV_NEARBY_DRIVERS: NearbyDriver[] }>(
  './localDevNearbyDriver.local.ts',
  { eager: true },
);

/** Chauffeurs injectés en dev via `localDevNearbyDriver.local.ts` (gitignoré). */
export function getLocalDevNearbyDrivers(): NearbyDriver[] {
  if (!import.meta.env.DEV) return [];
  const mod = Object.values(localModules)[0];
  return mod?.LOCAL_DEV_NEARBY_DRIVERS ?? [];
}
