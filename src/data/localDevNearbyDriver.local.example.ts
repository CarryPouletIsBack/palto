import type { NearbyDriver } from './nearbyDrivers';
import { DEFAULT_USER_ORIGIN } from '../constants/defaultUserOrigin';
import { mockDriverProfilePhotoUrl } from '../utils/driverMapMarkerAvatar';

/**
 * Copier ce fichier vers `localDevNearbyDriver.local.ts` (gitignoré).
 * Les positions sont relatives à DEFAULT_USER_ORIGIN et suivent le pickup en dev.
 *
 * Voir `localDevNearbyDriver.local.ts` pour un jeu complet de 10 chauffeurs berline.
 */
const { latitude: baseLat, longitude: baseLng } = DEFAULT_USER_ORIGIN;

export const LOCAL_DEV_NEARBY_DRIVERS: NearbyDriver[] = [
  {
    id: 'local-dev-volvo-driver',
    name: 'Marc D.',
    moto: 'Volvo S90',
    distance: '1,2 km · ~4 min',
    price: '12 €',
    longitude: baseLng + 0.006,
    latitude: baseLat + 0.004,
    profilePhotoUrl: mockDriverProfilePhotoUrl('Marc D.'),
    vehicleIllustration: true,
    ridePricing: { baseFareEur: '3,50', pricePerKmEur: '1,20' },
  },
];
