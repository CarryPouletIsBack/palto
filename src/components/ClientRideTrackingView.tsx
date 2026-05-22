import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CircleHelp, MapPin } from 'lucide-react';
import type { Feature, LineString } from 'geojson';
import { toast } from 'sonner';
import HomeOsmMapBackground, { OPENSTREET_OUTDOORS_STYLE_URL } from './HomeOsmMapBackground';
import type { NearbyDriverMapPoint } from './HomeOsmMapBackground';
import { trackEvent } from '../services/googleAnalyticsTracking';
import { fetchDrivingRouteFeature } from '../services/osrmRouting';
import {
  isRideGeoBroadcastEnabled,
  joinRideGeoRoom,
  type RideGeoPayload,
} from '../services/paltoRideLocationRealtime';
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

function moveToward(cur: LngLat, target: LngLat, frac: number): LngLat {
  return {
    lng: cur.lng + (target.lng - cur.lng) * frac,
    lat: cur.lat + (target.lat - cur.lat) * frac,
  };
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
  const [driverLngLat, setDriverLngLat] = useState<LngLat | null>(meetDriverCoordsInitial ?? null);
  const [routeFeature, setRouteFeature] = useState<Feature<LineString> | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(Boolean(dropoffCoords));
  const geoRoomRef = useRef<{
    send: (role: 'client' | 'driver', lng: number, lat: number) => Promise<void>;
    leave: () => void;
  } | null>(null);

  const useLiveBroadcast =
    rideStatus === 'in_progress' && Boolean(courseId && isRideGeoBroadcastEnabled());

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

  useEffect(() => {
    setDriverLngLat(meetDriverCoordsInitial ?? null);
  }, [meetDriverCoordsInitial?.lng, meetDriverCoordsInitial?.lat]);

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

  useEffect(() => {
    if (useLiveBroadcast || !meetPickupCoords || !meetDriverCoordsInitial) return;
    const id = window.setInterval(() => {
      setDriverLngLat((prev) => {
        if (!prev) return prev;
        if (haversineMeters(prev, meetPickupCoords) < 28) return prev;
        return moveToward(prev, meetPickupCoords, 0.11);
      });
    }, 3200);
    return () => window.clearInterval(id);
  }, [useLiveBroadcast, meetPickupCoords, meetDriverCoordsInitial]);

  useEffect(() => {
    if (!useLiveBroadcast || !courseId) return;
    let cancelled = false;
    void joinRideGeoRoom(courseId, (p: RideGeoPayload) => {
      if (p.role !== 'driver') return;
      setDriverLngLat({ lng: p.lng, lat: p.lat });
    }).then((room) => {
      if (cancelled || !room) return;
      geoRoomRef.current = room;
    });
    return () => {
      cancelled = true;
      geoRoomRef.current?.leave();
      geoRoomRef.current = null;
    };
  }, [courseId, useLiveBroadcast]);

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
      </header>

      <div className="client-ride-tracking-map-wrap">
        {loadingRoute && !routeFeature ? (
          <div className="client-ride-tracking-map-status">{t('clientAccount.rideTrackLoadingRoute')}</div>
        ) : null}
        <HomeOsmMapBackground
          variant="fullscreen"
          userOrigin={pickupOrigin}
          selectedDestination={dropoffDest}
          routeFeature={routeFeature}
          nearbyDrivers={driverOnMap}
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
            {useLiveBroadcast ? ` · ${t('clientAccount.rideMeetLocationLive')}` : ''}
          </p>
        ) : null}

        <div className="client-ride-tracking-actions">
          <button type="button" className="client-ride-tracking-btn" onClick={handleHelp}>
            <CircleHelp size={16} aria-hidden />
            {t('clientAccount.rideTrackHelp')}
          </button>
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
