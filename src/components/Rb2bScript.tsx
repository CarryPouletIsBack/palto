'use client';

import { useEffect } from 'react';
import { isAnalyticsExcluded, readAnalyticsRuntimeConfig } from '../services/analytics';

/**
 * Script RB2B en direct (sans GTM) pour capter les visites B2B
 * (ex. "Linear visite ton site"). Méthode recommandée pour éviter
 * les blocages navigateur sur GTM.
 */
export default function Rb2bScript() {
  useEffect(() => {
    if (typeof window === 'undefined' || isAnalyticsExcluded() || (window as unknown as { reb2b?: unknown }).reb2b) return;
    const { rb2bKey } = readAnalyticsRuntimeConfig();
    if (!rb2bKey) return;
    (window as unknown as { reb2b?: { loaded: boolean } }).reb2b = { loaded: true };
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://ddwl4m2hdecbv.cloudfront.net/b/${rb2bKey}/${rb2bKey}.js.gz`;
    const first = document.getElementsByTagName('script')[0];
    first?.parentNode?.insertBefore(s, first);
  }, []);

  return null;
}
