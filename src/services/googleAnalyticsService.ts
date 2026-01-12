/**
 * Service pour interagir avec l'API Google Analytics Data
 * Documentation: https://developers.google.com/analytics/devguides/reporting/data/v1
 */

const GA_API_BASE_URL = 'https://analyticsdata.googleapis.com/v1beta';

export interface GoogleAnalyticsConfig {
  propertyId: string; // Format: properties/123456789 ou juste 123456789
  accessToken?: string; // Token OAuth2 pour l'authentification
}

export interface DateRange {
  startDate: string; // Format: YYYY-MM-DD ou "7daysAgo", "30daysAgo", "today", "yesterday"
  endDate: string;
  name?: string;
}

export interface Metric {
  name: string; // Ex: "activeUsers", "screenPageViews", "eventCount"
  expression?: string;
  invisible?: boolean;
}

export interface Dimension {
  name: string; // Ex: "country", "city", "deviceCategory"
  dimensionExpression?: any;
}

export interface RunReportRequest {
  property: string;
  dateRanges: DateRange[];
  dimensions?: Dimension[];
  metrics: Metric[];
  dimensionFilter?: any;
  metricFilter?: any;
  limit?: string;
  offset?: string;
  orderBys?: any[];
}

export interface RunReportResponse {
  dimensionHeaders: Array<{ name: string }>;
  metricHeaders: Array<{ name: string; type: string }>;
  rows: Array<{
    dimensionValues: Array<{ value: string }>;
    metricValues: Array<{ value: string }>;
  }>;
  totals?: Array<{
    metricValues: Array<{ value: string }>;
  }>;
  rowCount: number;
  metadata?: {
    currencyCode?: string;
    timeZone?: string;
  };
}

/**
 * Formate l'ID de propriété pour l'API Google Analytics Data API
 * 
 * ⚠️ IMPORTANT : L'API nécessite un Property ID NUMÉRIQUE (ex: "123456789")
 * Pas un Measurement ID (ex: "G-MS120551E9" ou "MS120551E9")
 * 
 * Accepte :
 * - Property ID numérique : "123456789" → "properties/123456789"
 * - Property ID avec préfixe : "properties/123456789" → "properties/123456789"
 * - Measurement ID (erreur) : "G-MS120551E9" → throw Error
 */
export function formatPropertyId(propertyId: string): string {
  // Retirer le préfixe "G-" si présent (Measurement ID)
  const cleanId = propertyId.replace(/^G-/, '');
  
  // Si ça commence déjà par "properties/", on le retourne tel quel
  if (cleanId.startsWith('properties/')) {
    return cleanId;
  }
  
  // Vérifier si c'est un Property ID numérique (uniquement des chiffres)
  const numericId = cleanId.replace(/^properties\//, '');
  if (!/^\d+$/.test(numericId)) {
    throw new Error(
      `Property ID invalide: "${propertyId}". ` +
      `L'API Google Analytics Data nécessite un Property ID NUMÉRIQUE (ex: "123456789"), ` +
      `pas un Measurement ID (ex: "G-MS120551E9"). ` +
      `Voir https://developers.google.com/analytics/devguides/reporting/data/v1/property-id pour plus d'informations.`
    );
  }
  
  return `properties/${numericId}`;
}

/**
 * Extrait l'ID numérique de la propriété
 * "G-MS120551E9" -> "MS120551E9"
 */
export function extractPropertyId(propertyId: string): string {
  return propertyId.replace(/^G-/, '').replace(/^properties\//, '');
}

/**
 * Exécute un rapport Google Analytics
 */
export async function runReport(
  config: GoogleAnalyticsConfig,
  request: Omit<RunReportRequest, 'property'>
): Promise<RunReportResponse> {
  const propertyId = formatPropertyId(config.propertyId);
  
  if (!config.accessToken) {
    throw new Error('Token d\'accès OAuth2 requis. Veuillez configurer l\'authentification Google Analytics.');
  }

  const url = `${GA_API_BASE_URL}/${propertyId}:runReport`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Erreur inconnue' } }));
    throw new Error(error.error?.message || `Erreur API: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Exécute un rapport en temps réel
 */
export async function runRealtimeReport(
  config: GoogleAnalyticsConfig,
  request: {
    dimensions?: Dimension[];
    metrics: Metric[];
    limit?: string;
  }
): Promise<RunReportResponse> {
  const propertyId = formatPropertyId(config.propertyId);
  
  if (!config.accessToken) {
    throw new Error('Token d\'accès OAuth2 requis. Veuillez configurer l\'authentification Google Analytics.');
  }

  const url = `${GA_API_BASE_URL}/${propertyId}:runRealtimeReport`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Erreur inconnue' } }));
    
    // Gérer les erreurs spécifiques de l'API Google Analytics
    if (error.error?.message?.includes('has not been used') || error.error?.message?.includes('disabled')) {
      throw new Error(
        'L\'API Google Analytics Data API n\'est pas activée. ' +
        'Veuillez l\'activer dans Google Cloud Console : ' +
        'https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview?project=416597900962'
      );
    }
    
    if (error.error?.message?.includes('OAuth2')) {
      throw new Error(
        'Pour utiliser l\'API Google Analytics, vous devez configurer l\'authentification OAuth2. ' +
        'Le token d\'accès doit être stocké dans localStorage avec la clé google_analytics_access_token. ' +
        'Veuillez vous connecter via le bouton "Se connecter à Google Analytics" dans le dashboard.'
      );
    }
    
    throw new Error(error.error?.message || `Erreur API: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Récupère les statistiques de base (visiteurs, pages vues, etc.)
 */
export async function getBasicStats(
  config: GoogleAnalyticsConfig,
  days: number = 30
): Promise<{
  activeUsers: number;
  screenPageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
}> {
  const request: Omit<RunReportRequest, 'property'> = {
    dateRanges: [
      {
        startDate: `${days}daysAgo`,
        endDate: 'today',
      },
    ],
    metrics: [
      { name: 'activeUsers' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
    ],
  };

  // Log pour debug (uniquement en développement)
  if (import.meta.env.DEV) {
    console.log('📊 Appel API Google Analytics getBasicStats:', {
      propertyId: config.propertyId,
      dateRange: `${days}daysAgo to today`,
      request
    });
  }

  const response = await runReport(config, request);

  // Log de la réponse complète pour debug
  if (import.meta.env.DEV) {
    console.log('📊 Réponse API Google Analytics:', {
      rowCount: response.rowCount,
      totals: response.totals,
      metricHeaders: response.metricHeaders,
      fullResponse: response
    });
  }

  // Extraire les valeurs des totaux
  const totals = response.totals?.[0]?.metricValues || [];
  
  const stats = {
    activeUsers: parseInt(totals[0]?.value || '0', 10),
    screenPageViews: parseInt(totals[1]?.value || '0', 10),
    averageSessionDuration: parseFloat(totals[2]?.value || '0'),
    bounceRate: parseFloat(totals[3]?.value || '0'),
  };

  // Log des statistiques extraites
  if (import.meta.env.DEV) {
    console.log('📊 Statistiques extraites:', stats);
  }
  
  return stats;
}

/**
 * Récupère les statistiques en temps réel
 */
export async function getRealtimeStats(
  config: GoogleAnalyticsConfig
): Promise<{
  activeUsers: number;
}> {
  const request = {
    metrics: [
      { name: 'activeUsers' },
    ],
  };

  const response = await runRealtimeReport(config, request);

  // Extraire les valeurs des totaux
  const totals = response.totals?.[0]?.metricValues || [];
  
  return {
    activeUsers: parseInt(totals[0]?.value || '0', 10),
  };
}
