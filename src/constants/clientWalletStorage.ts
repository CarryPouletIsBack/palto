/** Persistance locale démo : solde portefeuille (centimes, sans serveur). */
export const CLIENT_WALLET_STORAGE_KEY = 'palto_client_wallet_v1';

export interface ClientWalletSnapshot {
  /** Montant en centimes (EUR). */
  balanceCents: number;
}

export const DEFAULT_CLIENT_WALLET: ClientWalletSnapshot = {
  balanceCents: 1250,
};

export function loadClientWalletSnapshot(): ClientWalletSnapshot {
  try {
    const raw = localStorage.getItem(CLIENT_WALLET_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CLIENT_WALLET };
    const parsed = JSON.parse(raw) as Partial<ClientWalletSnapshot>;
    const cents = Number(parsed.balanceCents);
    if (!Number.isFinite(cents) || cents < 0) return { ...DEFAULT_CLIENT_WALLET };
    return { balanceCents: Math.round(cents) };
  } catch {
    return { ...DEFAULT_CLIENT_WALLET };
  }
}

export function saveClientWalletSnapshot(data: ClientWalletSnapshot): void {
  try {
    localStorage.setItem(CLIENT_WALLET_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function formatWalletEUR(cents: number, language: 'fr' | 'en'): string {
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
