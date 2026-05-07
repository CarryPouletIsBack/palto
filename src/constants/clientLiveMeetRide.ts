import { isClientAuthenticated } from '../services/authService';

/** Données vue « chauffeur sur place » (démo) — hors récap « Mes courses ». */
export type ClientLiveMeetRideModel = {
  pickupLabel: string;
  route: string;
  departTime: string;
  driverName: string;
  vehicleLabel: string;
  vehicleColor: string;
  licensePlate: string;
  meetPickupCoords: { lng: number; lat: number };
  meetDriverCoordsInitial: { lng: number; lat: number };
};

const CLIENT_LIVE_MEET_RIDE_DEMO: ClientLiveMeetRideModel = {
  pickupLabel: 'Saint-Denis — Préfecture, zone dépose minute',
  route: 'Saint-Denis → Le Port',
  departTime: '18:20',
  driverName: 'Karim L.',
  vehicleLabel: 'Yamaha TMAX',
  vehicleColor: 'Blanc nacré',
  licensePlate: 'BJ-492-WW',
  meetPickupCoords: { lng: 55.4509, lat: -20.8809 },
  meetDriverCoordsInitial: { lng: 55.45325, lat: -20.88265 },
};

export function getClientLiveMeetRideModel(): ClientLiveMeetRideModel | null {
  if (typeof window === 'undefined') return null;
  if (!isClientAuthenticated()) return null;
  return CLIENT_LIVE_MEET_RIDE_DEMO;
}
