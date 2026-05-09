import { simplifyAddressDisplay } from '../services/addressDisplay';
import type { ClientRideItem } from '../services/clientRidesApi';

/** Données vue « rencontre chauffeur » — enrichi API + session pour ouverture directe. */
export type ClientLiveMeetRideModel = {
  /** Id course Supabase — positions temps réel `ride_geo:{courseId}`. */
  courseId: string;
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
    if (!parsed?.courseId || typeof parsed.courseId !== 'string') return null;
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

/** Construit le modèle « meet » depuis une ligne API client (course `in_progress` + coords pickup). */
export function buildClientLiveMeetRideFromRideItem(item: ClientRideItem): ClientLiveMeetRideModel | null {
  if (item.status !== 'in_progress') return null;
  if (typeof item.pickupLng !== 'number' || typeof item.pickupLat !== 'number') return null;
  const lng = item.pickupLng;
  const lat = item.pickupLat;
  return {
    courseId: item.id,
    pickupLabel: simplifyAddressDisplay(item.pickupAddress),
    route: `${simplifyAddressDisplay(item.pickupAddress)} → ${simplifyAddressDisplay(item.dropoffAddress)}`,
    departTime: item.scheduledTime.slice(0, 5),
    driverName: item.driverName?.trim() || 'Chauffeur Palto',
    vehicleLabel: item.vehicleLabel?.trim() || '',
    vehicleColor: '',
    licensePlate: '',
    meetPickupCoords: { lng, lat },
    meetDriverCoordsInitial: { lng: lng - 0.0035, lat: lat + 0.0022 },
  };
}
