/**
 * Service de tracking Google Analytics avec react-ga4
 * 
 * Ce service initialise Google Analytics et fournit des fonctions
 * pour tracker les pages vues et les événements.
 */

import ReactGA from 'react-ga4';

// ID de mesure Google Analytics (G-MS120551E9)
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-MS120551E9';

/**
 * Initialise Google Analytics
 * À appeler une seule fois au démarrage de l'application
 */
export const initGA = (): void => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('VITE_GA_MEASUREMENT_ID n\'est pas configuré. Google Analytics ne sera pas initialisé.');
    return;
  }

  // Initialiser react-ga4
  ReactGA.initialize(GA_MEASUREMENT_ID, {
    testMode: import.meta.env.DEV, // Mode test en développement (optionnel)
  });

  // Envoyer un événement de page view initial
  ReactGA.send({ hitType: 'pageview', page: window.location.pathname + window.location.search });
};

/**
 * Track une page view
 * À appeler lors des changements de page
 */
export const trackPageView = (path: string, title?: string): void => {
  if (!GA_MEASUREMENT_ID) return;

  ReactGA.send({ 
    hitType: 'pageview', 
    page: path,
    title: title || document.title,
  });
};

/**
 * Track un événement personnalisé
 */
export const trackEvent = (
  action: string,
  category: string = 'general',
  label?: string,
  value?: number
): void => {
  if (!GA_MEASUREMENT_ID) return;

  ReactGA.event({
    action,
    category,
    label,
    value,
  });
};

/**
 * Track un clic sur un lien
 */
export const trackLinkClick = (linkName: string, linkUrl: string): void => {
  trackEvent('click', 'link', linkName);
  // Optionnel : tracker aussi comme pageview si c'est un lien interne
  if (linkUrl.startsWith('/')) {
    trackPageView(linkUrl);
  }
};

/**
 * Track un téléchargement de fichier
 */
export const trackDownload = (fileName: string, fileType: string): void => {
  trackEvent('download', 'file', `${fileName}.${fileType}`);
};

/**
 * Track une recherche
 */
export const trackSearch = (searchTerm: string, resultsCount?: number): void => {
  trackEvent('search', 'site', searchTerm, resultsCount);
};

export default {
  initGA,
  trackPageView,
  trackEvent,
  trackLinkClick,
  trackDownload,
  trackSearch,
};
