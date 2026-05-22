import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CircleHelp, MapPin } from 'lucide-react';
import type { Feature, LineString } from 'geojson';
import { toast } from 'sonner';
import HomeOsmMapBackground, {
  OPENSTREET_OUTDOORS_STYLE_URL,
  type HomeMapFlyTo,
} from './HomeOsmMapBackground';
import type { NearbyDriverMapPoint } from './HomeOsmMapBackground';
import { trackEvent } from '../services/googleAnalyticsTracking';
import { fetchDrivingRouteFeature } from '../services/osrmRouting';
import {
  isRideGeoBroadcastEnabled,
  joinRideGeoRoom,
  type RideGeoPayload,
} from '../services/paltoRideLocationRealtime';
import { fetchNearbyDriversAt } from '../services/clientRidesApi';
import type { ClientLiveMeetRideModel } from '../constants/clientLiveMeetRide';
import './ClientRideTrackingView.css';
import './HomeOsmMapBackground.css';

type LngLat = { lng: number; lat: number };

function haversineMeters(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function normalizeName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '');
}

function pickDriverFromPresence(
  drivers: Awaited<ReturnType<typeof fetchNearbyDriversAt>>,
  expectedName: string
): LngLat | null {
  if (!drivers.length) return null;
  const want = normalizeName(expectedName);
  const byName = drivers.find((d) => {
    const n = normalizeName(d.name);
    return n === want || n.includes(want) || want.includes(n);
  });
  const hit = byName ?? drivers[0];
  return { lng: hit.longitude, lat: hit.latitude };
}

export type ClientRideTrackingViewProps = ClientLiveMeetRideModel & {
  onBack: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export default function ClientRideTrackingView({
  courseId,
  rideStatus,
  pickupLabel,
  driverName,
  vehicleLabel,
  licensePlate,
  route,
  departTime,
  meetPickupCoords,
  meetDriverCoordsInitial,
  dropoffCoords,
  onBack,
  t,
}: ClientRideTrackingViewProps) {
  const [driverLngLat, setDriverLngLat] = useState<LngLat | null>(null);
  const [clientLngLat, setClientLngLat] = useState<LngLat | null>(null);
  const [routeFeature, setRouteFeature] = useState<Feature<LineString> | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(Boolean(dropoffCoords));
  const [liveGeoActive, setLiveGeoActive] = useState(false);
  const geoRoomRef = useRef<{
    send: (role: 'client' | 'driver', lng: number, lat: number) => Promise<void>;
    leave: () => void;
  } | null>(null);
  const lastDriverGeoAtRef = useRef(0);
  const lastClientSendRef = useRef(0);

  const useLiveGeo = Boolean(courseId && isRideGeoBroadcastEnabled());

  const pickupOrigin = useMemo(
    () => ({ longitude: meetPickupCoords.lng, latitude: meetPickupCoords.lat }),
    [meetPickupCoords.lng, meetPickupCoords.lat]
  );

  const dropoffDest = useMemo(
    () =>
      dropoffCoords
        ? { longitude: dropoffCoords.lng, latitude: dropoffCoords.lat }
        : null,
    [dropoffCoords?.lng, dropoffCoords?.lat]
  );

  const liveClientPosition = useMemo(
    () =>
      clientLngLat
        ? { longitude: clientLngLat.lng, latitude: clientLngLat.lat }
        : null,
    [clientLngLat]
  );

  const driverOnMap: NearbyDriverMapPoint[] = useMemo(() => {
    if (!driverLngLat) return [];
    return [
      {
        id: 'assigned-driver',
        longitude: driverLngLat.lng,
        latitude: driverLngLat.lat,
        name: driverName,
      },
    ];
  }, [driverLngLat, driverName]);

  const mapFlyTo = useMemo((): HomeMapFlyTo | null => {
    const lngs: number[] = [meetPickupCoords.lng];
    const lats: number[] = [meetPickupCoords.lat];
    if (dropoffCoords) {
      lngs.push(dropoffCoords.lng);
      lats.push(dropoffCoords.lat);
    }
    if (driverLngLat) {
      lngs.push(driverLngLat.lng);
      lats.push(driverLngLat.lat);
    }
    if (clientLngLat) {
      lngs.push(clientLngLat.lng);
      lats.push(clientLngLat.lat);
    }
    if (lngs.length < 2) return null;
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const span = Math.max(maxLng - minLng, maxLat - minLat);
    const zoom = span > 0.12 ? 11.2 : span > 0.04 ? 12.8 : span > 0.015 ? 14 : 15.2;
    return {
      longitude: (minLng + maxLng) / 2,
      latitude: (minLat + maxLat) / 2,
      zoom,
    };
  }, [meetPickupCoords, dropoffCoords, driverLngLat, clientLngLat]);

  useEffect(() => {
    if (!dropoffDest) {
      setRouteFeature(null);
      setLoadingRoute(false);
      return;
    }
    const ac = new AbortController();
    setLoadingRoute(true);
    void fetchDrivingRouteFeature(pickupOrigin, dropoffDest, ac.signal)
      .then((feat) => {
        if (ac.signal.aborted) return;
        setRouteFeature(feat);
      })
      .catch(() => {
        if (!ac.signal.aborted) setRouteFeature(null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingRoute(false);
      });
    return () => ac.abort();
  }, [pickupOrigin, dropoffDest]);

  const pollDriverPresence = useCallback(async () => {
    const pos = await fetchNearbyDriversAt(meetPickupCoords.lat, meetPickupCoords.lng, 40, 16);
    const found = pickDriverFromPresence(pos, driverName);
    if (found) {
      setDriverLngLat(found);
      lastDriverGeoAtRef.current = Date.now();
    }
  }, [meetPickupCoords.lat, meetPickupCoords.lng, driverName]);

  useEffect(() => {
    if (!useLiveGeo || !courseId) {
      setLiveGeoActive(false);
      return;
    }
    let cancelled = false;

    void joinRideGeoRoom(courseId, (p: RideGeoPayload) => {
      if (p.role === 'driver') {
        setDriverLngLat({ lng: p.lng, lat: p.lat });
        lastDriverGeoAtRef.current = Date.now();
      }
      if (p.role === 'client') {
        setClientLngLat({ lng: p.lng, lat: p.lat });
      }
    }).then((room) => {
      if (cancelled || !room) {
        setLiveGeoActive(false);
        return;
      }
      geoRoomRef.current = room;
      setLiveGeoActive(true);
    });

    return () => {
      cancelled = true;
      geoRoomRef.current?.leave();
      geoRoomRef.current = null;
      setLiveGeoActive(false);
    };
  }, [courseId, useLiveGeo]);

  useEffect(() => {
    if (!useLiveGeo || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        setClientLngLat({ lng, lat });
        const now = Date.now();
        if (now - lastClientSendRef.current < 3500) return;
        lastClientSendRef.current = now;
        void geoRoomRef.current?.send('client', lng, lat);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [useLiveGeo]);

  useEffect(() => {
    if (rideStatus === 'in_progress' && useLiveGeo) return;
    void pollDriverPresence();
    const id = window.setInterval(() => {
      if (useLiveGeo && Date.now() - lastDriverGeoAtRef.current < 12000) return;
      void pollDriverPresence();
    }, 8000);
    return () => window.clearInterval(id);
  }, [rideStatus, useLiveGeo, pollDriverPresence]);

  const distanceM =
    driverLngLat && meetPickupCoords
      ? Math.round(haversineMeters(driverLngLat, meetPickupCoords) / 5) * 5
      : null;

  const handleHelp = useCallback(() => {
    trackEvent('click', 'client_ride_tracking', 'help');
    toast.message(t('clientAccount.rideTrackHelpToast'));
  }, [t]);

  const handleDriverMissing = useCallback(() => {
    trackEvent('click', 'client_ride_tracking', 'driver_not_arrived');
    toast.message(t('clientAccount.rideTrackDriverMissingToast'));
  }, [t]);

  return (
    <div className="client-ride-tracking-page" data-ride-tracking-ui="map-v2">
      <header className="client-ride-tracking-header">
        <button
          type="button"
          className="client-ride-tracking-back"
          onClick={() => {
            trackEvent('click', 'client_ride_tracking', 'back');
            onBack();
          }}
        >
          <ArrowLeft size={18} aria-hidden />
          {t('clientMeetDriver.back')}
        </button>
        <div className="client-ride-tracking-headlines">
          <h1>{driverName}</h1>
          <p title={route}>{route}</p>
        </div>
        <button
          type="button"
          className="client-ride-tracking-help-btn"
          onClick={handleHelp}
          aria-label={t('clientAccount.rideTrackHelp')}
          title={t('clientAccount.rideTrackHelp')}
        >
          <CircleHelp size={18} aria-hidden />
        </button>
      </header>

      <div className="client-ride-tracking-map-wrap">
        {loadingRoute && !routeFeature ? (
          <div className="client-ride-tracking-map-status">{t('clientAccount.rideTrackLoadingRoute')}</div>
        ) : null}
        <HomeOsmMapBackground
          variant="embedded"
          flyToTarget={mapFlyTo}
          userOrigin={pickupOrigin}
          selectedDestination={dropoffDest}
          routeFeature={routeFeature}
          nearbyDrivers={driverOnMap}
          liveClientPosition={liveClientPosition}
          view3D
          mapStyleUrl={OPENSTREET_OUTDOORS_STYLE_URL}
        />
      </div>

      <div className="client-ride-tracking-panel">
        <p className="client-ride-tracking-panel__lead">{t('clientAccount.rideMeetLead')}</p>

        <div className="client-ride-tracking-pickup">
          <MapPin size={18} className="client-ride-tracking-pickup-icon" aria-hidden />
          <div>
            <span className="client-ride-tracking-pickup-label">{t('clientAccount.rideMeetPickup')}</span>
            <p className="client-ride-tracking-pickup-text">{pickupLabel}</p>
            <p className="client-ride-tracking-pickup-meta">
              {route} · {t('clientAccount.rideMeetPickupTime')} {departTime}
            </p>
          </div>
        </div>

        <div className="client-ride-tracking-driver-card" aria-label={t('clientAccount.rideMeetDriverCardAria')}>
          <div className="client-ride-tracking-driver-avatar" aria-hidden>
            {driverName
              .split(/\s+/)
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <p className="client-ride-tracking-driver-name">{driverName}</p>
            {vehicleLabel ? (
              <p className="client-ride-tracking-driver-vehicle">{vehicleLabel}</p>
            ) : null}
            {licensePlate ? (
              <p className="client-ride-tracking-driver-plate">{licensePlate}</p>
            ) : null}
          </div>
        </div>

        {distanceM !== null ? (
          <p className="client-ride-tracking-distance" aria-live="polite">
            {t('clientAccount.rideMeetDistanceMeters', { m: String(distanceM) })}
            {liveGeoActive ? ` · ${t('clientAccount.rideMeetLocationLive')}` : ''}
          </p>
        ) : null}

        <div className="client-ride-tracking-actions">
          <button
            type="button"
            className="client-ride-tracking-btn client-ride-tracking-btn--alert"
            onClick={handleDriverMissing}
          >
            {t('clientAccount.rideTrackDriverMissing')}
          </button>
        </div>
      </div>
    </div>
  );
}
