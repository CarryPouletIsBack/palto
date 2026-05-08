/** Persistance locale du profil client (MVP sans backend dédié). */
export const CLIENT_ACCOUNT_STORAGE_KEY = 'palto_client_account_v1';
const CLIENT_ACCOUNT_BY_EMAIL_STORAGE_KEY = 'palto_client_account_by_email_v1';

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

export function loadClientAccountSnapshot(email?: string): ClientAccountSnapshot {
  try {
    const emailKey = normalizeEmail(email);
    if (emailKey) {
      const byEmailRaw = localStorage.getItem(CLIENT_ACCOUNT_BY_EMAIL_STORAGE_KEY);
      if (byEmailRaw) {
        const byEmail = JSON.parse(byEmailRaw) as Record<string, Partial<ClientAccountSnapshot>>;
        if (byEmail[emailKey]) return sanitizeSnapshot(byEmail[emailKey]);
      }
    }
    const legacyRaw = localStorage.getItem(CLIENT_ACCOUNT_STORAGE_KEY);
    if (!legacyRaw) return { ...DEFAULT_CLIENT_ACCOUNT };
    const legacy = sanitizeSnapshot(JSON.parse(legacyRaw) as Partial<ClientAccountSnapshot>);
    if (emailKey) saveClientAccountSnapshot(legacy, emailKey);
    return legacy;
  } catch {
    return { ...DEFAULT_CLIENT_ACCOUNT };
  }
}

export function saveClientAccountSnapshot(data: ClientAccountSnapshot, email?: string): void {
  try {
    const snapshot = sanitizeSnapshot(data);
    localStorage.setItem(CLIENT_ACCOUNT_STORAGE_KEY, JSON.stringify(snapshot));
    const emailKey = normalizeEmail(email || snapshot.email);
    if (!emailKey) return;
    const byEmailRaw = localStorage.getItem(CLIENT_ACCOUNT_BY_EMAIL_STORAGE_KEY);
    const byEmail = byEmailRaw ? (JSON.parse(byEmailRaw) as Record<string, ClientAccountSnapshot>) : {};
    byEmail[emailKey] = snapshot;
    localStorage.setItem(CLIENT_ACCOUNT_BY_EMAIL_STORAGE_KEY, JSON.stringify(byEmail));
  } catch {
    /* ignore */
  }
}
