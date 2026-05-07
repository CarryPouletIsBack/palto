const DEMO_PURGE_MARKER_KEY = 'palto:demo-purged-version';
const DEMO_PURGE_VERSION = '2026-05-prod-empty-v1';

const LOCAL_STORAGE_KEYS_TO_CLEAR = [
  'dashboard_auth',
  'dashboard_token',
  'palto:client_auth',
  'palto:client_token',
  'palto:client_registered_v1',
  'palto_client_account_v1',
  'palto_client_saved_places_v1',
  'palto_client_wallet_v1',
  'palto:client_scheduled_rides_home_v1',
  'palto_client_security_v1',
  'palto_client_app_preferences_v1',
  'palto_chauffeur_organization_v1',
  'palto_chauffeur_inbox_v1',
  'palto:chauffeur_registered_v1',
  'palto:chauffeur_compliance_v1',
  'palto.chauffeur.ride-settings.v1',
  'palto:view',
] as const;

const SESSION_STORAGE_KEYS_TO_CLEAR = ['palto:goPrefill', 'palto:chauffeur-nav-course'] as const;

export function purgeDemoDataOnce(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(DEMO_PURGE_MARKER_KEY) === DEMO_PURGE_VERSION) return;
    LOCAL_STORAGE_KEYS_TO_CLEAR.forEach((key) => localStorage.removeItem(key));
    SESSION_STORAGE_KEYS_TO_CLEAR.forEach((key) => sessionStorage.removeItem(key));
    localStorage.setItem(DEMO_PURGE_MARKER_KEY, DEMO_PURGE_VERSION);
  } catch {
    // Ignore les navigateurs qui bloquent le storage.
  }
}
