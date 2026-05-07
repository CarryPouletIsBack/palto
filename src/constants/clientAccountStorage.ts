/** Persistance locale du profil client (MVP sans backend dédié). */
export const CLIENT_ACCOUNT_STORAGE_KEY = 'palto_client_account_v1';

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
  prenom: 'Marie',
  nom: 'Durand',
  email: 'marie.durand@example.com',
  telephone: '+262 692 12 34 56',
  ville: 'Saint-Denis',
  preferredPayment: 'indifferent',
  profilePhotoUrl: null,
  profilePhotoName: '',
};

export function loadClientAccountSnapshot(): ClientAccountSnapshot {
  try {
    const raw = localStorage.getItem(CLIENT_ACCOUNT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CLIENT_ACCOUNT };
    const parsed = JSON.parse(raw) as Partial<ClientAccountSnapshot>;
    return {
      ...DEFAULT_CLIENT_ACCOUNT,
      ...parsed,
      preferredPayment:
        parsed.preferredPayment === 'card' ||
        parsed.preferredPayment === 'cash' ||
        parsed.preferredPayment === 'indifferent'
          ? parsed.preferredPayment
          : 'indifferent',
    };
  } catch {
    return { ...DEFAULT_CLIENT_ACCOUNT };
  }
}

export function saveClientAccountSnapshot(data: ClientAccountSnapshot): void {
  try {
    localStorage.setItem(CLIENT_ACCOUNT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}
