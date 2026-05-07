import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCurrentClientUser,
  isClientAuthenticated,
  PALTO_CLIENT_SESSION_CHANGED_EVENT,
} from '../services/authService';
import { getUpcomingScheduledRidesForHomeBanner } from '../constants/clientScheduledRidesHome';
import { getClientLiveMeetRideModel } from '../constants/clientLiveMeetRide';
import { clientRidesApiEnabled, fetchClientRides } from '../services/clientRidesApi';
import { simplifyAddressDisplay } from '../services/addressDisplay';
import type { ClientTopbarUpcomingRide } from '../components/DashboardHomeTopbar'

/**
 * Données passager pour la topbar d’accueil : course à venir + indicateur « chauffeur sur place » (démo).
 */
export function useClientHomeTopbarRides(language: 'fr' | 'en') {
  const [tick, setTick] = useState(0);
  const [apiUpcomingRide, setApiUpcomingRide] = useState<ClientTopbarUpcomingRide | null>(null);

  const formatRideStart = useCallback(
    (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString(language === 'en' ? 'en-GB' : 'fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [language]
  );

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'palto:client_token' || e.key === 'palto:client_auth') bump();
    };
    window.addEventListener('focus', bump);
    document.addEventListener('visibilitychange', bump);
    window.addEventListener('storage', onStorage);
    window.addEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, bump as EventListener);
    return () => {
      window.removeEventListener('focus', bump);
      document.removeEventListener('visibilitychange', bump);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, bump as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!clientRidesApiEnabled()) {
      setApiUpcomingRide(null);
      return () => {};
    }
    let cancelled = false;
    const user = getCurrentClientUser();
    if (!user?.email || !isClientAuthenticated()) {
      setApiUpcomingRide(null);
      return () => {
        cancelled = true;
      };
    }
    void fetchClientRides(user.email, 'upcoming')
      .then((items) => {
        if (cancelled) return;
        const first = items[0];
        if (!first) {
          setApiUpcomingRide(null);
          return;
        }
        const iso = `${first.scheduledDate}T${first.scheduledTime}`;
        setApiUpcomingRide({
          departShort: simplifyAddressDisplay(first.pickupAddress),
          arriveShort: simplifyAddressDisplay(first.dropoffAddress),
          startsAtIso: iso,
          startsLabel: formatRideStart(iso),
        });
      })
      .catch(() => {
        if (!cancelled) setApiUpcomingRide(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tick, formatRideStart]);

  const clientUpcomingRide = useMemo((): ClientTopbarUpcomingRide | null => {
    if (!isClientAuthenticated()) return null;
    if (apiUpcomingRide) return apiUpcomingRide;
    const list = getUpcomingScheduledRidesForHomeBanner();
    const r = list[0];
    if (!r) return null;
    return {
      departShort: r.departShort,
      arriveShort: r.arriveShort,
      startsAtIso: r.startsAtIso,
      startsLabel: formatRideStart(r.startsAtIso),
    };
  }, [tick, formatRideStart, apiUpcomingRide]);

  const clientLiveMeetActive = useMemo(() => {
    if (!isClientAuthenticated()) return false;
    return getClientLiveMeetRideModel() != null;
  }, [tick]);

  return { clientUpcomingRide, clientLiveMeetActive };
}
