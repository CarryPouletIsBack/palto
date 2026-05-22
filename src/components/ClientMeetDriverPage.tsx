import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  buildClientLiveMeetRideFromRideItem,
  clearClientLiveMeetRideModel,
  getClientLiveMeetRideModel,
  saveClientLiveMeetRideModel,
  type ClientLiveMeetRideModel,
} from '../constants/clientLiveMeetRide';
import ClientCompteRideEndCash from './ClientCompteRideEndCash';
import ClientRideTrackingView from './ClientRideTrackingView';
import {
  CLIENT_RIDES_POLL_FALLBACK_WHEN_REALTIME_MS,
  CLIENT_RIDES_POLL_INTERVAL_MS,
  clientRidesApiEnabled,
  fetchClientRides,
  type ClientRideItem,
} from '../services/clientRidesApi';
import { isClientAuthenticated, getCurrentClientUser } from '../services/authService';
import { supabaseRealtimeConfigured } from '../constants/featureFlags';
import { subscribePaltoCoursesRealtime } from '../services/paltoCoursesRealtime';
import { simplifyAddressDisplay } from '../services/addressDisplay';
import './ClientMeetDriverPage.css';

export interface ClientMeetDriverPageProps {
  onBack: () => void;
}

type RecapState = {
  priceEur: number;
  distanceKm: number;
  durationMin: number;
  driverName: string;
  route: string;
};

function durationMinFromCompletedRide(item: ClientRideItem): number {
  const s = item.startedAt?.trim();
  const c = item.completedAt?.trim();
  if (!s || !c) return 0;
  const a = Date.parse(s);
  const b = Date.parse(c);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.max(1, Math.round((b - a) / 60000));
}

/** Plein écran (hors `.app-page-font-zoom`), même logique que `DriverNavigationView`. */
export default function ClientMeetDriverPage({ onBack }: ClientMeetDriverPageProps) {
  const { t } = useLanguage();
  const [meet, setMeet] = useState<ClientLiveMeetRideModel | null>(() => getClientLiveMeetRideModel());
  const [recap, setRecap] = useState<RecapState | null>(null);
  const trackingCourseIdRef = useRef<string | null>(meet?.courseId ?? null);

  const reconcileFromItems = useCallback((items: ClientRideItem[]) => {
    if (trackingCourseIdRef.current == null) {
      const trackable = items.find(
        (r) =>
          r.status === 'in_progress' ||
          r.status === 'accepted' ||
          r.status === 'pending'
      );
      const sid = getClientLiveMeetRideModel()?.courseId ?? null;
      trackingCourseIdRef.current = trackable?.id ?? sid ?? null;
    }
    if (trackingCourseIdRef.current == null) {
      const trackable = items.find(
        (r) =>
          (r.status === 'in_progress' ||
            r.status === 'accepted' ||
            r.status === 'pending') &&
          typeof r.pickupLng === 'number'
      );
      const m = trackable ? buildClientLiveMeetRideFromRideItem(trackable) : null;
      if (m) {
        trackingCourseIdRef.current = m.courseId;
        setMeet(m);
        setRecap(null);
        saveClientLiveMeetRideModel(m);
      }
      return;
    }
    const cid = trackingCourseIdRef.current;
    const row = items.find((r) => r.id === cid);
    if (!row) return;

    if (row.status === 'completed') {
      setRecap({
        priceEur: Number(row.amountEur) || 0,
        distanceKm:
          typeof row.distanceKm === 'number' && Number.isFinite(row.distanceKm) ? row.distanceKm : 0,
        durationMin: durationMinFromCompletedRide(row),
        driverName: row.driverName?.trim() || '—',
        route: `${simplifyAddressDisplay(row.pickupAddress)} -> ${simplifyAddressDisplay(row.dropoffAddress)}`,
      });
      setMeet(null);
      clearClientLiveMeetRideModel();
      return;
    }

    if (row.status === 'cancelled') {
      setMeet(null);
      setRecap(null);
      clearClientLiveMeetRideModel();
      trackingCourseIdRef.current = null;
      return;
    }

    const m = buildClientLiveMeetRideFromRideItem(row);
    if (m) {
      setMeet(m);
      setRecap(null);
      saveClientLiveMeetRideModel(m);
    }
  }, []);

  useEffect(() => {
    if (!clientRidesApiEnabled() || !isClientAuthenticated()) return;
    const email = getCurrentClientUser()?.email?.trim();
    if (!email) return;
    let cancelled = false;

    const run = () => {
      void fetchClientRides(email, 'all')
        .then((items) => {
          if (cancelled) return;
          reconcileFromItems(items);
        })
        .catch(() => {});
    };

    run();
    const unsub = supabaseRealtimeConfigured() ? subscribePaltoCoursesRealtime(run) : () => {};
    const ms = supabaseRealtimeConfigured()
      ? CLIENT_RIDES_POLL_FALLBACK_WHEN_REALTIME_MS
      : CLIENT_RIDES_POLL_INTERVAL_MS;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      run();
    }, ms);

    return () => {
      cancelled = true;
      unsub();
      window.clearInterval(interval);
    };
  }, [reconcileFromItems]);

  if (recap) {
    return (
      <div className="client-meet-driver-fallback" data-ride-tracking-ui="recap">
        <div className="client-meet-driver-fallback__inner">
          <ClientCompteRideEndCash
            key="ride-recap"
            priceEur={recap.priceEur}
            distanceKm={recap.distanceKm}
            durationMin={recap.durationMin}
            driverName={recap.driverName}
            route={recap.route}
            t={t}
          />
          <button type="button" className="client-meet-driver-fallback__back" onClick={onBack}>
            {t('clientMeetDriver.back')}
          </button>
        </div>
      </div>
    );
  }

  if (!isClientAuthenticated() || !meet) {
    return (
      <div className="client-meet-driver-fallback" data-ride-tracking-ui="empty">
        <div className="client-meet-driver-fallback__inner">
          <div className="client-meet-driver-fallback__empty" role="status">
            <p>{t('clientMeetDriver.unavailable')}</p>
          </div>
          <button type="button" className="client-meet-driver-fallback__back" onClick={onBack}>
            {t('clientMeetDriver.back')}
          </button>
        </div>
      </div>
    );
  }

  return <ClientRideTrackingView {...meet} onBack={onBack} t={t} />;
}
