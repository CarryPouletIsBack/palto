// Service d'authentification simple
// En production, utilisez un système d'authentification plus robuste

const AUTH_STORAGE_KEY = 'dashboard_auth';
const AUTH_TOKEN_KEY = 'dashboard_token';

// Mot de passe stocké en variable d'environnement (à configurer dans Vercel)
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'admin123';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  email: string;
  displayName?: string;
  username?: string;
}

// Vérifier si l'utilisateur est authentifié
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    
    // Si aucun token ou données d'auth, pas authentifié
    if (!token || !authData) {
      return false;
    }
    
    // Vérifier que les données sont valides
    const user = JSON.parse(authData);
    const isValid = !!user && !!token && !!user.email;
    
    return isValid;
  } catch (error) {
    return false;
  }
};

// Se connecter
export const login = (credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> => {
  return new Promise((resolve) => {
    // Vérification simple du mot de passe
    // En production, cela devrait être fait côté serveur
    if (credentials.password === DASHBOARD_PASSWORD) {
      const user: User = {
        email: credentials.email,
        displayName: credentials.email.split('@')[0],
      };
      
      // Générer un token simple (en production, utilisez JWT)
      const token = btoa(`${credentials.email}:${Date.now()}`);
      
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      
      resolve({ success: true, user });
    } else {
      resolve({ success: false, error: 'Mot de passe incorrect' });
    }
  });
};

// Se déconnecter
export const logout = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

// Obtenir l'utilisateur actuel
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!authData) return null;
    return JSON.parse(authData);
  } catch {
    return null;
  }
};
