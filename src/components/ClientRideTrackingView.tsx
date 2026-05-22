import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ArrowLeft, Banknote, CircleHelp, Clock, CreditCard, MapPin, MapPinned } from 'lucide-react';
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
import {
  buildClientLiveMeetRideFromRideItem,
  saveClientLiveMeetRideModel,
  type ClientLiveMeetRideModel,
} from '../constants/clientLiveMeetRide';
import { clientRidesApiEnabled, fetchClientRides } from '../services/clientRidesApi';
import { getCurrentClientUser, isClientAuthenticated } from '../services/authService';
import { clientDriverDisplayFromMeetModel } from '../lib/clientDriverDisplay';
import ClientDriverMeetCard from './ClientDriverMeetCard';
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

function driverInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function normalizeName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '');
}

const SHEET_TOP_DEFAULT_RATIO = 0.42;
const SHEET_TOP_MIN_PX = 72;
const SHEET_TOP_MAX_RATIO = 0.72;

function snapSheetTop(top: number, minTop: number, defaultTop: number, maxTop: number): number {
  const candidates = [minTop, defaultTop, maxTop];
  return candidates.reduce((best, c) => (Math.abs(c - top) < Math.abs(best - top) ? c : best));
}

function formatDistanceKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return '—';
  const rounded = Math.round(km * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
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

export default function ClientRideTrackingView(props: ClientRideTrackingViewProps) {
  const { onBack, t } = props;
  const [meet, setMeet] = useState<ClientLiveMeetRideModel>(() => ({ ...props }));

  useEffect(() => {
    setMeet((prev) => ({ ...prev, ...props }));
  }, [
    props.courseId,
    props.driverName,
    props.driverPhone,
    props.driverProfilePhotoUrl,
    props.vehicleLabel,
    props.licensePlate,
    props.vehicleColor,
    props.rideStatus,
    props.amountEur,
    props.paymentMethod,
  ]);

  const {
    courseId,
    rideStatus,
    pickupLabel,
    driverName,
    driverProfilePhotoUrl,
    driverPhone,
    vehicleLabel,
    vehicleColor,
    licensePlate,
    route,
    departTime,
    meetPickupCoords,
    meetDriverCoordsInitial,
    dropoffCoords,
    amountEur,
    distanceKm,
    durationMin: durationMinFromRide,
    paymentMethod,
  } = meet;

  useEffect(() => {
    if (!clientRidesApiEnabled() || !isClientAuthenticated() || !courseId) return;
    const email = getCurrentClientUser()?.email?.trim();
    if (!email) return;
    let cancelled = false;
    void fetchClientRides(email, 'all').then((items) => {
      if (cancelled) return;
      const row = items.find((r) => r.id === courseId);
      if (!row) return;
      const fresh = buildClientLiveMeetRideFromRideItem(row);
      if (fresh) {
        setMeet((prev) => ({ ...prev, ...fresh }));
        saveClientLiveMeetRideModel(fresh);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetTopPx, setSheetTopPx] = useState(() =>
    typeof window !== 'undefined' ? Math.round(window.innerHeight * SHEET_TOP_DEFAULT_RATIO) : 360
  );
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const sheetDragRef = useRef<{ startY: number; startTop: number } | null>(null);

  const screenHeight = useMemo(
    () => (typeof window !== 'undefined' ? window.innerHeight : 800),
    []
  );
  const sheetMinTop = SHEET_TOP_MIN_PX;
  const sheetDefaultTop = useMemo(
    () => Math.round(screenHeight * SHEET_TOP_DEFAULT_RATIO),
    [screenHeight]
  );
  const sheetMaxTop = useMemo(() => Math.round(screenHeight * SHEET_TOP_MAX_RATIO), [screenHeight]);

  const [driverLngLat, setDriverLngLat] = useState<LngLat | null>(null);
  const [clientLngLat, setClientLngLat] = useState<LngLat | null>(null);
  const [routeFeature, setRouteFeature] = useState<Feature<LineString> | null>(null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(null);
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

  /** Cadrage auto : prise en charge + arrivée uniquement (pas le chauffeur / GPS en direct). */
  const mapFlyTo = useMemo((): HomeMapFlyTo | null => {
    const lngs: number[] = [meetPickupCoords.lng];
    const lats: number[] = [meetPickupCoords.lat];
    if (dropoffCoords) {
      lngs.push(dropoffCoords.lng);
      lats.push(dropoffCoords.lat);
    }
    if (lngs.length < 2 && !dropoffCoords) return null;
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
  }, [meetPickupCoords, dropoffCoords]);

  useEffect(() => {
    if (!dropoffDest) {
      setRouteFeature(null);
      setRouteDurationMin(null);
      setLoadingRoute(false);
      return;
    }
    const ac = new AbortController();
    setLoadingRoute(true);
    void fetchDrivingRouteFeature(pickupOrigin, dropoffDest, ac.signal)
      .then((feat) => {
        if (ac.signal.aborted) return;
        setRouteFeature(feat);
        const ds = feat?.properties?.durationSeconds;
        if (typeof ds === 'number' && ds > 0) {
          setRouteDurationMin(Math.max(1, Math.round(ds / 60)));
        } else {
          setRouteDurationMin(null);
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setRouteFeature(null);
          setRouteDurationMin(null);
        }
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

  useEffect(() => {
    const onResize = () => {
      setSheetTopPx((prev) => {
        const min = SHEET_TOP_MIN_PX;
        const max = Math.round(window.innerHeight * SHEET_TOP_MAX_RATIO);
        return Math.min(max, Math.max(min, prev));
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const clampSheetTop = useCallback(
    (top: number) => Math.min(sheetMaxTop, Math.max(sheetMinTop, top)),
    [sheetMinTop, sheetMaxTop]
  );

  const finishSheetDrag = useCallback(() => {
    setSheetTopPx((prev) => snapSheetTop(prev, sheetMinTop, sheetDefaultTop, sheetMaxTop));
    setIsSheetDragging(false);
    sheetDragRef.current = null;
  }, [sheetMinTop, sheetDefaultTop, sheetMaxTop]);

  const handleSheetPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    sheetDragRef.current = { startY: e.clientY, startTop: sheetTopPx };
    setIsSheetDragging(true);
  };

  const handleSheetPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isSheetDragging || !sheetDragRef.current) return;
    e.preventDefault();
    const start = sheetDragRef.current;
    const next = start.startTop + (e.clientY - start.startY);
    setSheetTopPx(clampSheetTop(next));
  };

  const handleSheetPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isSheetDragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    finishSheetDrag();
  };

  const handleSheetPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    finishSheetDrag();
  };

  const durationLabel = useMemo(() => {
    if (durationMinFromRide && durationMinFromRide > 0) {
      return t('clientAccount.rideDurationMinutes', { n: durationMinFromRide });
    }
    if (routeDurationMin && routeDurationMin > 0) {
      return t('clientAccount.rideTrackDurationEstimate', { n: routeDurationMin });
    }
    return '—';
  }, [durationMinFromRide, routeDurationMin, t]);

  const paymentLabel = useMemo(() => {
    if (paymentMethod === 'card') return t('clientAccount.prefCard');
    if (paymentMethod === 'cash') return t('clientAccount.prefCash');
    return '—';
  }, [paymentMethod, t]);

  const distanceLabel =
    distanceKm != null && Number.isFinite(distanceKm) && distanceKm > 0
      ? t('clientAccount.rideDistanceKm', { n: formatDistanceKm(distanceKm) })
      : '—';

  const priceLabel =
    amountEur > 0 ? t('clientAccount.ridePriceEur', { n: amountEur }) : '—';

  const driverDisplay = useMemo(
    () =>
      clientDriverDisplayFromMeetModel({
        courseId,
        rideStatus,
        pickupLabel,
        route,
        departTime,
        driverName,
        driverProfilePhotoUrl,
        driverPhone,
        vehicleLabel,
        vehicleColor,
        licensePlate,
        meetPickupCoords,
        meetDriverCoordsInitial,
        dropoffCoords,
        amountEur,
        distanceKm,
        durationMin: durationMinFromRide,
        paymentMethod,
      }),
    [
      courseId,
      rideStatus,
      pickupLabel,
      route,
      departTime,
      driverName,
      driverProfilePhotoUrl,
      driverPhone,
      vehicleLabel,
      vehicleColor,
      licensePlate,
      meetPickupCoords,
      meetDriverCoordsInitial,
      dropoffCoords,
      amountEur,
      distanceKm,
      durationMinFromRide,
      paymentMethod,
    ]
  );

  return (
    <div className="client-ride-tracking-page" data-ride-tracking-ui="map-v2">
      <div className="client-ride-tracking-map-wrap">
        {loadingRoute && !routeFeature ? (
          <div className="client-ride-tracking-map-status">{t('clientAccount.rideTrackLoadingRoute')}</div>
        ) : null}
        <HomeOsmMapBackground
          variant="dashboardBackdrop"
          flyToTarget={mapFlyTo}
          recenterRouteLabel={t('clientAccount.mapRecenterRoute')}
          userOrigin={pickupOrigin}
          selectedDestination={dropoffDest}
          routeFeature={routeFeature}
          nearbyDrivers={driverOnMap}
          liveClientPosition={liveClientPosition}
          view3D
          mapStyleUrl={OPENSTREET_OUTDOORS_STYLE_URL}
        />
      </div>

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
        <div className="client-ride-tracking-header-main">
          {driverProfilePhotoUrl ? (
            <img
              src={driverProfilePhotoUrl}
              alt=""
              className="client-ride-tracking-header-avatar"
            />
          ) : (
            <div
              className="client-ride-tracking-header-avatar client-ride-tracking-header-avatar--initials"
              aria-hidden
            >
              {driverInitials(driverName)}
            </div>
          )}
          <div className="client-ride-tracking-headlines">
            <h1>{driverName}</h1>
            <p title={route}>{route}</p>
          </div>
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

      <div
        ref={sheetRef}
        className={`client-ride-tracking-sheet${isSheetDragging ? ' client-ride-tracking-sheet--dragging' : ''}`}
        style={{ top: `${sheetTopPx}px` }}
      >
        <div
          className="client-ride-tracking-sheet__handle"
          role="slider"
          aria-label={t('clientAccount.rideTrackSheetHandleAria')}
          aria-valuemin={sheetMinTop}
          aria-valuemax={sheetMaxTop}
          aria-valuenow={sheetTopPx}
          style={{ cursor: isSheetDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          onPointerDown={handleSheetPointerDown}
          onPointerMove={handleSheetPointerMove}
          onPointerUp={handleSheetPointerUp}
          onPointerCancel={handleSheetPointerCancel}
        >
          <span className="client-ride-tracking-sheet__handle-bar" />
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

        <section
          className="client-ride-tracking-recap"
          aria-label={t('clientAccount.rideTrackOrderRecapAria')}
        >
          <h2 className="client-ride-tracking-recap__title">{t('clientAccount.rideTrackOrderRecap')}</h2>
          <dl className="client-ride-tracking-recap__grid">
            <div className="client-ride-tracking-recap__item">
              <dt>
                <Banknote size={16} aria-hidden />
                {t('clientAccount.ridePrice')}
              </dt>
              <dd>{priceLabel}</dd>
            </div>
            <div className="client-ride-tracking-recap__item">
              <dt>
                <MapPinned size={16} aria-hidden />
                {t('clientAccount.rideDistance')}
              </dt>
              <dd>{distanceLabel}</dd>
            </div>
            <div className="client-ride-tracking-recap__item">
              <dt>
                <Clock size={16} aria-hidden />
                {t('clientAccount.rideDuration')}
              </dt>
              <dd>{durationLabel}</dd>
            </div>
            <div className="client-ride-tracking-recap__item">
              <dt>
                <CreditCard size={16} aria-hidden />
                {t('clientAccount.ridePayment')}
              </dt>
              <dd>{paymentLabel}</dd>
            </div>
          </dl>
        </section>

        <ClientDriverMeetCard
          {...driverDisplay}
          t={t}
          variant="tracking"
          className="client-driver-meet-card--tracking-v2"
          data-driver-card-version="v2"
        />

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
    </div>
  );
}
