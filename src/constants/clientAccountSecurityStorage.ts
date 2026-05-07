/** Persistance locale démo : date dernier changement MDP + statuts OAuth (sans secrets). */
export const CLIENT_SECURITY_STORAGE_KEY = 'palto_client_security_v1';

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

export function loadClientSecuritySnapshot(): ClientSecuritySnapshot {
  try {
    const raw = localStorage.getItem(CLIENT_SECURITY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CLIENT_SECURITY };
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
  } catch {
    return { ...DEFAULT_CLIENT_SECURITY };
  }
}

export function saveClientSecuritySnapshot(data: ClientSecuritySnapshot): void {
  try {
    localStorage.setItem(CLIENT_SECURITY_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}
