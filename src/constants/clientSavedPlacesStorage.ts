/** Lieux favoris passager (MVP local, aligné futur backend). */
export const CLIENT_SAVED_PLACES_STORAGE_KEY = 'palto_client_saved_places_v1';

/** Coordonnées WGS84 (longitude, latitude), ordre standard web carto. */
export type SavedPlaceCoords = {
  lng: number;
  lat: number;
};

export type ClientSavedPlaceExtra = {
  id: string;
  label: string;
  address: string;
  coords: SavedPlaceCoords | null;
};

export interface ClientSavedPlacesSnapshot {
  domicile: string;
  domicileCoords: SavedPlaceCoords | null;
  travail: string;
  travailCoords: SavedPlaceCoords | null;
  extras: ClientSavedPlaceExtra[];
}

export const DEFAULT_CLIENT_SAVED_PLACES: ClientSavedPlacesSnapshot = {
  domicile: '',
  domicileCoords: null,
  travail: '',
  travailCoords: null,
  extras: [],
};

function genPlaceId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function parseCoords(raw: unknown): SavedPlaceCoords | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const lng = typeof o.lng === 'number' ? o.lng : typeof o.longitude === 'number' ? o.longitude : null;
  const lat = typeof o.lat === 'number' ? o.lat : typeof o.latitude === 'number' ? o.latitude : null;
  if (lng == null || lat == null || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

export function loadClientSavedPlaces(): ClientSavedPlacesSnapshot {
  try {
    const raw = localStorage.getItem(CLIENT_SAVED_PLACES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CLIENT_SAVED_PLACES };
    const parsed = JSON.parse(raw) as Partial<ClientSavedPlacesSnapshot> & {
      extras?: unknown[];
    };
    const extrasRaw = Array.isArray(parsed.extras) ? parsed.extras : [];
    const extras: ClientSavedPlaceExtra[] = extrasRaw
      .filter((e): e is Record<string, unknown> => e && typeof e === 'object' && typeof (e as { id?: unknown }).id === 'string')
      .map((e) => ({
        id: String(e.id),
        label: typeof e.label === 'string' ? e.label : '',
        address: typeof e.address === 'string' ? e.address : '',
        coords: parseCoords(e.coords),
      }));
    const snapshot: ClientSavedPlacesSnapshot = {
      domicile: typeof parsed.domicile === 'string' ? parsed.domicile : '',
      domicileCoords: parseCoords(parsed.domicileCoords),
      travail: typeof parsed.travail === 'string' ? parsed.travail : '',
      travailCoords: parseCoords(parsed.travailCoords),
      extras,
    };
    if (!snapshot.domicile.trim() && !snapshot.travail.trim() && snapshot.extras.length === 0) {
      return { ...DEFAULT_CLIENT_SAVED_PLACES };
    }
    return snapshot;
  } catch {
    return { ...DEFAULT_CLIENT_SAVED_PLACES };
  }
}

export function saveClientSavedPlaces(data: ClientSavedPlacesSnapshot): void {
  try {
    localStorage.setItem(CLIENT_SAVED_PLACES_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function createEmptySavedPlaceExtra(): ClientSavedPlaceExtra {
  return { id: genPlaceId(), label: '', address: '', coords: null };
}
