'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const RB2B_KEY = 'W6Z57HZJ57OX';
const ADMIN_STORAGE_KEY = 'exclude_analytics';

/**
 * Gardien analytics : si tu es Admin (?admin=true ou localStorage), aucun script ne se charge.
 * Sinon (visiteur), Vercel Analytics + RB2B se chargent.
 */
export default function AnalyticsGuard() {
  const [shouldTrack, setShouldTrack] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isAdminUrl = params.get('admin') === 'true';
    const isStoredAdmin = localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';

    if (isAdminUrl || isStoredAdmin) {
      if (isAdminUrl && !isStoredAdmin) {
        localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
        // eslint-disable-next-line no-alert
        alert('Mode Admin activé 🛡️\nTu es maintenant invisible sur cet appareil.');
      }
      setShouldTrack(false);
    } else {
      setShouldTrack(true);
    }
  }, []);

  // Injection RB2B (même logique que Rb2bScript) uniquement pour les visiteurs
  useEffect(() => {
    if (shouldTrack !== true || typeof window === 'undefined') return;
    if ((window as unknown as { reb2b?: unknown }).reb2b) return;
    (window as unknown as { reb2b?: { loaded: boolean } }).reb2b = { loaded: true };
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://ddwl4m2hdecbv.cloudfront.net/b/${RB2B_KEY}/${RB2B_KEY}.js.gz`;
    const first = document.getElementsByTagName('script')[0];
    first?.parentNode?.insertBefore(s, first);
  }, [shouldTrack]);

  if (shouldTrack === null || !shouldTrack) {
    return null;
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
