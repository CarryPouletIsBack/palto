// Service d'authentification
// Utilise une API route Vercel pour la vérification du mot de passe

const AUTH_STORAGE_KEY = 'dashboard_auth';
const AUTH_TOKEN_KEY = 'dashboard_token';

// URL de l'API d'authentification
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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
export const login = async (credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> => {
  // Identifiants autorisés
  const AUTHORIZED_EMAIL = 'merault.anthony@gmail.com';
  const AUTHORIZED_PASSWORD = 'Kylian03?';

  // En développement local, vérifier directement
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isDevelopment) {
    // Vérification locale pour le développement
    if (credentials.email === AUTHORIZED_EMAIL && credentials.password === AUTHORIZED_PASSWORD) {
      const token = btoa(`${credentials.email}:${Date.now()}`);
      const user: User = {
        email: credentials.email,
        displayName: credentials.email.split('@')[0],
      };
      
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      
      return { success: true, user };
    } else if (credentials.email !== AUTHORIZED_EMAIL) {
      return { success: false, error: 'Email incorrect' };
    } else {
      return { success: false, error: 'Mot de passe incorrect' };
    }
  }

  // En production, utiliser l'API Vercel
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    // Si l'API n'est pas disponible, fallback sur la vérification locale
    if (!response.ok) {
      console.warn('API non disponible, utilisation du fallback local');
      if (credentials.email === AUTHORIZED_EMAIL && credentials.password === AUTHORIZED_PASSWORD) {
        const token = btoa(`${credentials.email}:${Date.now()}`);
        const user: User = {
          email: credentials.email,
          displayName: credentials.email.split('@')[0],
        };
        
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        
        return { success: true, user };
      } else {
        return { success: false, error: 'Identifiants incorrects' };
      }
    }

    const data = await response.json();

    if (data.success && data.user && data.token) {
      // Stocker le token et les données utilisateur
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
      
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.error || 'Erreur de connexion' };
    }
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    // Fallback sur la vérification locale si l'API échoue
    if (credentials.email === AUTHORIZED_EMAIL && credentials.password === AUTHORIZED_PASSWORD) {
      const token = btoa(`${credentials.email}:${Date.now()}`);
      const user: User = {
        email: credentials.email,
        displayName: credentials.email.split('@')[0],
      };
      
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      
      return { success: true, user };
    }
    return { success: false, error: 'Erreur de connexion au serveur' };
  }
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
