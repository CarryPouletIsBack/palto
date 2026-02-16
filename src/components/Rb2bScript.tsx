'use client';

import { useEffect } from 'react';

/** Clé RB2B (à remplacer par la tienne si besoin) */
const RB2B_KEY = 'W6Z57HZJ57OX';

/**
 * Script RB2B en direct (sans GTM) pour capter les visites B2B
 * (ex. "Linear visite ton site"). Méthode recommandée pour éviter
 * les blocages navigateur sur GTM.
 */
export default function Rb2bScript() {
  useEffect(() => {
    if (typeof window === 'undefined' || (window as unknown as { reb2b?: unknown }).reb2b) return;
    (window as unknown as { reb2b?: { loaded: boolean } }).reb2b = { loaded: true };
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://ddwl4m2hdecbv.cloudfront.net/b/${RB2B_KEY}/${RB2B_KEY}.js.gz`;
    const first = document.getElementsByTagName('script')[0];
    first?.parentNode?.insertBefore(s, first);
  }, []);

  return null;
}
