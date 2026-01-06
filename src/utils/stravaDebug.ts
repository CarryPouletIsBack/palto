/**
 * Utilitaire de débogage pour Strava
 * Utilisez cette fonction dans la console du navigateur pour diagnostiquer les problèmes
 */

export function debugStravaTokens() {
  if (typeof window === 'undefined') {
    console.log('⚠️ Cette fonction ne peut être exécutée que dans le navigateur');
    return;
  }

  const TOKEN_STORAGE_KEY = 'strava_access_token';
  const TOKEN_EXPIRY_KEY = 'strava_token_expiry';
  const REFRESH_TOKEN_STORAGE_KEY = 'strava_refresh_token';

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

  console.group('🔍 Diagnostic Strava Tokens');
  
  console.log('📦 Tokens dans localStorage:');
  console.log('  - Access Token:', token ? token.substring(0, 20) + '...' : '❌ Non trouvé');
  console.log('  - Refresh Token:', refreshToken ? refreshToken.substring(0, 20) + '...' : '❌ Non trouvé');
  console.log('  - Expiry:', expiry ? new Date(parseInt(expiry)).toLocaleString('fr-FR') : '❌ Non trouvé');
  
  if (expiry) {
    const expiryTime = parseInt(expiry);
    const now = Date.now();
    const isExpired = now >= expiryTime;
    
    console.log('\n⏰ État du token:');
    console.log('  - Maintenant:', new Date(now).toLocaleString('fr-FR'));
    console.log('  - Expiration:', new Date(expiryTime).toLocaleString('fr-FR'));
    console.log('  - Status:', isExpired ? '❌ EXPIRÉ' : '✅ Valide');
    
    if (isExpired) {
      const expiredSeconds = Math.floor((now - expiryTime) / 1000);
      const expiredMinutes = Math.floor(expiredSeconds / 60);
      const expiredHours = Math.floor(expiredMinutes / 60);
      console.log(`  - Expiré il y a: ${expiredHours}h ${expiredMinutes % 60}m`);
    }
  }
  
  console.log('\n💡 Solutions:');
  console.log('  1. Pour nettoyer le cache: clearStravaTokens()');
  console.log('  2. Pour renouveler les tokens:');
  console.log('     cd C:\\Users\\Anthony\\strava-api-client');
  console.log('     npm start');
  console.log('     (Puis mettez à jour le .env avec les nouveaux tokens)');
  
  console.groupEnd();
  
  return {
    token: token || null,
    expiry: expiry ? parseInt(expiry) : null,
    refreshToken: refreshToken || null,
    isExpired: expiry ? Date.now() >= parseInt(expiry) : null
  };
}

// Exposer la fonction globalement pour faciliter le débogage
if (typeof window !== 'undefined') {
  (window as any).debugStravaTokens = debugStravaTokens;
}

