'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import {
  isAnalyticsExcluded,
  markAnalyticsExcludedFromUrl,
  readAnalyticsRuntimeConfig,
} from '../services/analytics';

/**
 * Gardien analytics : si l'appareil est exclu (?admin=true ou localStorage),
 * aucun provider optionnel ne se charge.
 */
export default function AnalyticsGuard() {
  const [shouldTrack, setShouldTrack] = useState<boolean | null>(null);

  useEffect(() => {
    markAnalyticsExcludedFromUrl();
    setShouldTrack(!isAnalyticsExcluded());
  }, []);

  // Injection RB2B uniquement si une clé publique est fournie.
  useEffect(() => {
    if (shouldTrack !== true || typeof window === 'undefined') return;
    const { rb2bKey } = readAnalyticsRuntimeConfig();
    if (!rb2bKey) return;
    if ((window as unknown as { reb2b?: unknown }).reb2b) return;
    (window as unknown as { reb2b?: { loaded: boolean } }).reb2b = { loaded: true };
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://ddwl4m2hdecbv.cloudfront.net/b/${rb2bKey}/${rb2bKey}.js.gz`;
    const first = document.getElementsByTagName('script')[0];
    first?.parentNode?.insertBefore(s, first);
  }, [shouldTrack]);

  if (shouldTrack === null || !shouldTrack) {
    return null;
  }

  const config = readAnalyticsRuntimeConfig();

  return (
    <>
      {config.enableVercelAnalytics ? <Analytics /> : null}
      {config.enableSpeedInsights ? <SpeedInsights /> : null}
    </>
  );
}
