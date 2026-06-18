import type { NearbyDriver } from './nearbyDrivers';
import { DEFAULT_USER_ORIGIN } from '../constants/defaultUserOrigin';
import { mockDriverProfilePhotoUrl } from '../utils/driverMapMarkerAvatar';

/**
 * Copier ce fichier vers `localDevNearbyDriver.local.ts` (gitignoré).
 * Chauffeur de simulation local pour tester l’illustration véhicule sur /go.
 */
export const LOCAL_DEV_NEARBY_DRIVERS: NearbyDriver[] = [
  {
    id: 'local-dev-volvo-driver',
    name: 'Marc D.',
    moto: 'Volvo S90',
    distance: '1,2 km · ~4 min',
    price: '12 €',
    longitude: DEFAULT_USER_ORIGIN.longitude + 0.008,
    latitude: DEFAULT_USER_ORIGIN.latitude + 0.005,
    profilePhotoUrl: mockDriverProfilePhotoUrl('Marc D.'),
    vehicleIllustration: true,
  },
];
