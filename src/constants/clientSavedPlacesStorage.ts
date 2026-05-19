import { clientAccountRowExistsForEmail } from './clientAccountStorage';

/** Lieux favoris passager (MVP local, aligné futur backend). */
export const CLIENT_SAVED_PLACES_STORAGE_KEY = 'palto_client_saved_places_v1';
const CLIENT_SAVED_PLACES_BY_EMAIL_STORAGE_KEY = 'palto_client_saved_places_by_email_v1';

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

function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? '').trim().toLowerCase();
}

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

function sanitizeSnapshot(
  parsed: Partial<ClientSavedPlacesSnapshot> & { extras?: unknown[] }
): ClientSavedPlacesSnapshot {
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
}

function readPlacesByEmailMap(): Record<string, ClientSavedPlacesSnapshot> {
  try {
    const raw = localStorage.getItem(CLIENT_SAVED_PLACES_BY_EMAIL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ClientSavedPlacesSnapshot>;
  } catch {
    return {};
  }
}

function isPlacesSnapshotEmpty(s: ClientSavedPlacesSnapshot): boolean {
  return !s.domicile.trim() && !s.travail.trim() && s.extras.length === 0;
}

export function loadClientSavedPlaces(email?: string): ClientSavedPlacesSnapshot {
  try {
    const emailKey = normalizeEmail(email);
    if (emailKey) {
      const byEmail = readPlacesByEmailMap();
      if (byEmail[emailKey]) return sanitizeSnapshot(byEmail[emailKey]);

      const legacyRaw = localStorage.getItem(CLIENT_SAVED_PLACES_STORAGE_KEY);
      if (legacyRaw) {
        const legacy = sanitizeSnapshot(
          JSON.parse(legacyRaw) as Partial<ClientSavedPlacesSnapshot> & { extras?: unknown[] }
        );
        if (!isPlacesSnapshotEmpty(legacy) && clientAccountRowExistsForEmail(emailKey)) {
          saveClientSavedPlaces(legacy, emailKey);
          localStorage.removeItem(CLIENT_SAVED_PLACES_STORAGE_KEY);
          return legacy;
        }
      }
      return { ...DEFAULT_CLIENT_SAVED_PLACES };
    }
    const raw = localStorage.getItem(CLIENT_SAVED_PLACES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CLIENT_SAVED_PLACES };
    return sanitizeSnapshot(JSON.parse(raw) as Partial<ClientSavedPlacesSnapshot> & { extras?: unknown[] });
  } catch {
    return { ...DEFAULT_CLIENT_SAVED_PLACES };
  }
}

/**
 * Migre la clé legacy globale des lieux vers l’email donné si le compte Palto
 * est bien rattaché à cet email (évite de coller les lieux d’un autre utilisateur).
 */
export function migrateLegacySavedPlacesIfOwnedByEmail(email: string | undefined): void {
  const emailKey = normalizeEmail(email);
  if (!emailKey || !clientAccountRowExistsForEmail(emailKey)) return;
  const byEmail = readPlacesByEmailMap();
  if (byEmail[emailKey]) return;
  try {
    const raw = localStorage.getItem(CLIENT_SAVED_PLACES_STORAGE_KEY);
    if (!raw) return;
    const legacy = sanitizeSnapshot(JSON.parse(raw) as Partial<ClientSavedPlacesSnapshot> & { extras?: unknown[] });
    if (isPlacesSnapshotEmpty(legacy)) return;
    saveClientSavedPlaces(legacy, emailKey);
    localStorage.removeItem(CLIENT_SAVED_PLACES_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function saveClientSavedPlaces(data: ClientSavedPlacesSnapshot, email?: string): void {
  try {
    const emailKey = normalizeEmail(email);
    if (!emailKey) return;
    const snapshot = sanitizeSnapshot(data as Partial<ClientSavedPlacesSnapshot> & { extras?: unknown[] });
    const byEmail = readPlacesByEmailMap();
    byEmail[emailKey] = snapshot;
    localStorage.setItem(CLIENT_SAVED_PLACES_BY_EMAIL_STORAGE_KEY, JSON.stringify(byEmail));
    localStorage.setItem(CLIENT_SAVED_PLACES_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export function createEmptySavedPlaceExtra(): ClientSavedPlaceExtra {
  return { id: genPlaceId(), label: '', address: '', coords: null };
}
