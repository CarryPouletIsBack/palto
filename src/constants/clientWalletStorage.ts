/** Persistance locale : solde portefeuille (centimes, sans serveur). */
import { clientAccountRowExistsForEmail } from './clientAccountStorage';

export const CLIENT_WALLET_STORAGE_KEY = 'palto_client_wallet_v1';
const CLIENT_WALLET_BY_EMAIL_STORAGE_KEY = 'palto_client_wallet_by_email_v1';

export interface ClientWalletSnapshot {
  /** Montant en centimes (EUR). */
  balanceCents: number;
}

export const DEFAULT_CLIENT_WALLET: ClientWalletSnapshot = {
  balanceCents: 0,
};

function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? '').trim().toLowerCase();
}

function readWalletByEmailMap(): Record<string, ClientWalletSnapshot> {
  try {
    const raw = localStorage.getItem(CLIENT_WALLET_BY_EMAIL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ClientWalletSnapshot>;
  } catch {
    return {};
  }
}

function parseWallet(raw: string): ClientWalletSnapshot {
  const parsed = JSON.parse(raw) as Partial<ClientWalletSnapshot>;
  const cents = Number(parsed.balanceCents);
  if (!Number.isFinite(cents) || cents < 0) return { ...DEFAULT_CLIENT_WALLET };
  return { balanceCents: Math.round(cents) };
}

/** Migre le solde legacy global vers l’email si le compte Palto est bien celui-ci. */
export function migrateLegacyWalletIfOwnedByEmail(email: string | undefined): void {
  const emailKey = normalizeEmail(email);
  if (!emailKey || !clientAccountRowExistsForEmail(emailKey)) return;
  const byEmail = readWalletByEmailMap();
  if (byEmail[emailKey]) return;
  try {
    const raw = localStorage.getItem(CLIENT_WALLET_STORAGE_KEY);
    if (!raw) return;
    const legacy = parseWallet(raw);
    saveClientWalletSnapshot(legacy, emailKey);
    localStorage.removeItem(CLIENT_WALLET_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadClientWalletSnapshot(email?: string): ClientWalletSnapshot {
  try {
    const emailKey = normalizeEmail(email);
    if (emailKey) {
      const byEmail = readWalletByEmailMap();
      if (byEmail[emailKey]) {
        const cents = Number(byEmail[emailKey].balanceCents);
        if (!Number.isFinite(cents) || cents < 0) return { ...DEFAULT_CLIENT_WALLET };
        return { balanceCents: Math.round(cents) };
      }
      return { ...DEFAULT_CLIENT_WALLET };
    }
    const raw = localStorage.getItem(CLIENT_WALLET_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CLIENT_WALLET };
    return parseWallet(raw);
  } catch {
    return { ...DEFAULT_CLIENT_WALLET };
  }
}

export function saveClientWalletSnapshot(data: ClientWalletSnapshot, email?: string): void {
  try {
    const emailKey = normalizeEmail(email);
    const cents = Number(data.balanceCents);
    const snapshot: ClientWalletSnapshot = {
      balanceCents: !Number.isFinite(cents) || cents < 0 ? 0 : Math.round(cents),
    };
    if (emailKey) {
      const byEmail = readWalletByEmailMap();
      byEmail[emailKey] = snapshot;
      localStorage.setItem(CLIENT_WALLET_BY_EMAIL_STORAGE_KEY, JSON.stringify(byEmail));
    }
    localStorage.setItem(CLIENT_WALLET_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export function formatWalletEUR(cents: number, language: 'fr' | 'en'): string {
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
