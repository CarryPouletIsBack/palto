import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Phone } from 'lucide-react';
import Map, { AttributionControl, Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { trackEvent } from '../services/googleAnalyticsTracking';
import { HOME_OPENSTREET_STYLE_URL } from './HomeMapboxBackground';
import { REUNION_MAP_MAX_BOUNDS } from '../constants/reunionIsland';

export type LngLat = { lng: number; lat: number };

export type ClientCompteRideMeetDriverProps = {
  pickupLabel: string;
  driverName: string;
  vehicleLabel: string;
  vehicleColor?: string;
  licensePlate?: string;
  route: string;
  departTime: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Carte + distance : prise en charge (fixe) */
  meetPickupCoords?: LngLat;
  /** Position initiale du chauffeur (démo : se rapproche du point de prise en charge) */
  meetDriverCoordsInitial?: LngLat;
};

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

export default function ClientCompteRideMeetDriver({
  pickupLabel,
  driverName,
  vehicleLabel,
  vehicleColor,
  licensePlate,
  route,
  departTime,
  t,
  meetPickupCoords,
  meetDriverCoordsInitial,
}: ClientCompteRideMeetDriverProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [driverLngLat, setDriverLngLat] = useState<LngLat | null>(meetDriverCoordsInitial ?? null);
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    setDriverLngLat(meetDriverCoordsInitial ?? null);
  }, [meetDriverCoordsInitial?.lng, meetDriverCoordsInitial?.lat]);

  useEffect(() => {
    if (!meetPickupCoords || !meetDriverCoordsInitial || confirmed) return;
    const id = window.setInterval(() => {
      setDriverLngLat((prev) => {
        if (!prev || !meetPickupCoords) return prev;
        if (haversineMeters(prev, meetPickupCoords) < 28) return prev;
        return moveToward(prev, meetPickupCoords, 0.11);
      });
    }, 3200);
    return () => window.clearInterval(id);
  }, [
    meetPickupCoords?.lng,
    meetPickupCoords?.lat,
    meetDriverCoordsInitial?.lng,
    meetDriverCoordsInitial?.lat,
    confirmed,
  ]);

  const fitBounds = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !meetPickupCoords || !driverLngLat) return;
    let minLng = Math.min(meetPickupCoords.lng, driverLngLat.lng);
    let maxLng = Math.max(meetPickupCoords.lng, driverLngLat.lng);
    let minLat = Math.min(meetPickupCoords.lat, driverLngLat.lat);
    let maxLat = Math.max(meetPickupCoords.lat, driverLngLat.lat);
    const padLng = 0.00035;
    const padLat = 0.0003;
    if (maxLng - minLng < padLng) {
      minLng -= padLng;
      maxLng += padLng;
    }
    if (maxLat - minLat < padLat) {
      minLat -= padLat;
      maxLat += padLat;
    }
    const bounds: [[number, number], [number, number]] = [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
    const run = () => {
      if (!map.isStyleLoaded()) return;
      map.fitBounds(bounds, { padding: 52, maxZoom: 17, duration: 500 });
    };
    run();
    if (!map.isStyleLoaded()) {
      map.once('idle', run);
    }
  }, [meetPickupCoords, driverLngLat]);

  useEffect(() => {
    if (!meetPickupCoords || !driverLngLat) return;
    fitBounds();
  }, [fitBounds, meetPickupCoords, driverLngLat]);

  const hasLiveLocate = Boolean(meetPickupCoords && meetDriverCoordsInitial && driverLngLat);
  const distanceM =
    hasLiveLocate && meetPickupCoords && driverLngLat
      ? Math.round(haversineMeters(driverLngLat, meetPickupCoords) / 5) * 5
      : null;

  return (
    <div className="client-compte-ride-flow client-compte-ride-flow--meet">
      <h5 className="client-compte-ride-flow__title">{t('clientAccount.rideMeetTitle')}</h5>
      <p className="client-compte-ride-flow__lead">{t('clientAccount.rideMeetLead')}</p>

      <div className="client-compte-ride-flow__pickup">
        <MapPin size={18} className="client-compte-ride-flow__pickup-icon" aria-hidden />
        <div>
          <span className="client-compte-ride-flow__pickup-label">{t('clientAccount.rideMeetPickup')}</span>
          <p className="client-compte-ride-flow__pickup-text">{pickupLabel}</p>
          <p className="client-compte-ride-flow__pickup-meta">
            {route} · {t('clientAccount.rideMeetPickupTime')} {departTime}
          </p>
        </div>
      </div>

      {hasLiveLocate ? (
        <div className="client-compte-ride-flow__driver-sync">
          <div className="client-compte-ride-flow__driver-card" aria-label={t('clientAccount.rideMeetDriverCardAria')}>
            <div className="client-compte-ride-flow__driver-avatar" aria-hidden>
              {driverName
                .split(/\s+/)
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="client-compte-ride-flow__driver-body">
              <p className="client-compte-ride-flow__driver-name">{driverName}</p>
              <p className="client-compte-ride-flow__driver-vehicle">{vehicleLabel}</p>
              {vehicleColor ? (
                <p className="client-compte-ride-flow__driver-meta">
                  {t('clientAccount.rideMeetVehicleColor')} {vehicleColor}
                </p>
              ) : null}
              {licensePlate ? (
                <p className="client-compte-ride-flow__driver-plate">{licensePlate}</p>
              ) : null}
            </div>
          </div>

          <div className="client-compte-ride-flow__driver-locate" aria-label={t('clientAccount.rideMeetLocationAria')}>
            <div className="client-compte-ride-flow__driver-locate-head">
              <span className="client-compte-ride-flow__driver-locate-title">
                {t('clientAccount.rideMeetLocationTitle')}
              </span>
              <span className="client-compte-ride-flow__driver-locate-badge">{t('clientAccount.rideMeetLocationLive')}</span>
            </div>
            <div className="client-compte-ride-flow__driver-map-box">
              <Map
                ref={mapRef}
                mapStyle={HOME_OPENSTREET_STYLE_URL}
                initialViewState={{
                  longitude: (meetPickupCoords.lng + driverLngLat.lng) / 2,
                  latitude: (meetPickupCoords.lat + driverLngLat.lat) / 2,
                  zoom: 14.2,
                }}
                maxBounds={REUNION_MAP_MAX_BOUNDS}
                style={{ width: '100%', height: '100%', minHeight: 200 }}
                scrollZoom={false}
                dragRotate={false}
                pitchWithRotate={false}
                touchPitch={false}
                reuseMaps
                onLoad={() => {
                  requestAnimationFrame(() => fitBounds());
                }}
              >
                <AttributionControl position="bottom-right" compact />
                <Marker longitude={meetPickupCoords.lng} latitude={meetPickupCoords.lat} anchor="bottom">
                  <span className="client-compte-ride-flow__map-pin client-compte-ride-flow__map-pin--pickup" title={t('clientAccount.rideMeetPickup')} />
                </Marker>
                <Marker longitude={driverLngLat.lng} latitude={driverLngLat.lat} anchor="bottom">
                  <span className="client-compte-ride-flow__map-pin client-compte-ride-flow__map-pin--driver" title={t('clientAccount.rideMeetDriverPin')} />
                </Marker>
              </Map>
            </div>
            {distanceM !== null ? (
              <p className="client-compte-ride-flow__driver-distance" aria-live="polite">
                {t('clientAccount.rideMeetDistanceMeters', { m: String(distanceM) })}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="client-compte-ride-flow__driver-card" aria-label={t('clientAccount.rideMeetDriverCardAria')}>
          <div className="client-compte-ride-flow__driver-avatar" aria-hidden>
            {driverName
              .split(/\s+/)
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="client-compte-ride-flow__driver-body">
            <p className="client-compte-ride-flow__driver-name">{driverName}</p>
            <p className="client-compte-ride-flow__driver-vehicle">{vehicleLabel}</p>
            {vehicleColor ? (
              <p className="client-compte-ride-flow__driver-meta">
                {t('clientAccount.rideMeetVehicleColor')} {vehicleColor}
              </p>
            ) : null}
            {licensePlate ? (
              <p className="client-compte-ride-flow__driver-plate">{licensePlate}</p>
            ) : null}
          </div>
        </div>
      )}

      <div className="client-compte-ride-flow__actions">
        <button
          type="button"
          className="client-compte-ride-flow__btn client-compte-ride-flow__btn--secondary"
          disabled
          title={t('clientAccount.rideMeetCallDisabledHint')}
        >
          <Phone size={16} aria-hidden />
          {t('clientAccount.rideMeetCall')}
        </button>
        <button
          type="button"
          className="client-compte-ride-flow__btn client-compte-ride-flow__btn--primary"
          disabled={confirmed}
          onClick={() => {
            setConfirmed(true);
            trackEvent('click', 'client_account', 'ride_meet_confirmed');
          }}
        >
          {confirmed ? t('clientAccount.rideMeetConfirmed') : t('clientAccount.rideMeetCta')}
        </button>
      </div>
      {confirmed ? (
        <p className="client-compte-ride-flow__toast" role="status">
          {t('clientAccount.rideMeetToast')}
        </p>
      ) : null}
    </div>
  );
}
