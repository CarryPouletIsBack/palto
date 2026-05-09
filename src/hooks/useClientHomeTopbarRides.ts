import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCurrentClientUser,
  isClientAuthenticated,
  PALTO_CLIENT_SESSION_CHANGED_EVENT,
} from '../services/authService';
import { getUpcomingScheduledRidesForHomeBanner } from '../constants/clientScheduledRidesHome';
import {
  buildClientLiveMeetRideFromRideItem,
  clearClientLiveMeetRideModel,
  getClientLiveMeetRideModel,
  saveClientLiveMeetRideModel,
} from '../constants/clientLiveMeetRide';
import {
  CLIENT_RIDES_POLL_FALLBACK_WHEN_REALTIME_MS,
  CLIENT_RIDES_POLL_INTERVAL_MS,
  clientRidesApiEnabled,
  fetchClientRides,
} from '../services/clientRidesApi';
import { supabaseRealtimeConfigured } from '../constants/featureFlags';
import { subscribePaltoCoursesRealtime } from '../services/paltoCoursesRealtime';
import { simplifyAddressDisplay } from '../services/addressDisplay';
import type { ClientTopbarUpcomingRide } from '../components/DashboardHomeTopbar'

/**
 * Données passager pour la topbar d’accueil : course à venir + indicateur « chauffeur sur place » (démo).
 */
export function useClientHomeTopbarRides(language: 'fr' | 'en') {
  const [tick, setTick] = useState(0);
  const [apiUpcomingRide, setApiUpcomingRide] = useState<ClientTopbarUpcomingRide | null>(null);
  const [apiLiveMeetActive, setApiLiveMeetActive] = useState(false);

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
    if (!clientRidesApiEnabled() || !supabaseRealtimeConfigured()) return;
    return subscribePaltoCoursesRealtime(() => {
      if (!isClientAuthenticated() || !getCurrentClientUser()?.email) return;
      setTick((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    if (!clientRidesApiEnabled()) return;
    const ms = supabaseRealtimeConfigured()
      ? CLIENT_RIDES_POLL_FALLBACK_WHEN_REALTIME_MS
      : CLIENT_RIDES_POLL_INTERVAL_MS;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (!isClientAuthenticated() || !getCurrentClientUser()?.email) return;
      setTick((n) => n + 1);
    }, ms);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!clientRidesApiEnabled()) {
      setApiUpcomingRide(null);
      setApiLiveMeetActive(false);
      clearClientLiveMeetRideModel();
      return () => {};
    }
    let cancelled = false;
    const user = getCurrentClientUser();
    if (!user?.email || !isClientAuthenticated()) {
      setApiUpcomingRide(null);
      setApiLiveMeetActive(false);
      clearClientLiveMeetRideModel();
      return () => {
        cancelled = true;
      };
    }
    void Promise.all([fetchClientRides(user.email, 'upcoming'), fetchClientRides(user.email, 'all')])
      .then(([upcomingItems, allItems]) => {
        if (cancelled) return;
        const first = upcomingItems[0];
        if (!first) {
          setApiUpcomingRide(null);
        } else {
          const iso = `${first.scheduledDate}T${first.scheduledTime}`;
          setApiUpcomingRide({
            departShort: simplifyAddressDisplay(first.pickupAddress),
            arriveShort: simplifyAddressDisplay(first.dropoffAddress),
            startsAtIso: iso,
            startsLabel: formatRideStart(iso),
          });
        }
        const inProgress = allItems.find((item) => item.status === 'in_progress');
        const meetModel = inProgress ? buildClientLiveMeetRideFromRideItem(inProgress) : null;
        if (meetModel) {
          saveClientLiveMeetRideModel(meetModel);
          setApiLiveMeetActive(true);
        } else {
          clearClientLiveMeetRideModel();
          setApiLiveMeetActive(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiUpcomingRide(null);
          setApiLiveMeetActive(false);
          clearClientLiveMeetRideModel();
        }
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
      departShort: simplifyAddressDisplay(r.departShort),
      arriveShort: simplifyAddressDisplay(r.arriveShort),
      startsAtIso: r.startsAtIso,
      startsLabel: formatRideStart(r.startsAtIso),
    };
  }, [tick, formatRideStart, apiUpcomingRide]);

  const clientLiveMeetActive = useMemo(() => {
    if (!isClientAuthenticated()) return false;
    if (apiLiveMeetActive) return true;
    return getClientLiveMeetRideModel() != null;
  }, [tick, apiLiveMeetActive]);

  return { clientUpcomingRide, clientLiveMeetActive, ridesRefreshEpoch: tick };
}
