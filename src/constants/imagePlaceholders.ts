/** Chemins publics pour remplacer photos / exports Figma (projet Palto). */
export function publicAssetPath(relativeFromPublic: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const path = relativeFromPublic.startsWith('/') ? relativeFromPublic : `/${relativeFromPublic}`;
  return `${base}${path}`;
}

export const PLACEHOLDER_COVER = publicAssetPath('/images/placeholder-cover.svg');
export const PLACEHOLDER_MEDIA = publicAssetPath('/images/placeholder-media.svg');
export const PLACEHOLDER_ICON = publicAssetPath('/images/placeholder-icon.svg');
export const PLACEHOLDER_LOGO = publicAssetPath('/images/placeholder-logo.svg');
export const PLACEHOLDER_PORTRAIT = publicAssetPath('/images/placeholder-portrait.svg');
export const PLACEHOLDER_DECOR = publicAssetPath('/images/placeholder-decor.svg');
export const PLACEHOLDER_APP_ICON = publicAssetPath('/images/placeholder-app-icon.svg');
