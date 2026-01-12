// Service pour récupérer les données Strava
// 
// ⚠️ IMPORTANT: Ce service utilise maintenant les endpoints API Vercel (/api/strava/*)
// Les tokens sont gérés côté serveur de manière sécurisée.
// Plus besoin de gérer les tokens côté client !
//
// Les endpoints utilisés:
// - /api/strava/athlete : Informations de l'athlète
// - /api/strava/activities : Liste des activités
// - /api/strava/activities/[id] : Détails d'une activité
// - /api/strava/athlete/stats : Statistiques de l'athlète
//
// 🎭 MODE MOCK (Développement uniquement):
// Pour utiliser les données mockées en développement local, ajoutez dans .env.local:
// VITE_USE_STRAVA_MOCK=true
// Cela permet de travailler sur les styles CSS sans avoir besoin de vercel dev ou des tokens Strava.
// ⚠️ Les mocks ne sont JAMAIS utilisés en production.
//
// Les variables d'environnement suivantes doivent être configurées dans Vercel:
// - STRAVA_ACCESS_TOKEN (ou VITE_STRAVA_ACCESS_TOKEN)
// - STRAVA_REFRESH_TOKEN (ou VITE_STRAVA_REFRESH_TOKEN)
// - STRAVA_CLIENT_ID (ou VITE_STRAVA_CLIENT_ID)
// - STRAVA_CLIENT_SECRET (ou VITE_STRAVA_CLIENT_SECRET)
//
// Note: Les fonctions getValidAccessToken() et refreshAccessToken() ci-dessous
// sont conservées pour compatibilité mais ne sont plus utilisées par ce service.

// Vérifier si on doit utiliser les mocks (uniquement en développement)
// En local (DEV), utiliser les mocks si VITE_USE_STRAVA_MOCK=true
// En production, ne jamais utiliser les mocks
const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_STRAVA_MOCK === 'true'

// Log pour debug (uniquement en développement)
if (import.meta.env.DEV) {
  debugLog('🔍 Mode Mock Strava:', {
    DEV: import.meta.env.DEV,
    VITE_USE_STRAVA_MOCK: import.meta.env.VITE_USE_STRAVA_MOCK,
    USE_MOCK: USE_MOCK
  })
}

// Fonction utilitaire pour les logs de debug (uniquement en développement)
const debugLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(...args)
  }
}

// Fonction pour charger les mocks de manière dynamique (uniquement en développement)
async function getMockData() {
  if (!USE_MOCK) {
    return null
  }
  try {
    const mockData = await import('./stravaMockData')
    return mockData
  } catch {
    return null
  }
}

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID || '193706';
const STRAVA_CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET || '294ac27e5949d20abedb6f3c54a50b4c848a2240';
const STRAVA_ACCESS_TOKEN = import.meta.env.VITE_STRAVA_ACCESS_TOKEN || '372e8b59c1825f8ff0d6dfa3a8635d44fe9abf96';
const STRAVA_REFRESH_TOKEN = import.meta.env.VITE_STRAVA_REFRESH_TOKEN || '04fff756dc055d1335b1936dda03f98cc25027dd';
const STRAVA_TOKEN_EXPIRES_AT = import.meta.env.VITE_STRAVA_TOKEN_EXPIRES_AT || 1767643565; // Timestamp Unix
// Note: STRAVA_API_BASE_URL n'est plus utilisé car on utilise les endpoints API Vercel
const STRAVA_API_BASE_URL = 'https://www.strava.com/api/v3'; // Conservé pour compatibilité
const TOKEN_STORAGE_KEY = 'strava_access_token';
const TOKEN_EXPIRY_KEY = 'strava_token_expiry';
const REFRESH_TOKEN_STORAGE_KEY = 'strava_refresh_token';

// Clés de cache pour les données (durée de vie: 5 minutes)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes
const CACHE_ACTIVITIES_KEY = 'strava_cache_activities';
const CACHE_ACTIVITIES_2025_KEY = 'strava_cache_activities_2025';
const CACHE_ATHLETE_KEY = 'strava_cache_athlete';
const CACHE_TIMESTAMP_PREFIX = 'strava_cache_timestamp_';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  athlete?: any;
}

/**
 * Nettoie le localStorage pour forcer l'utilisation du nouveau token
 * À exécuter une seule fois pour réinitialiser les tokens
 */
function clearStravaTokens(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    debugLog('✅ Tokens Strava supprimés du localStorage');
  }
}

/**
 * Initialise le token depuis l'environnement ou le cache
 */
function initializeToken(): void {
  // DÉCOMMENTER LA LIGNE CI-DESSOUS pour vider le localStorage une seule fois
  // clearStravaTokens();
  
  // Toujours stocker/mettre à jour le refresh token
  if (STRAVA_REFRESH_TOKEN) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, STRAVA_REFRESH_TOKEN);
  }

  // Vérifier si le token en cache est toujours valide
  const cachedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  const cachedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const now = Date.now();
  
  // Si on a un token en cache valide, le garder
  let shouldUpdateToken = true;
  if (cachedToken && cachedExpiry) {
    const expiry = parseInt(cachedExpiry, 10);
    if (now < expiry - (5 * 60 * 1000)) {
      // Le token en cache est encore valide
      shouldUpdateToken = false;
    }
  }
  
  // Forcer la mise à jour avec le token d'accès actuel si nécessaire
  if (STRAVA_ACCESS_TOKEN && shouldUpdateToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, STRAVA_ACCESS_TOKEN);
    
    // Utiliser le timestamp d'expiration réel si disponible, sinon calculer depuis expires_in
    const expiryTimestamp = typeof STRAVA_TOKEN_EXPIRES_AT === 'number' 
      ? STRAVA_TOKEN_EXPIRES_AT * 1000 // Convertir timestamp Unix (secondes) en millisecondes
      : Date.now() + (6 * 60 * 60 * 1000); // Fallback: 6 heures
    
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTimestamp.toString());
    
    debugLog('✅ Token Strava mis à jour:', {
      token: STRAVA_ACCESS_TOKEN.substring(0, 10) + '...',
      expiry: new Date(expiryTimestamp).toLocaleString('fr-FR'),
      expiresAt: STRAVA_TOKEN_EXPIRES_AT,
      note: 'Token valide jusqu\'à ' + new Date(expiryTimestamp).toLocaleString('fr-FR')
    });
  } else if (STRAVA_ACCESS_TOKEN && !shouldUpdateToken) {
    debugLog('Utilisation du token en cache (encore valide)');
  }
}

// Initialiser au chargement du module
initializeToken();

// Exporter la fonction pour pouvoir l'appeler depuis la console
export { clearStravaTokens };

// Importer et exposer la fonction de débogage
import { debugStravaTokens } from '../utils/stravaDebug';
if (typeof window !== 'undefined') {
  (window as any).clearStravaTokens = clearStravaTokens;
  (window as any).debugStravaTokens = debugStravaTokens;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number; // en mètres
  moving_time: number; // en secondes
  elapsed_time: number; // en secondes
  total_elevation_gain: number; // en mètres
  type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map: {
    id: string;
    summary_polyline: string;
    resource_state: number;
  };
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  visibility: string;
  flagged: boolean;
  gear_id: string | null;
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  average_speed: number; // en m/s
  max_speed: number; // en m/s
  average_cadence: number | null;
  average_temp: number | null;
  has_heartrate: boolean;
  average_heartrate: number | null;
  max_heartrate: number | null;
  elev_high: number | null;
  elev_low: number | null;
  pr_count: number;
  total_photo_count: number;
  has_kudoed: boolean;
  photos?: {
    primary?: {
      id: number | null;
      unique_id: string;
      urls: {
        '100': string;
        '600': string;
      };
      source: number;
    } | null;
  };
  primary_photo?: {
    id: number | null;
    unique_id: string;
    urls: {
      '100': string;
      '600': string;
    };
    source: number;
  } | null;
}

export interface StravaAthlete {
  id: number;
  username: string;
  resource_state: number;
  firstname: string;
  lastname: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  premium: boolean;
  summit: boolean;
  created_at: string;
  updated_at: string;
  badge_type_id: number;
  weight: number;
  profile_medium: string;
  profile: string;
  friend: null;
  follower: null;
}

/**
 * Récupère un token valide (inspiré de la logique du script Node.js)
 * Note: Le rafraîchissement automatique depuis le frontend n'est pas possible à cause de CORS
 * Utilisez le script Node.js dans C:\Users\Anthony\strava-api-client pour renouveler les tokens
 * @returns Promise avec le token d'accès valide
 */
async function getValidAccessToken(): Promise<string> {
  // Récupérer le token depuis l'environnement (priorité) ou le cache
  // Priorité: variable d'environnement > localStorage
  let token = STRAVA_ACCESS_TOKEN || '';
  
  // Si pas de token dans l'environnement, vérifier le localStorage
  if (!token) {
    token = localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  }
  
  // Si on a un token dans l'environnement, écraser celui du localStorage pour éviter les conflits
  if (STRAVA_ACCESS_TOKEN && localStorage.getItem(TOKEN_STORAGE_KEY) !== STRAVA_ACCESS_TOKEN) {
    localStorage.setItem(TOKEN_STORAGE_KEY, STRAVA_ACCESS_TOKEN);
    debugLog('🔄 Token du localStorage mis à jour avec celui de .env.local');
  }
  
  if (!token) {
    throw new Error('Aucun token Strava disponible. Veuillez configurer VITE_STRAVA_ACCESS_TOKEN dans votre .env');
  }

  // Récupérer le timestamp d'expiration (en secondes depuis le script Node.js, ou en millisecondes depuis le cache)
  const expiresAtEnv = STRAVA_TOKEN_EXPIRES_AT 
    ? (typeof STRAVA_TOKEN_EXPIRES_AT === 'string' ? parseInt(STRAVA_TOKEN_EXPIRES_AT) : STRAVA_TOKEN_EXPIRES_AT)
    : null;
  
  const cachedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const expiryTimestamp = cachedExpiry 
    ? parseInt(cachedExpiry, 10) / 1000 // Convertir en secondes si c'est en millisecondes
    : expiresAtEnv;

  // Vérifier si le token est encore valide (avec une marge de 60 secondes comme dans le script Node.js)
  if (expiryTimestamp) {
    const now = Math.floor(Date.now() / 1000); // Timestamp en secondes
    const expirySeconds = expiryTimestamp;
    
    if (now < expirySeconds - 60) {
      // Token encore valide
      return token;
    } else {
      // Token expiré - afficher un avertissement
      console.warn('⚠️ Token Strava expiré !');
      console.warn('📝 Pour renouveler le token, utilisez le script Node.js :');
      console.warn('   cd C:\\Users\\Anthony\\strava-api-client');
      console.warn('   npm start');
      console.warn('   (Puis mettez à jour VITE_STRAVA_ACCESS_TOKEN dans votre .env)');
      // Retourner quand même le token (il pourrait encore fonctionner pendant quelques minutes)
      return token;
    }
  }

  // Si pas de timestamp d'expiration, retourner le token quand même
  return token;
}

/**
 * Récupère un nouveau token d'accès en utilisant le refresh token
 * ⚠️ ATTENTION: Cette fonction ne fonctionnera PAS depuis le frontend à cause de CORS
 * Utilisez le script Node.js pour renouveler les tokens
 * @returns Promise avec le nouveau token
 */
async function refreshAccessToken(): Promise<string> {
  console.warn('⚠️ Le rafraîchissement automatique depuis le frontend n\'est pas possible à cause de CORS.');
  console.warn('📝 Utilisez le script Node.js pour renouveler les tokens :');
  console.warn('   cd C:\\Users\\Anthony\\strava-api-client');
  console.warn('   npm start');
  
  // Retourner le token actuel
  return await getValidAccessToken();
}

/**
 * Gère les erreurs de réponse API avec messages détaillés
 * ⚠️ Important: Le body d'une Response ne peut être lu qu'UNE SEULE FOIS
 */
async function handleApiError(response: Response): Promise<never> {
  // Gérer l'erreur 429 (Too Many Requests) - on peut lire les headers sans toucher au body
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 900; // 15 minutes par défaut
    const errorMessage = `⚠️ Limite de taux Strava dépassée. Veuillez réessayer dans ${Math.ceil(retrySeconds / 60)} minutes.`;
    console.error('⚠️', errorMessage);
    throw new Error(errorMessage);
  }
  
  // Lire le body UNE SEULE FOIS (en clonant la réponse pour pouvoir le lire plusieurs fois si besoin)
  let errorText: string;
  let errorData: any = null;
  
  try {
    // Cloner la réponse pour pouvoir lire le body sans le consommer
    const clonedResponse = response.clone();
    errorText = await clonedResponse.text();
    
    // Détecter si on reçoit du HTML au lieu de JSON (API routes non disponibles)
    if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html')) {
      throw new Error(
        '⚠️ Les API routes Vercel ne sont pas disponibles avec "npm run dev".\n\n' +
        'Pour utiliser les données Strava en local :\n' +
        '1. Installez Vercel CLI : npm install -g vercel\n' +
        '2. Lancez : vercel dev (au lieu de npm run dev)\n\n' +
        'Ou utilisez les données mockées :\n' +
        'Créez un fichier .env.local avec : VITE_USE_STRAVA_MOCK=true'
      );
    }
    
    // Essayer de parser en JSON
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      // Si c'est notre erreur personnalisée, la propager
      if (e instanceof Error && e.message.includes('API routes Vercel')) {
        throw e;
      }
      // Ce n'est pas du JSON, on garde juste le texte
    }
  } catch (e) {
    // Si c'est notre erreur personnalisée, la propager
    if (e instanceof Error && e.message.includes('API routes Vercel')) {
      throw e;
    }
    // Si la lecture échoue, utiliser un message générique
    errorText = `Erreur lors de la lecture de la réponse: ${e instanceof Error ? e.message : 'Erreur inconnue'}`;
  }
  
  // Gérer l'erreur 500 (Variables d'environnement manquantes sur Vercel)
  if (response.status === 500 && errorData) {
    if (errorData.missing && errorData.hint) {
      const errorMessage = `❌ Variables d'environnement manquantes sur Vercel: ${errorData.missing.join(', ')}. ${errorData.hint}`;
      console.error('❌', errorMessage);
      throw new Error(errorMessage);
    }
    if (errorData.error && typeof errorData.error === 'string') {
      throw new Error(errorData.error);
    }
  }
  
  // Construire le message d'erreur
  let errorMessage = `Erreur Strava API: ${response.status} ${response.statusText}`;
  
  if (errorData) {
    if (errorData.error && typeof errorData.error === 'string') {
      errorMessage = errorData.error;
    } else if (errorData.message) {
      errorMessage = errorData.message;
    }
  } else if (errorText && errorText.length > 0) {
    errorMessage = errorText;
  }
  
  console.error('Erreur Strava API:', {
    status: response.status,
    statusText: response.statusText,
    errorText: errorText,
    errorData: errorData
  });
  
  throw new Error(errorMessage);
}

/**
 * Vérifie si les données en cache sont encore valides
 */
function isCacheValid(cacheKey: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  
  const timestampKey = `${CACHE_TIMESTAMP_PREFIX}${cacheKey}`;
  const cachedTimestamp = localStorage.getItem(timestampKey);
  
  if (!cachedTimestamp) return false;
  
  const cacheAge = Date.now() - parseInt(cachedTimestamp, 10);
  return cacheAge < CACHE_DURATION;
}

/**
 * Récupère les données depuis le cache
 */
function getFromCache<T>(cacheKey: string): T | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  if (!isCacheValid(cacheKey)) return null;
  
  try {
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.warn('Erreur lors de la lecture du cache:', e);
    return null;
  }
}

/**
 * Met les données en cache
 */
function setCache<T>(cacheKey: string, data: T): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(`${CACHE_TIMESTAMP_PREFIX}${cacheKey}`, Date.now().toString());
    debugLog(`💾 Données mises en cache: ${cacheKey}`);
  } catch (e) {
    console.warn('Erreur lors de l\'écriture du cache:', e);
  }
}

/**
 * Récupère les activités Strava de l'athlète
 * @param perPage Nombre d'activités à récupérer (par défaut: 10)
 * @param page Numéro de page (par défaut: 1)
 * @returns Promise avec la liste des activités
 */
export async function getStravaActivities(perPage: number = 10, page: number = 1): Promise<StravaActivity[]> {
  try {
    // 🎭 Utiliser les mocks si activés (développement uniquement)
    if (USE_MOCK) {
      const mockData = await getMockData()
      if (mockData) {
        return await mockData.mockGetStravaActivities(perPage, page)
      }
    }
    
    // Vérifier le cache d'abord (pour la première page seulement)
    if (page === 1 && perPage === 5) {
      const cached = getFromCache<StravaActivity[]>(CACHE_ACTIVITIES_KEY);
      if (cached) {
        debugLog('✅ Activités récupérées depuis le cache (pas d\'appel API)');
        return cached;
      }
    }
    
    // Utiliser l'endpoint API Vercel (le token est géré côté serveur)
    const url = `/api/strava/activities?per_page=${perPage}&page=${page}`;
    debugLog('📡 Appel API via endpoint Vercel:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout de 10 secondes
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      debugLog('📡 Réponse Strava API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Si on a une erreur 401, vérifier les détails
      if (response.status === 401) {
        const errorText = await response.text();
        console.error('❌ Token rejeté (401)', {
          errorDetails: errorText,
        });
      
      // Parser l'erreur pour voir si c'est un problème de permissions
      let errorMessage = `Token Strava rejeté (401).`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.errors && errorData.errors.length > 0) {
          const permissionError = errorData.errors.find((e: any) => e.field && e.field.includes('permission'));
          if (permissionError) {
            errorMessage = `Permission manquante: Le token n'a pas la permission "${permissionError.field}". Vous devez régénérer votre token avec le scope "activity:read" ou "activity:read_all". Allez sur https://www.strava.com/settings/api et créez un nouveau token avec les bonnes permissions.`;
          }
        }
      } catch (e) {
        errorMessage = `Token Strava rejeté (401). Détails: ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    if (!response.ok) {
      await handleApiError(response);
    }

    // Vérifier si on reçoit du HTML au lieu de JSON (API routes non disponibles)
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      // Cloner la réponse pour pouvoir lire le texte sans consommer le body
      const clonedResponse = response.clone();
      const textResponse = await clonedResponse.text();
      if (textResponse.includes('<!DOCTYPE html>') || textResponse.includes('<html')) {
        throw new Error(
          '⚠️ Les API routes Vercel ne sont pas disponibles avec "npm run dev".\n\n' +
          'Pour utiliser les données Strava en local :\n' +
          '1. Installez Vercel CLI : npm install -g vercel\n' +
          '2. Lancez : vercel dev (au lieu de npm run dev)\n\n' +
          'Ou utilisez les données mockées :\n' +
          'Créez un fichier .env.local avec : VITE_USE_STRAVA_MOCK=true'
        );
      }
    }

    const data = await response.json();
      
      // Mettre en cache si c'est la première page
      if (page === 1 && perPage === 5) {
        setCache(CACHE_ACTIVITIES_KEY, data);
      }
      
      return data;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Timeout: La requête vers l\'API Strava a pris trop de temps (>10s). Vérifiez que vercel dev est bien lancé.');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des activités Strava:', error);
    throw error;
  }
}

/**
 * Récupère toutes les activités d'une année spécifique
 * @param year Année (par défaut: 2025)
 * @returns Promise avec la liste de toutes les activités de l'année
 */
/**
 * Récupère toutes les activités de type "Run" depuis le début
 * @returns Promise avec toutes les runs
 */
export async function getAllRuns(): Promise<StravaActivity[]> {
  if (USE_MOCK) {
    debugLog('🎭 Mode Mock activé - utilisation des données mockées pour getAllRuns');
    // En mode mock, générer plusieurs pages de runs
    const mockData = await getMockData()
    if (mockData) {
      debugLog('✅ Données mockées chargées avec succès pour getAllRuns');
      const allRuns: StravaActivity[] = [];
      for (let page = 1; page <= 5; page++) {
        const activities = await mockData.mockGetStravaActivities(200, page);
        const runs = activities.filter(activity => activity.type === 'Run');
        allRuns.push(...runs);
      }
      // Trier par date (plus ancienne en premier)
      allRuns.sort((a, b) => 
        new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
      );
      return allRuns;
    }
  }

  try {
    const allRuns: StravaActivity[] = [];
    let page = 1;
    let hasMore = true;
    const perPage = 200; // Maximum par page selon l'API Strava
    let consecutiveEmptyPages = 0;

    debugLog('🔄 Début de la récupération de toutes les runs...');

    while (hasMore) {
      const response = await fetch(`/api/strava/activities?per_page=${perPage}&page=${page}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const activities: StravaActivity[] = await response.json();
      
      // Si aucune activité retournée, on a probablement atteint la fin
      if (activities.length === 0) {
        consecutiveEmptyPages++;
        if (consecutiveEmptyPages >= 2) {
          debugLog(`✅ Fin de la récupération (page ${page} vide)`);
          hasMore = false;
          break;
        }
        page++;
        continue;
      }

      consecutiveEmptyPages = 0; // Réinitialiser le compteur si on a des activités
      
      // Filtrer uniquement les runs
      const runs = activities.filter(activity => activity.type === 'Run');
      allRuns.push(...runs);
      
      debugLog(`📄 Page ${page}: ${activities.length} activités (${runs.length} runs) - Total: ${allRuns.length} runs`);

      // Si on a moins de perPage activités, on a probablement récupéré toutes les activités
      if (activities.length < perPage) {
        debugLog(`✅ Dernière page atteinte (${activities.length} < ${perPage})`);
        hasMore = false;
      } else {
        page++;
      }

      // Limite de sécurité augmentée : jusqu'à 50 pages (10000 activités max)
      if (page > 50) {
        console.warn(`⚠️ Limite de 50 pages atteinte pour la récupération des runs (${allRuns.length} runs récupérées)`);
        hasMore = false;
      }
    }

    // Trier par date (plus ancienne en premier)
    allRuns.sort((a, b) => 
      new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    );

    debugLog(`✅ Récupération terminée: ${allRuns.length} runs au total`);
    return allRuns;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de toutes les runs:', error);
    throw error;
  }
}

export async function getStravaActivitiesByYear(year: number = 2025): Promise<StravaActivity[]> {
  try {
    // 🎭 Utiliser les mocks si activés (développement uniquement)
    if (USE_MOCK) {
      const mockData = await getMockData()
      if (mockData) {
        return await mockData.mockGetStravaActivitiesByYear(year)
      }
    }
    
    // Vérifier le cache d'abord
    if (year === 2025) {
      const cached = getFromCache<StravaActivity[]>(CACHE_ACTIVITIES_2025_KEY);
      if (cached) {
        debugLog('✅ Activités 2025 récupérées depuis le cache (pas d\'appel API)');
        return cached;
      }
    }
    
    // Calculer les timestamps pour le début et la fin de l'année
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year}-12-31T23:59:59Z`);
    const after = Math.floor(startDate.getTime() / 1000); // Timestamp Unix en secondes
    const before = Math.floor(endDate.getTime() / 1000);
    
    const perPage = 200; // Maximum autorisé par l'API Strava
    let allActivities: StravaActivity[] = [];
    let page = 1;
    let hasMore = true;
    
    // Utiliser l'endpoint API Vercel (le token est géré côté serveur)
    while (hasMore) {
      const url = `/api/strava/activities?after=${after}&before=${before}&per_page=${perPage}&page=${page}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        await handleApiError(response);
      }
      
      const activities: StravaActivity[] = await response.json();
      
      if (activities.length === 0) {
        hasMore = false;
      } else {
        allActivities = allActivities.concat(activities);
        // Si on a récupéré moins d'activités que per_page, c'est la dernière page
        if (activities.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }
    
    // Mettre en cache les résultats
    if (year === 2025) {
      setCache(CACHE_ACTIVITIES_2025_KEY, allActivities);
    }
    
    return allActivities;
  } catch (error) {
    console.error('Erreur lors de la récupération des activités par année:', error);
    throw error;
  }
}

/**
 * Récupère les détails d'une activité spécifique (avec photos)
 * @param activityId ID de l'activité
 * @returns Promise avec les détails de l'activité
 */
export async function getStravaActivityDetails(activityId: number): Promise<StravaActivity> {
  try {
    // 🎭 Utiliser les mocks si activés (développement uniquement)
    if (USE_MOCK) {
      const mockData = await getMockData()
      if (mockData) {
        return await mockData.mockGetStravaActivityDetails(activityId)
      }
    }
    
    // Utiliser l'endpoint API Vercel (le token est géré côté serveur)
    // S'assurer que l'ID est un nombre
    const id = typeof activityId === 'string' ? parseInt(activityId, 10) : activityId;
    if (isNaN(id)) {
      throw new Error(`ID d'activité invalide: ${activityId}`);
    }
    
    // Utiliser l'endpoint avec query parameter au lieu de route dynamique [id]
    // car les routes dynamiques ne fonctionnent pas correctement sur Vercel
    const url = `/api/strava/activity-details?id=${id}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Si l'erreur est 404 ou autre, ne pas throw mais retourner undefined
      if (response.status === 404) {
        console.warn(`Activité ${id} non trouvée`);
        throw new Error('Activity not found');
      }
      await handleApiError(response);
    }

    // Vérifier que la réponse est bien du JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Réponse non-JSON reçue:', text.substring(0, 200));
      throw new Error('Réponse non-JSON de l\'API Strava');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de l\'activité Strava:', error);
    throw error;
  }
}

/**
 * Récupère les informations de l'athlète Strava
 * @returns Promise avec les informations de l'athlète
 */
export async function getStravaAthlete(): Promise<StravaAthlete> {
  try {
    // 🎭 Utiliser les mocks si activés (développement uniquement)
    if (USE_MOCK) {
      debugLog('🎭 Mode Mock activé - utilisation des données mockées pour getStravaAthlete');
      const mockData = await getMockData()
      if (mockData) {
        debugLog('✅ Données mockées chargées avec succès pour getStravaAthlete');
        return await mockData.mockGetStravaAthlete()
      } else {
        debugLog('⚠️ Mode Mock activé mais impossible de charger les données mockées pour getStravaAthlete');
      }
    }
    
    // Vérifier le cache d'abord
    const cached = getFromCache<StravaAthlete>(CACHE_ATHLETE_KEY);
    if (cached) {
      debugLog('✅ Données athlète récupérées depuis le cache (pas d\'appel API)');
      return cached;
    }
    
    // Utiliser l'endpoint API Vercel (le token est géré côté serveur)
    debugLog('📡 Appel API Athlète via endpoint Vercel:', '/api/strava/athlete');
    const response = await fetch('/api/strava/athlete', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    debugLog('📡 Réponse API Athlète:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();
    
    // Mettre en cache
    setCache(CACHE_ATHLETE_KEY, data);
    
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des informations Strava:', error);
    throw error;
  }
}

/**
 * Interface pour les statistiques de l'athlète
 */
export interface StravaAthleteStats {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
  recent_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
    achievement_count: number;
  };
  all_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  recent_run_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
    achievement_count: number;
  };
  all_run_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  recent_swim_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
    achievement_count: number;
  };
  all_swim_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  ytd_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  ytd_run_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
  ytd_swim_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
  };
}

/**
 * Récupère les statistiques de l'athlète Strava
 * @param athleteId ID de l'athlète
 * @returns Promise avec les statistiques de l'athlète
 */
export async function getStravaAthleteStats(athleteId: number): Promise<StravaAthleteStats> {
  try {
    // Utiliser l'endpoint API Vercel (le token est géré côté serveur)
    const url = `/api/strava/athlete/stats?athlete_id=${athleteId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Strava API: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques Strava:', error);
    throw error;
  }
}

/**
 * Formate la distance en kilomètres
 */
export function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2);
}

/**
 * Formate le temps en heures, minutes, secondes
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Formate la date au format français
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

