// Service pour récupérer les données Strava
// IMPORTANT: Les access tokens Strava expirent après 6 heures seulement!
// Voir: https://developers.strava.com/docs/authentication/
const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID || '193706';
const STRAVA_CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET || '294ac27e5949d20abedb6f3c54a50b4c848a2240';
const STRAVA_ACCESS_TOKEN = import.meta.env.VITE_STRAVA_ACCESS_TOKEN || '372e8b59c1825f8ff0d6dfa3a8635d44fe9abf96';
const STRAVA_REFRESH_TOKEN = import.meta.env.VITE_STRAVA_REFRESH_TOKEN || '04fff756dc055d1335b1936dda03f98cc25027dd';
const STRAVA_TOKEN_EXPIRES_AT = import.meta.env.VITE_STRAVA_TOKEN_EXPIRES_AT || 1767643565; // Timestamp Unix
// Les tokens Strava expirent après 6 heures (21600 secondes)
// Si vous avez une date d'expiration, convertissez-la en timestamp
// Pour l'instant, on assume que le token expire dans 6 heures s'il n'est pas en cache
// Appeler directement l'API Strava depuis le frontend
// Note: En production sur Vercel, vous pouvez utiliser des API routes pour cacher les tokens
const STRAVA_API_BASE_URL = 'https://www.strava.com/api/v3';
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
    console.log('✅ Tokens Strava supprimés du localStorage');
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
    
    console.log('✅ Token Strava mis à jour:', {
      token: STRAVA_ACCESS_TOKEN.substring(0, 10) + '...',
      expiry: new Date(expiryTimestamp).toLocaleString('fr-FR'),
      expiresAt: STRAVA_TOKEN_EXPIRES_AT,
      note: 'Token valide jusqu\'à ' + new Date(expiryTimestamp).toLocaleString('fr-FR')
    });
  } else if (STRAVA_ACCESS_TOKEN && !shouldUpdateToken) {
    console.log('Utilisation du token en cache (encore valide)');
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
    console.log('🔄 Token du localStorage mis à jour avec celui de .env.local');
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
    console.log(`💾 Données mises en cache: ${cacheKey}`);
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
    // Vérifier le cache d'abord (pour la première page seulement)
    if (page === 1 && perPage === 5) {
      const cached = getFromCache<StravaActivity[]>(CACHE_ACTIVITIES_KEY);
      if (cached) {
        console.log('✅ Activités récupérées depuis le cache (pas d\'appel API)');
        return cached;
      }
    }
    
    // Appeler directement l'API Strava avec le token
    const token = await getValidAccessToken();
    console.log('📡 Appel API:', `${STRAVA_API_BASE_URL}/athlete/activities?per_page=${perPage}&page=${page}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout de 10 secondes
    
    try {
      const response = await fetch(
        `${STRAVA_API_BASE_URL}/athlete/activities?per_page=${perPage}&page=${page}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      console.log('📡 Réponse Strava API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Si on a une erreur 401, vérifier les détails
      if (response.status === 401) {
        const errorText = await response.text();
        const cleanToken = token.trim();
        console.error('❌ Token rejeté (401)', {
          errorDetails: errorText,
          tokenUsed: cleanToken.substring(0, 20) + '...',
          tokenExpected: STRAVA_ACCESS_TOKEN.trim().substring(0, 20) + '...',
          tokensMatch: cleanToken === STRAVA_ACCESS_TOKEN.trim()
        });
      
      // Vérifier si le token utilisé correspond bien au token configuré
      if (cleanToken !== STRAVA_ACCESS_TOKEN.trim()) {
        throw new Error(`Token mismatch: Le token utilisé ne correspond pas au token configuré. Utilisé: "${cleanToken.substring(0, 15)}..." vs Configuré: "${STRAVA_ACCESS_TOKEN.trim().substring(0, 15)}..."`);
      }
      
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
      // Gérer l'erreur 429 (Too Many Requests)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 900; // 15 minutes par défaut
        const errorMessage = `Limite de taux Strava dépassée. Veuillez réessayer dans ${Math.ceil(retrySeconds / 60)} minutes.`;
        console.error('⚠️', errorMessage);
        throw new Error(errorMessage);
      }
      
      const errorText = await response.text();
      let errorMessage = `Erreur Strava API: ${response.status} ${response.statusText}`;
      
      console.error('Erreur Strava API:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
      });
      
      throw new Error(errorMessage);
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
export async function getStravaActivitiesByYear(year: number = 2025): Promise<StravaActivity[]> {
  try {
    // Vérifier le cache d'abord
    if (year === 2025) {
      const cached = getFromCache<StravaActivity[]>(CACHE_ACTIVITIES_2025_KEY);
      if (cached) {
        console.log('✅ Activités 2025 récupérées depuis le cache (pas d\'appel API)');
        return cached;
      }
    }
    
    // Appeler directement l'API Strava avec le token
    const token = await getValidAccessToken();
    // Calculer les timestamps pour le début et la fin de l'année
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year}-12-31T23:59:59Z`);
    const after = Math.floor(startDate.getTime() / 1000); // Timestamp Unix en secondes
    const before = Math.floor(endDate.getTime() / 1000);
    
    const perPage = 200; // Maximum autorisé par l'API Strava
    let allActivities: StravaActivity[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await fetch(
        `${STRAVA_API_BASE_URL}/athlete/activities?after=${after}&before=${before}&per_page=${perPage}&page=${page}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        // Gérer l'erreur 429 (Too Many Requests)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 900; // 15 minutes par défaut
          const errorMessage = `Limite de taux Strava dépassée. Veuillez réessayer dans ${Math.ceil(retrySeconds / 60)} minutes.`;
          console.error('⚠️', errorMessage);
          throw new Error(errorMessage);
        }
        throw new Error(`Erreur Strava API: ${response.status} ${response.statusText}`);
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
    // Appeler directement l'API Strava avec le token
    const token = await getValidAccessToken();
    const response = await fetch(
      `${STRAVA_API_BASE_URL}/activities/${activityId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // Gérer l'erreur 429 (Too Many Requests)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 900; // 15 minutes par défaut
        const errorMessage = `Limite de taux Strava dépassée. Veuillez réessayer dans ${Math.ceil(retrySeconds / 60)} minutes.`;
        console.error('⚠️', errorMessage);
        throw new Error(errorMessage);
      }
      throw new Error(`Erreur Strava API: ${response.status} ${response.statusText}`);
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
    // Vérifier le cache d'abord
    const cached = getFromCache<StravaAthlete>(CACHE_ATHLETE_KEY);
    if (cached) {
      console.log('✅ Données athlète récupérées depuis le cache (pas d\'appel API)');
      return cached;
    }
    
    // Appeler directement l'API Strava avec le token
    const token = await getValidAccessToken();
    console.log('📡 Appel API Athlète:', `${STRAVA_API_BASE_URL}/athlete`);
    const response = await fetch(
      `${STRAVA_API_BASE_URL}/athlete`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('📡 Réponse API Athlète:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    // Gérer l'erreur 429 (Too Many Requests)
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 900; // 15 minutes par défaut
      const errorMessage = `Limite de taux Strava dépassée. Veuillez réessayer dans ${Math.ceil(retrySeconds / 60)} minutes.`;
      console.error('⚠️', errorMessage);
      throw new Error(errorMessage);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Erreur Strava API: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        // Ignorer si ce n'est pas du JSON
      }
      throw new Error(errorMessage);
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
    // Note: Cette route n'est pas encore implémentée dans les API routes
    // Pour l'instant, utiliser directement l'API Strava ou ajouter la route
    const response = await fetch(
      `https://www.strava.com/api/v3/athletes/${athleteId}/stats`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${STRAVA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

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

