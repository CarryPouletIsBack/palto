/** Persistance locale du profil client (MVP sans backend dédié). */
export const CLIENT_ACCOUNT_STORAGE_KEY = 'palto_client_account_v1';
export const CLIENT_ACCOUNT_BY_EMAIL_STORAGE_KEY = 'palto_client_account_by_email_v1';

export type ClientPreferredPayment = 'indifferent' | 'card' | 'cash';

export interface ClientAccountSnapshot {
  prenom: string;
  nom: string;
  email: string;
  /** Téléphone international (+33… / +262…) */
  telephone: string;
  /** Ville ou quartier de référence sur l’île */
  ville: string;
  preferredPayment: ClientPreferredPayment;
  /** Data URL optionnelle */
  profilePhotoUrl?: string | null;
  profilePhotoName?: string;
}

export const DEFAULT_CLIENT_ACCOUNT: ClientAccountSnapshot = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  ville: '',
  preferredPayment: 'indifferent',
  profilePhotoUrl: null,
  profilePhotoName: '',
};

function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? '').trim().toLowerCase();
}

function sanitizeSnapshot(parsed: Partial<ClientAccountSnapshot> | null | undefined): ClientAccountSnapshot {
  const value = parsed ?? {};
  return {
    ...DEFAULT_CLIENT_ACCOUNT,
    ...value,
    preferredPayment:
      value.preferredPayment === 'card' ||
      value.preferredPayment === 'cash' ||
      value.preferredPayment === 'indifferent'
        ? value.preferredPayment
        : 'indifferent',
  };
}

function readAccountByEmailMap(): Record<string, Partial<ClientAccountSnapshot>> {
  try {
    const raw = localStorage.getItem(CLIENT_ACCOUNT_BY_EMAIL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Partial<ClientAccountSnapshot>>;
  } catch {
    return {};
  }
}

/** Indique si des données compte existent pour cet email (map ou legacy dont l’email correspond). */
export function clientAccountRowExistsForEmail(email: string | undefined): boolean {
  const emailKey = normalizeEmail(email);
  if (!emailKey) return false;
  const byEmail = readAccountByEmailMap();
  if (byEmail[emailKey]) return true;
  try {
    const legacyRaw = localStorage.getItem(CLIENT_ACCOUNT_STORAGE_KEY);
    if (!legacyRaw) return false;
    const legacy = sanitizeSnapshot(JSON.parse(legacyRaw) as Partial<ClientAccountSnapshot>);
    return normalizeEmail(legacy.email) === emailKey;
  } catch {
    return false;
  }
}

export function loadClientAccountSnapshot(email?: string): ClientAccountSnapshot {
  try {
    const emailKey = normalizeEmail(email);
    if (emailKey) {
      const byEmail = readAccountByEmailMap();
      if (byEmail[emailKey]) return sanitizeSnapshot(byEmail[emailKey]);

      const legacyRaw = localStorage.getItem(CLIENT_ACCOUNT_STORAGE_KEY);
      if (legacyRaw) {
        const legacy = sanitizeSnapshot(JSON.parse(legacyRaw) as Partial<ClientAccountSnapshot>);
        if (normalizeEmail(legacy.email) === emailKey) {
          saveClientAccountSnapshot(legacy, emailKey);
          return legacy;
        }
      }
      return { ...DEFAULT_CLIENT_ACCOUNT, email: emailKey };
    }

    const legacyRaw = localStorage.getItem(CLIENT_ACCOUNT_STORAGE_KEY);
    if (!legacyRaw) return { ...DEFAULT_CLIENT_ACCOUNT };
    return sanitizeSnapshot(JSON.parse(legacyRaw) as Partial<ClientAccountSnapshot>);
  } catch {
    return { ...DEFAULT_CLIENT_ACCOUNT };
  }
}

/** Persiste le snapshot ; retourne `false` si quota / serialisation (ex. photo trop lourde). */
export function saveClientAccountSnapshot(data: ClientAccountSnapshot, email?: string): boolean {
  try {
    const snapshot = sanitizeSnapshot(data);
    const emailKey = normalizeEmail(email || snapshot.email);
    if (!emailKey) return false;
    const byEmail = readAccountByEmailMap();
    byEmail[emailKey] = snapshot;
    localStorage.setItem(CLIENT_ACCOUNT_BY_EMAIL_STORAGE_KEY, JSON.stringify(byEmail));
    if (normalizeEmail(snapshot.email) === emailKey) {
      localStorage.setItem(CLIENT_ACCOUNT_STORAGE_KEY, JSON.stringify(snapshot));
    }
    return true;
  } catch {
    return false;
  }
}
