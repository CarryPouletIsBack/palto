import { useEffect, useRef, useState } from 'react';
import './StravaMap.css';

interface StravaMapProps {
  polyline: string;
  activityName?: string;
  photoUrl?: string;
  className?: string;
}

// Fonction pour décoder une polyline Google Maps
const decodePolyline = (encoded: string): [number, number][] => {
  const poly: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let shift = 0;
    let result = 0;
    let byte: number;

    // Décoder latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;

    // Décoder longitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    poly.push([lat * 1e-5, lng * 1e-5]);
  }

  return poly;
};

const StravaMap: React.FC<StravaMapProps> = ({ polyline, activityName, photoUrl, className = '' }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<string>('0 0 400 200');
  const [path, setPath] = useState<string>('');

  useEffect(() => {
    if (!polyline) return;

    try {
      const coordinates = decodePolyline(polyline);
      
      if (coordinates.length === 0) return;

      // Calculer les bornes
      let minLat = coordinates[0][0];
      let maxLat = coordinates[0][0];
      let minLng = coordinates[0][1];
      let maxLng = coordinates[0][1];

      coordinates.forEach(([lat, lng]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });

      // Ajouter une marge
      const latMargin = (maxLat - minLat) * 0.1;
      const lngMargin = (maxLng - minLng) * 0.1;
      
      minLat -= latMargin;
      maxLat += latMargin;
      minLng -= lngMargin;
      maxLng += lngMargin;

      // Calculer le ratio d'aspect
      const latRange = maxLat - minLat;
      const lngRange = maxLng - minLng;
      const aspectRatio = lngRange / latRange;

      // Dimensions du SVG (avec marge)
      const svgWidth = 400;
      const svgHeight = 200;
      const svgAspectRatio = svgWidth / svgHeight;

      let width = svgWidth;
      let height = svgHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (aspectRatio > svgAspectRatio) {
        // Plus large que haut
        height = width / aspectRatio;
        offsetY = (svgHeight - height) / 2;
      } else {
        // Plus haut que large
        width = height * aspectRatio;
        offsetX = (svgWidth - width) / 2;
      }

      setViewBox(`0 0 ${svgWidth} ${svgHeight}`);

      // Convertir les coordonnées en coordonnées SVG
      const svgPath = coordinates
        .map(([lat, lng], index) => {
          const x = offsetX + ((lng - minLng) / lngRange) * width;
          const y = offsetY + height - ((lat - minLat) / latRange) * height; // Inverser Y
          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');

      setPath(svgPath);
    } catch {
      // Erreur silencieuse lors du décodage de la polyline
    }
  }, [polyline]);

  if (!polyline || !path) {
    return (
      <div className={`strava-map-container ${className}`}>
        <div className="strava-map-placeholder">
          <p>Aucune carte disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`strava-map-container ${className}`}>
      {/* En-tête avec nom et photo */}
      {(activityName || photoUrl) && (
        <div className="strava-map-header">
          {photoUrl && (
            <div className="strava-map-photo-container">
              <img 
                src={photoUrl} 
                alt={activityName || 'Activité Strava'} 
                className="strava-map-photo"
              />
            </div>
          )}
          {activityName && (
            <div className="strava-map-title">{activityName}</div>
          )}
        </div>
      )}
      <div className="strava-map-wrapper">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          className="strava-map-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Fond */}
          <rect width="100%" height="100%" fill="#1a1a1a" />
          
          {/* Grille de fond */}
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Trace de l'itinéraire */}
          <path
            d={path}
            fill="none"
            stroke="#fc5200"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="strava-map-path"
          />
          
          {/* Point de départ */}
          {path && (
            <>
              <circle
                cx={path.match(/M\s+([\d.]+)\s+([\d.]+)/)?.[1] || '0'}
                cy={path.match(/M\s+([\d.]+)\s+([\d.]+)/)?.[2] || '0'}
                r="4"
                fill="#4ade80"
                className="strava-map-start"
              />
              {/* Point d'arrivée */}
              <circle
                cx={path.match(/([\d.]+)\s+([\d.]+)\s*$/)?.[1] || '0'}
                cy={path.match(/([\d.]+)\s+([\d.]+)\s*$/)?.[2] || '0'}
                r="4"
                fill="#ef4444"
                className="strava-map-end"
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
};

export default StravaMap;

