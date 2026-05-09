import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { trackEvent } from '../services/googleAnalyticsTracking';
import { isClientAuthenticated, getCurrentClientUser } from '../services/authService';
import {
  buildClientLiveMeetRideFromRideItem,
  clearClientLiveMeetRideModel,
  getClientLiveMeetRideModel,
  saveClientLiveMeetRideModel,
  type ClientLiveMeetRideModel,
} from '../constants/clientLiveMeetRide';
import ClientCompteRideMeetDriver from './ClientCompteRideMeetDriver';
import ClientCompteRideEndCash from './ClientCompteRideEndCash';
import {
  CLIENT_RIDES_POLL_FALLBACK_WHEN_REALTIME_MS,
  CLIENT_RIDES_POLL_INTERVAL_MS,
  clientRidesApiEnabled,
  fetchClientRides,
  type ClientRideItem,
} from '../services/clientRidesApi';
import { supabaseRealtimeConfigured } from '../constants/featureFlags';
import { subscribePaltoCoursesRealtime } from '../services/paltoCoursesRealtime';
import { simplifyAddressDisplay } from '../services/addressDisplay';
import './Dashboard.css';
import './Dashboard.app-theme.css';
import './ClientCompteDashboard.css';
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

export default function ClientMeetDriverPage({ onBack }: ClientMeetDriverPageProps) {
  const { t } = useLanguage();
  const [meet, setMeet] = useState<ClientLiveMeetRideModel | null>(() => getClientLiveMeetRideModel());
  const [recap, setRecap] = useState<RecapState | null>(null);
  const trackingCourseIdRef = useRef<string | null>(null);

  const reconcileFromItems = useCallback((items: ClientRideItem[]) => {
    if (trackingCourseIdRef.current == null) {
      const inProg = items.find((r) => r.status === 'in_progress');
      const sid = getClientLiveMeetRideModel()?.courseId ?? null;
      trackingCourseIdRef.current = inProg?.id ?? sid ?? null;
    }
    if (trackingCourseIdRef.current == null) {
      const inProg = items.find((r) => r.status === 'in_progress');
      const m = inProg ? buildClientLiveMeetRideFromRideItem(inProg) : null;
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

    if (row.status === 'in_progress') {
      const m = buildClientLiveMeetRideFromRideItem(row);
      if (m) {
        setMeet(m);
        setRecap(null);
        saveClientLiveMeetRideModel(m);
      }
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

  const ok = isClientAuthenticated() && (meet != null || recap != null);

  return (
    <div className="page active client-meet-driver-page">
      <div className="client-meet-driver-page__inner">
        <button
          type="button"
          className="client-meet-driver-page__back"
          onClick={() => {
            trackEvent('click', 'client_meet_driver', 'back');
            onBack();
          }}
        >
          <ArrowLeft size={18} aria-hidden />
          {t('clientMeetDriver.back')}
        </button>

        {!ok ? (
          <div className="client-meet-driver-page__empty" role="status">
            <p>{t('clientMeetDriver.unavailable')}</p>
          </div>
        ) : recap ? (
          <ClientCompteRideEndCash
            key="ride-recap"
            priceEur={recap.priceEur}
            distanceKm={recap.distanceKm}
            durationMin={recap.durationMin}
            driverName={recap.driverName}
            route={recap.route}
            t={t}
          />
        ) : meet ? (
          <ClientCompteRideMeetDriver
            courseId={meet.courseId}
            pickupLabel={meet.pickupLabel}
            driverName={meet.driverName}
            vehicleLabel={meet.vehicleLabel}
            vehicleColor={meet.vehicleColor}
            licensePlate={meet.licensePlate}
            route={meet.route}
            departTime={meet.departTime}
            meetPickupCoords={meet.meetPickupCoords}
            meetDriverCoordsInitial={meet.meetDriverCoordsInitial}
            t={t}
          />
        ) : null}
      </div>
    </div>
  );
}
