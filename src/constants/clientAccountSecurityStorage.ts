/** Persistance locale : date dernier changement MDP + statuts OAuth (sans secrets). */
import { clientAccountRowExistsForEmail } from './clientAccountStorage';

export const CLIENT_SECURITY_STORAGE_KEY = 'palto_client_security_v1';
const CLIENT_SECURITY_BY_EMAIL_STORAGE_KEY = 'palto_client_security_by_email_v1';

export interface ClientSecuritySnapshot {
  /** ISO 8601 */
  passwordLastChangedAt: string;
  oauthGoogle: boolean;
  oauthFacebook: boolean;
  oauthApple: boolean;
}

const DEFAULT_ISO = '2026-01-15T10:00:00.000Z';

export const DEFAULT_CLIENT_SECURITY: ClientSecuritySnapshot = {
  passwordLastChangedAt: DEFAULT_ISO,
  oauthGoogle: false,
  oauthFacebook: false,
  oauthApple: false,
};

function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? '').trim().toLowerCase();
}

function readSecurityByEmailMap(): Record<string, ClientSecuritySnapshot> {
  try {
    const raw = localStorage.getItem(CLIENT_SECURITY_BY_EMAIL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ClientSecuritySnapshot>;
  } catch {
    return {};
  }
}

function parseSecurity(raw: string): ClientSecuritySnapshot {
  const parsed = JSON.parse(raw) as Partial<ClientSecuritySnapshot>;
  return {
    passwordLastChangedAt:
      typeof parsed.passwordLastChangedAt === 'string' && parsed.passwordLastChangedAt.length > 0
        ? parsed.passwordLastChangedAt
        : DEFAULT_ISO,
    oauthGoogle: Boolean(parsed.oauthGoogle),
    oauthFacebook: Boolean(parsed.oauthFacebook),
    oauthApple: Boolean(parsed.oauthApple),
  };
}

export function migrateLegacySecurityIfOwnedByEmail(email: string | undefined): void {
  const emailKey = normalizeEmail(email);
  if (!emailKey || !clientAccountRowExistsForEmail(emailKey)) return;
  const byEmail = readSecurityByEmailMap();
  if (byEmail[emailKey]) return;
  try {
    const raw = localStorage.getItem(CLIENT_SECURITY_STORAGE_KEY);
    if (!raw) return;
    const legacy = parseSecurity(raw);
    saveClientSecuritySnapshot(legacy, emailKey);
    localStorage.removeItem(CLIENT_SECURITY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function sanitizeSecuritySnapshot(value: Partial<ClientSecuritySnapshot>): ClientSecuritySnapshot {
  return {
    passwordLastChangedAt:
      typeof value.passwordLastChangedAt === 'string' && value.passwordLastChangedAt.length > 0
        ? value.passwordLastChangedAt
        : DEFAULT_ISO,
    oauthGoogle: Boolean(value.oauthGoogle),
    oauthFacebook: Boolean(value.oauthFacebook),
    oauthApple: Boolean(value.oauthApple),
  };
}

export function loadClientSecuritySnapshot(email?: string): ClientSecuritySnapshot {
  try {
    const emailKey = normalizeEmail(email);
    if (emailKey) {
      const byEmail = readSecurityByEmailMap();
      if (byEmail[emailKey]) return sanitizeSecuritySnapshot(byEmail[emailKey]);
      return { ...DEFAULT_CLIENT_SECURITY };
    }
    const raw = localStorage.getItem(CLIENT_SECURITY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CLIENT_SECURITY };
    return parseSecurity(raw);
  } catch {
    return { ...DEFAULT_CLIENT_SECURITY };
  }
}

export function saveClientSecuritySnapshot(data: ClientSecuritySnapshot, email?: string): void {
  try {
    const emailKey = normalizeEmail(email);
    const snapshot: ClientSecuritySnapshot = {
      passwordLastChangedAt:
        typeof data.passwordLastChangedAt === 'string' && data.passwordLastChangedAt.length > 0
          ? data.passwordLastChangedAt
          : DEFAULT_ISO,
      oauthGoogle: Boolean(data.oauthGoogle),
      oauthFacebook: Boolean(data.oauthFacebook),
      oauthApple: Boolean(data.oauthApple),
    };
    if (emailKey) {
      const byEmail = readSecurityByEmailMap();
      byEmail[emailKey] = snapshot;
      localStorage.setItem(CLIENT_SECURITY_BY_EMAIL_STORAGE_KEY, JSON.stringify(byEmail));
    }
    localStorage.setItem(CLIENT_SECURITY_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}
