import { simplifyAddressDisplay } from '../services/addressDisplay';

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

const CLIENT_LIVE_MEET_RIDE_STORAGE_KEY = 'palto:client-live-meet-ride';

export function getClientLiveMeetRideModel(): ClientLiveMeetRideModel | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CLIENT_LIVE_MEET_RIDE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientLiveMeetRideModel;
    if (!parsed?.pickupLabel || !parsed?.route || !parsed?.departTime) return null;
    if (!parsed?.meetPickupCoords || !parsed?.meetDriverCoordsInitial) return null;
    return {
      ...parsed,
      pickupLabel: simplifyAddressDisplay(parsed.pickupLabel),
      route: parsed.route
        .split('→')
        .map((part) => simplifyAddressDisplay(part))
        .join(' → '),
    };
  } catch {
    return null;
  }
}

export function saveClientLiveMeetRideModel(model: ClientLiveMeetRideModel): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CLIENT_LIVE_MEET_RIDE_STORAGE_KEY, JSON.stringify(model));
  } catch {
    // ignore quota/private mode
  }
}

export function clearClientLiveMeetRideModel(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CLIENT_LIVE_MEET_RIDE_STORAGE_KEY);
  } catch {
    // ignore quota/private mode
  }
}
