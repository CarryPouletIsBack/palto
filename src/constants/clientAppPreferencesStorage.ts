/** Préférences app démo : thème global (`data-app-theme`) + canaux de notification (local uniquement). */
export const CLIENT_APP_PREFERENCES_KEY = 'palto_client_app_preferences_v1';

export type AppTheme = 'light' | 'dark' | 'contrast';

/** Événement : le facteur d’échelle vient de changer (zoom appliqué sous `App`, plus sur `#root` — Chrome). */
export const FONT_SCALE_CHANGED_EVENT = 'palto-font-scale-changed';

/** Pourcentage → facteur d’échelle affichage (100 % = taille normale). */
export const FONT_SCALE_PERCENT_MIN = 100;
export const FONT_SCALE_PERCENT_MAX = 140;
export const FONT_SCALE_PERCENT_DEFAULT = 100;

export interface ClientAppPreferencesSnapshot {
  theme: AppTheme;
  /** 100–140 : échelle d’affichage (zoom sur le conteneur de page dans App). */
  fontScalePercent: number;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
}

export const DEFAULT_CLIENT_APP_PREFERENCES: ClientAppPreferencesSnapshot = {
  theme: 'light',
  fontScalePercent: FONT_SCALE_PERCENT_DEFAULT,
  notifyEmail: true,
  notifySms: false,
  notifyPush: true,
};

export function clampFontScalePercent(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return FONT_SCALE_PERCENT_DEFAULT;
  return Math.min(FONT_SCALE_PERCENT_MAX, Math.max(FONT_SCALE_PERCENT_MIN, Math.round(n)));
}

export function applyUserFontScaleToDocument(percent: number): void {
  if (typeof document === 'undefined') return;
  const p = clampFontScalePercent(percent);
  const factor = p / 100;
  const root = document.getElementById('root');
  if (root instanceof HTMLElement) {
    /* Ne plus zoomer #root : Chrome casse overflow/scroll (main) et la sidebar. Le zoom est sur .app-page-font-zoom (App). */
    root.style.zoom = '1';
  }
  document.documentElement.style.setProperty('--app-user-font-zoom', String(factor));
  window.dispatchEvent(new CustomEvent(FONT_SCALE_CHANGED_EVENT, { detail: { factor } }));
}

export function applyAppThemeToDocument(theme: AppTheme): void {
  if (typeof document === 'undefined') return;
  const nextTheme = theme === 'dark' || theme === 'contrast' ? theme : 'light';
  document.documentElement.setAttribute('data-app-theme', nextTheme);
}

export function loadClientAppPreferences(): ClientAppPreferencesSnapshot {
  try {
    const raw = localStorage.getItem(CLIENT_APP_PREFERENCES_KEY);
    if (!raw) return { ...DEFAULT_CLIENT_APP_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<ClientAppPreferencesSnapshot>;
    const theme: AppTheme =
      parsed.theme === 'dark' || parsed.theme === 'contrast' ? parsed.theme : 'light';
    return {
      theme,
      fontScalePercent: clampFontScalePercent(parsed.fontScalePercent),
      notifyEmail: typeof parsed.notifyEmail === 'boolean' ? parsed.notifyEmail : DEFAULT_CLIENT_APP_PREFERENCES.notifyEmail,
      notifySms: typeof parsed.notifySms === 'boolean' ? parsed.notifySms : DEFAULT_CLIENT_APP_PREFERENCES.notifySms,
      notifyPush: typeof parsed.notifyPush === 'boolean' ? parsed.notifyPush : DEFAULT_CLIENT_APP_PREFERENCES.notifyPush,
    };
  } catch {
    return { ...DEFAULT_CLIENT_APP_PREFERENCES };
  }
}

export function saveClientAppPreferences(data: ClientAppPreferencesSnapshot): void {
  try {
    localStorage.setItem(CLIENT_APP_PREFERENCES_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
  applyAppThemeToDocument(data.theme);
  applyUserFontScaleToDocument(data.fontScalePercent);
}
