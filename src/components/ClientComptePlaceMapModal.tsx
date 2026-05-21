import { useCallback, useEffect, useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import Map, { Marker, NavigationControl, type MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { HOME_MAP_INITIAL_VIEW, HOME_OPENSTREET_STYLE_URL } from './HomeOsmMapBackground';
import { isLngLatInsideReunionIsland, REUNION_MAP_MAX_BOUNDS } from '../constants/reunionIsland';
import { geocodeReverse, reverseGeocodeDisplayFallback } from '../services/addressGeocoding';
import { resolvePickOnRoad } from '../services/osrmRouting';

export type ClientCompteMapPickResult = {
  lng: number;
  lat: number;
  address: string;
};

type MarkerCoords = { lng: number; lat: number };

export type ClientComptePlaceMapModalProps = {
  open: boolean;
  onClose: () => void;
  language: 'fr' | 'en';
  /** Centre initial du repère (ex. lieu déjà enregistré). Sinon centre île. */
  initialMarker: MarkerCoords | null;
  onConfirm: (result: ClientCompteMapPickResult) => void;
  title: string;
  hint: string;
  confirmLabel: string;
  cancelLabel: string;
  outsideIslandError: string;
  t: (key: string) => string;
};

const DEFAULT_MARKER: MarkerCoords = {
  lng: HOME_MAP_INITIAL_VIEW.longitude,
  lat: HOME_MAP_INITIAL_VIEW.latitude,
};

export default function ClientComptePlaceMapModal({
  open,
  onClose,
  language,
  initialMarker,
  onConfirm,
  title,
  hint,
  confirmLabel,
  cancelLabel,
  outsideIslandError,
  t,
}: ClientComptePlaceMapModalProps) {
  const [marker, setMarker] = useState<MarkerCoords>(DEFAULT_MARKER);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setMarker(initialMarker ?? DEFAULT_MARKER);
    setError(null);
    setConfirming(false);
  }, [open, initialMarker]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleMapClick = useCallback(
    async (e: MapLayerMouseEvent) => {
      const ll = e.lngLat;
      if (!ll) return;
      setError(null);
      const picked = await resolvePickOnRoad(ll.lng, ll.lat, { searchRadiusMeters: 75 });
      setMarker({ lng: picked.longitude, lat: picked.latitude });
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!isLngLatInsideReunionIsland(marker.lng, marker.lat)) {
      setError(outsideIslandError);
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const address =
        (await geocodeReverse(marker.lng, marker.lat, undefined, { language })) ??
        reverseGeocodeDisplayFallback(language, 'mapPoint');
      onConfirm({ lng: marker.lng, lat: marker.lat, address });
      onClose();
    } catch {
      setError(t('clientAccount.placesGeocodeError'));
    } finally {
      setConfirming(false);
    }
  }, [language, marker, onClose, onConfirm, outsideIslandError, t]);

  if (!open) return null;

  return (
    <div className="client-compte-map-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="client-compte-map-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-compte-map-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="client-compte-map-modal-head">
          <h3 id="client-compte-map-modal-title" className="client-compte-map-modal-title">
            {title}
          </h3>
          <p className="dashboard-field-hint" style={{ margin: 0 }}>
            {hint}
          </p>
        </div>
        <div className="client-compte-map-modal-map">
          <Map
            mapStyle={HOME_OPENSTREET_STYLE_URL}
            initialViewState={{
              longitude: marker.lng,
              latitude: marker.lat,
              zoom: initialMarker ? 13.5 : 9,
              pitch: 0,
              bearing: 0,
            }}
            maxBounds={REUNION_MAP_MAX_BOUNDS}
            style={{ width: '100%', height: '100%' }}
            onClick={handleMapClick}
          >
            <NavigationControl position="top-right" showCompass={false} />
            <Marker longitude={marker.lng} latitude={marker.lat} anchor="bottom" color="#f1582a" />
          </Map>
        </div>
        {error ? <p className="dashboard-field-error client-compte-map-modal-error">{error}</p> : null}
        <div className="client-compte-map-modal-actions">
          <button type="button" className="dashboard-user-cancel-btn" onClick={onClose} disabled={confirming}>
            {cancelLabel}
          </button>
          <button type="button" className="dashboard-user-save-btn" onClick={() => void handleConfirm()} disabled={confirming}>
            {confirming ? t('clientAccount.placesMapConfirming') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
