import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type FC,
  type KeyboardEvent,
  type FocusEvent,
  type MouseEvent,
  type TouchEvent,
  type RefObject,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { trackEvent } from '../services/googleAnalyticsTracking';
import { createRideOrder } from '../services/createRideOrder';
import { confirmRidePaymentAuthorized } from '../services/stripeRidePayment';
import { stripeCheckoutEnabled, stripePublishableKey } from '../constants/featureFlags';
import { formatRideTotalWithPaltoFee, PALTO_PLATFORM_FEE_EUR } from '../constants/stripeFees';
import PaltoStripePaymentForm from './PaltoStripePaymentForm';
import { motion, useMotionValue } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import './SingleProject.css';
import './SingleProject.app-theme.css';
import { type ProjectData } from '../data/projects';
import BlurText from './BlurText';
import DonutChartRace from './DonutChartRace';
import PositionnementMatrixChart from './PositionnementMatrixChart';
import UserFlowChart from './UserFlowChart';
import { TreeNode } from './flow/FlowTree';
import type { FlowNodeData } from '../data/flowData';
import Button from './Button';
import { ChevronLeft } from 'lucide-react';
import PaltoGoMobileRouteCard from './PaltoGoMobileRouteCard';
import PaltoGoMobileSuggestionsPanel, {
  type PaltoGoMobileHistoryItem,
} from './PaltoGoMobileSuggestionsPanel';
import { POPULAR_DESTINATIONS, type PopularDestination } from '../data/popularDestinations';
import { clientRidesApiEnabled, fetchClientRides } from '../services/clientRidesApi';
import PaltoGoPickupTimingSelect from './PaltoGoPickupTimingSelect';
import ContactModal from './ContactModal';
import { PaltoPaletteTable, PaltoTypescaleTable } from './PaltoDesignSystemTables';
import CardSwap, { Card } from './CardSwap';
import MagicBento from './MagicBento';
import PaltoH1HandwritingLogo from './PaltoH1HandwritingLogo';
import ScrollStack, { ScrollStackItem } from './ScrollStack';
import { LEGACY_DEV_PICKUP_ORIGIN } from '../constants/defaultUserOrigin';
import HomeOsmMapBackground from './HomeOsmMapBackground';
import { isLngLatInsideReunionIsland } from '../constants/reunionIsland';
import { resolvePickOnRoad, fetchDrivingRouteFeature } from '../services/osrmRouting';
import {
  geocodeForward,
  geocodeForwardSuggestions,
  geocodeReverse,
  reverseGeocodeDisplayFallback,
  type GeocodeSuggestion,
} from '../services/addressGeocoding';
import { REUNION_ISLAND_BBOX_GEOCODE } from '../constants/reunionIsland';
import { haversineDistanceKm, type GeoPoint } from '../services/distanceGeo';
import { consumeGoPrefill } from '../constants/goPrefillStorage';
import {
  DEFAULT_HERO_DEPARTMENT_ID,
  getHeroDepartmentGeocodeArea,
  getHeroDepartmentLabel,
  getHeroDepartmentOrigin,
  type HeroDepartmentId,
} from '../data/heroDepartments';
import {
  loadClientSavedPlaces,
  migrateLegacySavedPlacesIfOwnedByEmail,
} from '../constants/clientSavedPlacesStorage';
import { loadClientAccountSnapshot } from '../constants/clientAccountStorage';
import { syncClientProfileWithServer } from '../services/clientProfileSync';
import {
  getCurrentClientUser,
  isClientAuthenticated,
  PALTO_CLIENT_SESSION_CHANGED_EVENT,
} from '../services/authService';
import {
  CHAUFFEUR_RIDE_SETTINGS_KEY,
  loadChauffeurRideSettingsSnapshot,
} from '../constants/chauffeurRideSettingsStorage';
import { DashboardHomeRidesBanner } from './DashboardHomeRidesBanner';
import { useClientHomeTopbarRides } from '../hooks/useClientHomeTopbarRides';
import { simplifyAddressDisplay as simplifyRideAddress } from '../services/addressDisplay';
import { getNearbyDrivers } from '../services/getNearbyDrivers';
import { formatDriverMetaLine } from '../lib/formatDriverMetaLine';

/** Rayon d’affichage des chauffeurs autour du point de départ validé (page Go). */
const PICKUP_DRIVER_SEARCH_RADIUS_KM = 20;
const DEFAULT_BASE_FARE_EUR = 4;
const DEFAULT_PRICE_PER_KM_EUR = 1.35;
const PICKUP_AUTOCOMPLETE_DEBOUNCE_MS = 65;
/** Limite les appels OSRM quand départ / arrivée changent vite (Chrome : ERR_INSUFFICIENT_RESOURCES). */
const OSRM_ROUTE_DEBOUNCE_MS = 450;

const CHAUFFEUR_ACCOUNT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isChauffeurAccountUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && CHAUFFEUR_ACCOUNT_UUID_RE.test(value.trim());
}

type GeocodeSnappedResult =
  | { ok: true; snapped: GeoPoint; queryUsed: string }
  | { ok: false; error: string };

/** Rayon de recherche OSRM « nearest » après géocodage direct (adresse → point souvent hors axe de route). */
const GO_SNAP_SEARCH_RADIUS_M = 150;

function geocodeLang(language: string): 'fr' | 'en' {
  return language === 'en' ? 'en' : 'fr';
}

/** Libellés de secours carte : pas une vraie adresse — déclencher un reverse BAN côté panneau. */
function isGenericMapAddressFallback(text: string | undefined): boolean {
  const t = (text ?? '').trim();
  if (!t) return true;
  return /sélectionné sur la carte|selected on the map|Location from map|Lieu indiqué sur la carte/i.test(t);
}

function isLegacyDevPickupOrigin(point: GeoPoint): boolean {
  return (
    Math.abs(point.latitude - LEGACY_DEV_PICKUP_ORIGIN.latitude) < 1e-5 &&
    Math.abs(point.longitude - LEGACY_DEV_PICKUP_ORIGIN.longitude) < 1e-5
  );
}

async function geocodePickupForRide(
  rawQuery: string,
  language: string,
  proximityOrigin?: GeoPoint
): Promise<GeocodeSnappedResult> {
  const q = rawQuery.trim();
  if (!q) return { ok: false, error: 'Indiquez une adresse de départ.' };
  const lang = geocodeLang(language);
  const proximity = proximityOrigin
    ? ([proximityOrigin.longitude, proximityOrigin.latitude] as [number, number])
    : ([55.45, -21.15] as [number, number]);
  const coords = await geocodeForward(q, undefined, {
    language: lang,
    proximity,
    bbox: REUNION_ISLAND_BBOX_GEOCODE,
  });
  if (!coords) {
    return { ok: false, error: 'Adresse introuvable sur La Réunion.' };
  }
  const picked = await resolvePickOnRoad(coords.longitude, coords.latitude, {
    searchRadiusMeters: GO_SNAP_SEARCH_RADIUS_M,
  });
  if (!isLngLatInsideReunionIsland(picked.longitude, picked.latitude)) {
    return { ok: false, error: 'Point de départ hors zone ou non accessible par la route.' };
  }
  return { ok: true, snapped: picked, queryUsed: q };
}

async function geocodeDestinationForRide(rawQuery: string, language: string): Promise<GeocodeSnappedResult> {
  const q = rawQuery.trim();
  if (!q) return { ok: false, error: 'Indiquez une destination.' };
  const lang = geocodeLang(language);
  const coords = await geocodeForward(q, undefined, {
    language: lang,
    proximity: [55.45, -21.15],
    bbox: REUNION_ISLAND_BBOX_GEOCODE,
  });
  if (!coords) {
    return { ok: false, error: 'Destination introuvable sur La Réunion.' };
  }
  const picked = await resolvePickOnRoad(coords.longitude, coords.latitude, {
    searchRadiusMeters: GO_SNAP_SEARCH_RADIUS_M,
  });
  if (!isLngLatInsideReunionIsland(picked.longitude, picked.latitude)) {
    return { ok: false, error: 'Destination hors zone ou non accessible par la route.' };
  }
  return { ok: true, snapped: picked, queryUsed: q };
}

/** User flow → arbre : tous les enfants en branches (vertical) → Compte, Contact, Page Tâches, Formation, Laboratoire sur la même colonne après Dashboard */
function userFlowToFlowData(userFlow: { nodes: { id: string; name?: string; title?: string }[]; links: { from: string; to: string }[] }): FlowNodeData | null {
  const { nodes, links } = userFlow;
  if (!nodes?.length || !links?.length) return null;
  const nodeMap = new Map(nodes.map((n) => [n.id, { id: n.id, label: n.name || n.title || n.id }]));
  const childrenByFrom = new Map<string, string[]>();
  const toIds = new Set(links.map((l) => l.to));
  for (const l of links) {
    if (!childrenByFrom.has(l.from)) childrenByFrom.set(l.from, []);
    childrenByFrom.get(l.from)!.push(l.to);
  }
  const rootIds = nodes.map((n) => n.id).filter((id) => !toIds.has(id));
  if (rootIds.length === 0) return null;
  function buildNode(id: string): FlowNodeData {
    const info = nodeMap.get(id);
    const label = info?.label ?? id;
    const childIds = childrenByFrom.get(id) ?? [];
    if (childIds.length === 0) return { id, label };
    return { id, label, branches: childIds.map((cid) => buildNode(cid)) };
  }
  return buildNode(rootIds[0]);
}

// Constantes en dehors du composant pour éviter les re-créations
const SWIPE_BOTTOM_VISIBLE_MARGIN = 72;

/** Animation d'entrée au scroll pour les sections (comme les titres) */
const scrollSectionProps = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '0px 0px -60px 0px' as const },
  transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
};

import {
  PLACEHOLDER_COVER,
  PLACEHOLDER_MEDIA,
  PLACEHOLDER_ICON,
} from '../constants/imagePlaceholders';

/** Icônes user flow : placeholders (anciens SVG Figma retirés). */
const searchIconBlue = PLACEHOLDER_ICON;
const searchIconWhite = PLACEHOLDER_ICON;
const filterIconBlue = PLACEHOLDER_ICON;
const filterIconWhite = PLACEHOLDER_ICON;
const expandIconBlue = PLACEHOLDER_ICON;
const expandIconWhite = PLACEHOLDER_ICON;
const penIconBlue = PLACEHOLDER_ICON;
const penIconWhite = PLACEHOLDER_ICON;
const bellIconBlue = PLACEHOLDER_ICON;
const bellIconWhite = PLACEHOLDER_ICON;
const dashboardIconBlue = PLACEHOLDER_ICON;
const dashboardIconWhite = PLACEHOLDER_ICON;
const clientIconBlue = PLACEHOLDER_ICON;
const laboratoireIconBlue = PLACEHOLDER_ICON;
const laboratoireIconWhite = PLACEHOLDER_ICON;
const dashboardIconNewBlue = PLACEHOLDER_ICON;
const dashboardIconNewWhite = PLACEHOLDER_ICON;
const contactIconBlue = PLACEHOLDER_ICON;
const contactIconWhite = PLACEHOLDER_ICON;
const formationIconBlue = PLACEHOLDER_ICON;
const formationIconWhite = PLACEHOLDER_ICON;
const boutiqueIconBlue = PLACEHOLDER_ICON;
const boutiqueIconWhite = PLACEHOLDER_ICON;

const auditCarouselBluePalto = PLACEHOLDER_MEDIA;
const auditCarouselMacBookPaltoAuditSection = PLACEHOLDER_MEDIA;
const auditCarouselHandheldIpadPaltoAuditSection = PLACEHOLDER_MEDIA;
const auditCarouselCreationAtelierLancerDes = PLACEHOLDER_MEDIA;
const auditCarouselCreationAtelierPersonnalisationDes = PLACEHOLDER_MEDIA;
const auditCarouselCreationAtelierActionPopup = PLACEHOLDER_MEDIA;
const paltoDsFrame1048 = PLACEHOLDER_MEDIA;
const paltoDsFrame1050 = PLACEHOLDER_MEDIA;
const paltoDsFrame1051 = PLACEHOLDER_MEDIA;
const paltoCardSwapDashboard = PLACEHOLDER_MEDIA;
const paltoCardSwapPersonnalisationDes = PLACEHOLDER_MEDIA;
const paltoCardSwapDistributionCartes = PLACEHOLDER_MEDIA;
const paltoLightModeMaine = PLACEHOLDER_MEDIA;
const paltoLightModeSinglePage = PLACEHOLDER_MEDIA;
const paltoLightModeSetp1 = PLACEHOLDER_MEDIA;

const CONCEPTION_PLACEHOLDER_SLIDES: { src: string }[] = Array.from({ length: 6 }, () => ({
  src: PLACEHOLDER_MEDIA,
}));

/** Conception Palto : slides placeholder (anciennes images dossiers concept 1 & 2 retirées). */
const GO_CONCEPTION_CONCEPT_GROUPS: { src: string }[][] = [
  CONCEPTION_PLACEHOLDER_SLIDES,
  CONCEPTION_PLACEHOLDER_SLIDES.map((s) => ({ ...s })),
];

const GO_CARD_SWAP_SLIDE_SRCS: string[] = [
  paltoCardSwapDashboard,
  paltoCardSwapPersonnalisationDes,
  paltoCardSwapDistributionCartes,
];

/** Carrousel Audit Go : 4 slides (slides 2–3 paramétrables pour #audit vs autres usages). */
function buildAuditCarouselImages(
  paltoSecondSlideSrc: string = auditCarouselCreationAtelierLancerDes,
  paltoThirdSlideSrc: string = auditCarouselCreationAtelierPersonnalisationDes
): Array<{ src: string; alt: string }> {
  return [
    { src: auditCarouselBluePalto, alt: 'Audit – veille UX/UI 1' },
    { src: paltoSecondSlideSrc, alt: 'Audit – veille UX/UI 2' },
    { src: paltoThirdSlideSrc, alt: 'Audit – veille UX/UI 3' },
    { src: auditCarouselCreationAtelierActionPopup, alt: 'Audit – veille UX/UI 4' },
  ];
}

/** Icône graduation minimaliste (axe + traits) — avant le libellé « Concept n » */
function PaltoConceptionGraduationIcon() {
  return (
    <svg
      className="palto-conception-grad-icon"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9 3v14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M9 5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 9h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 17h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface SingleProjectProps {
  projectData: ProjectData;
  onBackClick: () => void;
  coverImage?: string | null;
  projectCategory?: string | null;
  onSwipeYChange?: (y: number) => void;
  onLiftProgressChange?: (progress: number) => void;
  /** Lift + scroll contenu (px) — ex. masquer le bouton fermer sur la cover */
  onProjectScrollCombinedChange?: (combinedPx: number) => void;
  coverFullscreenActive?: boolean;
  onOpenClientAccountAuth?: (mode: 'login' | 'signup') => void;
  onOpenClientAccount?: () => void;
  onNavigateHome?: () => void;
  /** Passager : vue « chauffeur sur place » (bandeau sous la topbar). */
  onOpenClientLiveMeet?: () => void;
}

const SingleProjectNew: FC<SingleProjectProps> = ({
  projectData,
  onBackClick,
  coverImage = null,
  projectCategory = null,
  onSwipeYChange,
  onLiftProgressChange,
  onProjectScrollCombinedChange,
  coverFullscreenActive = false,
  onOpenClientAccountAuth,
  onOpenClientAccount,
  onNavigateHome,
  onOpenClientLiveMeet,
}) => {
  const { t, language } = useLanguage();
  const isEn = language === 'en';
  const isGoProjectPage = projectData.title.trim().toLowerCase() === 'go';
  const [isMobileGoViewport, setIsMobileGoViewport] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );
  const { clientUpcomingRide, clientLiveMeetActive } = useClientHomeTopbarRides(language);
  const [paltoRideDestination, setPaltoRideDestination] = useState('');
  const [paltoPickupLocation, setPaltoPickupLocation] = useState('');
  const [paltoPickupTiming, setPaltoPickupTiming] = useState<'now' | 'later'>('now');
  const [paltoPickupDateTime, setPaltoPickupDateTime] = useState('');
  const [paltoRideSelectedDriverId, setPaltoRideSelectedDriverId] = useState<string | null>(null);
  const [paltoRecapPickupText, setPaltoRecapPickupText] = useState('25/04/2026 19:41:00');
  const [paltoRecapCoordsText, setPaltoRecapCoordsText] = useState('-20.8989, 55.4677');
  const [paltoRecapDurationText, setPaltoRecapDurationText] = useState('~31 min');
  const [paltoRecapTrafficDurationText, setPaltoRecapTrafficDurationText] = useState('~38 min');
  /** Point de départ après validation (Entrée / Rechercher) + géocodage réussi. */
  const [pickupResolvedPoint, setPickupResolvedPoint] = useState<GeoPoint | null>(null);
  const [lastConfirmedPickupText, setLastConfirmedPickupText] = useState<string | null>(null);
  const [pickupGeocodeLoading, setPickupGeocodeLoading] = useState(false);
  const [pickupGeocodeError, setPickupGeocodeError] = useState<string | null>(null);
  const [pickupSuggestionOpen, setPickupSuggestionOpen] = useState(false);
  const [mobileRouteActiveField, setMobileRouteActiveField] = useState<'pickup' | 'destination'>('destination');
  const [pickupAddressSuggestions, setPickupAddressSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [pickupSuggestionLoading, setPickupSuggestionLoading] = useState(false);
  const pickupAutocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chauffeurRideSettings, setChauffeurRideSettings] = useState(() => loadChauffeurRideSettingsSnapshot());
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CHAUFFEUR_RIDE_SETTINGS_KEY) return;
      setChauffeurRideSettings(loadChauffeurRideSettingsSnapshot());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const effectiveBaseFareEur = useMemo(() => {
    const parsed = Number.parseFloat(chauffeurRideSettings.baseFareEur.replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BASE_FARE_EUR;
  }, [chauffeurRideSettings.baseFareEur]);
  const effectivePricePerKmEur = useMemo(() => {
    const parsed = Number.parseFloat(chauffeurRideSettings.pricePerKmEur.replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PRICE_PER_KM_EUR;
  }, [chauffeurRideSettings.pricePerKmEur]);
  const effectiveNightSurchargeRate = useMemo(() => {
    const parsed = Number.parseFloat(chauffeurRideSettings.nightSurchargePercent.replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed / 100 : 0;
  }, [chauffeurRideSettings.nightSurchargePercent]);
  const effectiveDriverSearchRadiusKm = useMemo(() => {
    const parsed = Number.parseFloat(chauffeurRideSettings.maxPickupKm.replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : PICKUP_DRIVER_SEARCH_RADIUS_KM;
  }, [chauffeurRideSettings.maxPickupKm]);
  const effectiveDriverPricingMultiplier = useMemo(() => {
    const value = chauffeurRideSettings.pricingMultiplierPercent;
    return Number.isFinite(value) && value > 0 ? value / 100 : 1;
  }, [chauffeurRideSettings.pricingMultiplierPercent]);
  const isNightRide = useMemo(() => {
    let hour = new Date().getHours();
    if (paltoPickupTiming === 'later' && paltoPickupDateTime.trim()) {
      const dt = new Date(paltoPickupDateTime);
      if (!Number.isNaN(dt.getTime())) hour = dt.getHours();
    }
    return hour >= 20 || hour < 6;
  }, [paltoPickupTiming, paltoPickupDateTime]);

  const [paltoMapSelectedDestination, setPaltoMapSelectedDestination] = useState<{
    longitude: number
    latitude: number
  } | null>(null);
  const [paltoMapRouteFeature, setPaltoMapRouteFeature] = useState<Feature<LineString> | null>(null);
  const [paltoRouteDistanceKm, setPaltoRouteDistanceKm] = useState<number | null>(null);
  const [paltoRouteDeniveleEstimateM, setPaltoRouteDeniveleEstimateM] = useState<number | null>(null);
  /** Après un « Rechercher » réussi : départ + destination géocodés → affichage des chauffeurs. */
  const [chauffeursSearchOk, setChauffeursSearchOk] = useState(false);
  const [allNearbyDrivers, setAllNearbyDrivers] = useState<import('../data/nearbyDrivers').NearbyDriver[]>([]);
  const [nearbyDriversLoading, setNearbyDriversLoading] = useState(false);

  useEffect(() => {
    if (!chauffeursSearchOk || !pickupResolvedPoint) {
      setAllNearbyDrivers([]);
      setNearbyDriversLoading(false);
      return;
    }
    let cancelled = false;

    const load = () => {
      setNearbyDriversLoading(true);
      void getNearbyDrivers({
        origin: pickupResolvedPoint,
        radiusKm: effectiveDriverSearchRadiusKm,
        limit: 9,
      })
        .then((drivers) => {
          if (!cancelled) setAllNearbyDrivers(drivers);
        })
        .finally(() => {
          if (!cancelled) setNearbyDriversLoading(false);
        });
    };

    load();
    const pollId = window.setInterval(load, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [chauffeursSearchOk, pickupResolvedPoint, effectiveDriverSearchRadiusKm]);

  const pickupFilteredDrivers = useMemo(() => {
    if (!pickupResolvedPoint) return [];
    return allNearbyDrivers.filter(
      (d) =>
        haversineDistanceKm(pickupResolvedPoint, { latitude: d.latitude, longitude: d.longitude }) <=
        effectiveDriverSearchRadiusKm
    );
  }, [pickupResolvedPoint, allNearbyDrivers, effectiveDriverSearchRadiusKm]);

  const [lastConfirmedDestinationText, setLastConfirmedDestinationText] = useState<string | null>(null);
  const [destinationSearchError, setDestinationSearchError] = useState<string | null>(null);
  const [destinationSuggestionOpen, setDestinationSuggestionOpen] = useState(false);
  const [destinationAddressSuggestions, setDestinationAddressSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [destinationSuggestionLoading, setDestinationSuggestionLoading] = useState(false);
  const [destinationSnapLoading, setDestinationSnapLoading] = useState(false);
  const [pickupAutoGeolocAsked, setPickupAutoGeolocAsked] = useState(false);
  const destinationAutocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const embeddedMapFlyToTarget = useMemo(() => {
    if (pickupResolvedPoint && paltoMapSelectedDestination && !paltoMapRouteFeature) {
      return {
        longitude: (pickupResolvedPoint.longitude + paltoMapSelectedDestination.longitude) / 2,
        latitude: (pickupResolvedPoint.latitude + paltoMapSelectedDestination.latitude) / 2,
        zoom: 12.4,
      };
    }
    if (pickupResolvedPoint) {
      return {
        longitude: pickupResolvedPoint.longitude,
        latitude: pickupResolvedPoint.latitude,
        zoom: 15.5,
      };
    }
    if (paltoMapSelectedDestination) {
      return {
        longitude: paltoMapSelectedDestination.longitude,
        latitude: paltoMapSelectedDestination.latitude,
        zoom: 13.5,
      };
    }
    return null;
  }, [pickupResolvedPoint, paltoMapSelectedDestination, paltoMapRouteFeature]);
  const showDriversColumn =
    paltoPickupTiming === 'now' &&
    chauffeursSearchOk &&
    pickupResolvedPoint !== null &&
    paltoMapSelectedDestination !== null;
  const paltoSelectedDriver = useMemo(
    () => pickupFilteredDrivers.find((d) => d.id === paltoRideSelectedDriverId) ?? null,
    [pickupFilteredDrivers, paltoRideSelectedDriverId]
  );
  const computeDriverPriceTtc = useCallback(
    (driver: { moto: string; price: string }) => {
      const driverCoef = driver.moto.toLowerCase().includes('maxi')
        ? 1.12
        : driver.moto.toLowerCase().includes('scooter')
          ? 1.05
          : 1.0;
      const numericPrice = Number.parseFloat(driver.price.replace(',', '.').replace(/[^\d.]/g, ''));
      const fallbackTtc = Number.isFinite(numericPrice) ? numericPrice : 0;

      const routeKm = paltoRouteDistanceKm ?? null;
      const deniveleM = paltoRouteDeniveleEstimateM ?? 0;
      const dynamicTtcRaw =
        routeKm !== null
          ? (effectiveBaseFareEur + routeKm * effectivePricePerKmEur + deniveleM * 0.015) *
            driverCoef *
            effectiveDriverPricingMultiplier *
            (1 + (isNightRide ? effectiveNightSurchargeRate : 0))
          : null;
      const totalTtc = dynamicTtcRaw !== null ? Math.max(6, dynamicTtcRaw) : fallbackTtc;
      return Number.isFinite(totalTtc) && totalTtc > 0 ? totalTtc : null;
    },
    [
      paltoRouteDistanceKm,
      paltoRouteDeniveleEstimateM,
      effectiveBaseFareEur,
      effectivePricePerKmEur,
      effectiveDriverPricingMultiplier,
      effectiveNightSurchargeRate,
      isNightRide,
    ]
  );
  const paltoPricing = useMemo(() => {
    if (!paltoSelectedDriver) return null;
    const totalTtc = computeDriverPriceTtc(paltoSelectedDriver);
    if (!Number.isFinite(totalTtc) || totalTtc <= 0) return null;
    const tvaRate = 0.2;
    const totalHt = totalTtc / (1 + tvaRate);
    const totalTva = totalTtc - totalHt;
    return {
      ht: totalHt.toFixed(2),
      tva: totalTva.toFixed(2),
      ttc: totalTtc.toFixed(2),
    };
  }, [paltoSelectedDriver, computeDriverPriceTtc]);

  const mobileShowChooseRideStep = isMobileGoViewport && showDriversColumn;

  const goBackToRideQueryMobile = useCallback(() => {
    setChauffeursSearchOk(false);
    setPaltoRideSelectedDriverId(null);
    setIsRecapPopupOpen(false);
  }, []);

  const confirmSelectedDriverOnMobile = useCallback(() => {
    if (!paltoSelectedDriver) return;
    setIsRecapPopupOpen(true);
  }, [paltoSelectedDriver]);

  const renderPaltoDriversList = useCallback((selectionOnly = false): ReactNode => {
    return (
      <div className="palto-ride-drivers-list">
        {nearbyDriversLoading && pickupFilteredDrivers.length === 0 ? (
          <p className="palto-ride-drivers-empty">{t('search.driversLoading')}</p>
        ) : pickupFilteredDrivers.length === 0 ? (
          <p className="palto-ride-drivers-empty">{t('search.driversEmpty')}</p>
        ) : (
          pickupFilteredDrivers.map((driver) => {
            const meta = formatDriverMetaLine(driver, pickupResolvedPoint);
            const dynamicDriverTtc = computeDriverPriceTtc(driver);
            return (
              <button
                key={driver.id}
                type="button"
                className={
                  'palto-ride-driver-item' +
                  (paltoRideSelectedDriverId === driver.id ? ' palto-ride-driver-item--selected' : '')
                }
                onClick={() => {
                  setPaltoRideSelectedDriverId(driver.id);
                  if (!selectionOnly) {
                    setIsRecapPopupOpen(true);
                  }
                }}
              >
                <span className="palto-ride-driver-item__left">
                  <span className="palto-ride-driver-item__name">{driver.name}</span>
                  <span className="palto-ride-driver-item__meta">{meta}</span>
                </span>
                <span className="palto-ride-driver-item__price">
                  {dynamicDriverTtc !== null ? `${dynamicDriverTtc.toFixed(2)} EUR` : driver.price}
                </span>
              </button>
            );
          })
        )}
      </div>
    );
  }, [
    nearbyDriversLoading,
    pickupFilteredDrivers,
    pickupResolvedPoint,
    computeDriverPriceTtc,
    paltoRideSelectedDriverId,
    t,
  ]);

  useEffect(() => {
    if (!isGoProjectPage) return;
    const prefill = consumeGoPrefill();
    if (!prefill) return;

    let cancelled = false;

    const applyDepartmentPickup = async (departmentId: string): Promise<boolean> => {
      const deptId = (departmentId.trim() || DEFAULT_HERO_DEPARTMENT_ID) as HeroDepartmentId;
      const label = simplifyRideAddress(getHeroDepartmentLabel(deptId, language));
      setPaltoPickupLocation(label);
      try {
        const seed = getHeroDepartmentOrigin(deptId);
        const picked = await resolvePickOnRoad(seed.longitude, seed.latitude, {
          searchRadiusMeters: GO_SNAP_SEARCH_RADIUS_M,
        });
        if (cancelled || !isLngLatInsideReunionIsland(picked.longitude, picked.latitude)) return false;
        if (isLegacyDevPickupOrigin(picked)) return false;
        setPickupResolvedPoint(picked);
        setLastConfirmedPickupText(label);
        setPickupGeocodeError(null);
        return true;
      } catch {
        if (!cancelled) setPaltoPickupLocation(label);
        return false;
      }
    };

    void (async () => {
      setPickupResolvedPoint(null);
      setLastConfirmedPickupText(null);
      setPaltoMapRouteFeature(null);
      setPaltoMapSelectedDestination(null);
      setLastConfirmedDestinationText(null);
      setChauffeursSearchOk(false);
      setPickupGeocodeError(null);
      setDestinationSearchError(null);

      if (prefill.timing === 'now' || prefill.timing === 'later') {
        setPaltoPickupTiming(prefill.timing);
      }
      if (prefill.datetime?.trim()) {
        setPaltoPickupDateTime(prefill.datetime.trim());
      }

      let pickupReady = false;
      if (prefill.pickup.trim()) {
        const pickupQ = prefill.pickup.trim();
        setPaltoPickupLocation(simplifyRideAddress(pickupQ));
        const res = await geocodePickupForRide(pickupQ, language);
        if (!cancelled && res.ok && !isLegacyDevPickupOrigin(res.snapped)) {
          setPaltoPickupLocation(simplifyRideAddress(res.queryUsed));
          setPickupResolvedPoint(res.snapped);
          setLastConfirmedPickupText(simplifyRideAddress(res.queryUsed));
          pickupReady = true;
        }
      } else if (prefill.homeDepartmentId?.trim()) {
        pickupReady = await applyDepartmentPickup(prefill.homeDepartmentId);
      } else if (prefill.homeCommune?.trim()) {
        const area = getHeroDepartmentGeocodeArea(DEFAULT_HERO_DEPARTMENT_ID);
        const legacyQ = `${prefill.homeCommune.trim()}, ${area}`;
        setPaltoPickupLocation(simplifyRideAddress(legacyQ));
        const seed = getHeroDepartmentOrigin(DEFAULT_HERO_DEPARTMENT_ID);
        const res = await geocodePickupForRide(legacyQ, language, seed);
        if (!cancelled && res.ok && !isLegacyDevPickupOrigin(res.snapped)) {
          setPaltoPickupLocation(simplifyRideAddress(res.queryUsed));
          setPickupResolvedPoint(res.snapped);
          setLastConfirmedPickupText(simplifyRideAddress(res.queryUsed));
          pickupReady = true;
        }
      } else {
        pickupReady = await applyDepartmentPickup(DEFAULT_HERO_DEPARTMENT_ID);
      }

      if (cancelled || !pickupReady) return;

      const destQ = prefill.destination.trim();
      if (destQ) {
        setPaltoRideDestination(simplifyRideAddress(destQ));
        try {
          const res = await geocodeDestinationForRide(destQ, language);
          if (cancelled || !res.ok) return;
          setPaltoMapSelectedDestination(res.snapped);
          setLastConfirmedDestinationText(simplifyRideAddress(res.queryUsed));
          setPaltoRecapCoordsText(simplifyRideAddress(res.queryUsed));
          window.dispatchEvent(
            new CustomEvent('palto:go-cover-fly-to', {
              detail: {
                longitude: res.snapped.longitude,
                latitude: res.snapped.latitude,
                zoom: 13.5,
              },
            })
          );
        } catch {
          /* réseau : laisser le champ texte, l’utilisateur peut lancer « Rechercher » */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isGoProjectPage, language]);

  const submitPickupLocationSearch = useCallback(async (queryOverride?: string) => {
    const raw = queryOverride ?? paltoPickupLocation;
    const qPrep = raw.trim();
    if (!qPrep) {
      setPickupGeocodeError('Indiquez une adresse de départ.');
      setPickupResolvedPoint(null);
      setLastConfirmedPickupText(null);
      return;
    }
    setPickupGeocodeLoading(true);
    setPickupGeocodeError(null);
    try {
      const res = await geocodePickupForRide(raw, language);
      if (!res.ok) {
        setPickupResolvedPoint(null);
        setLastConfirmedPickupText(null);
        setPickupGeocodeError(res.error);
        return;
      }
      if (queryOverride) {
        setPaltoPickupLocation(res.queryUsed);
      }
      setPickupResolvedPoint(res.snapped);
      setLastConfirmedPickupText(res.queryUsed);
      setPaltoRideSelectedDriverId(null);
      setPickupSuggestionOpen(false);
      setChauffeursSearchOk(false);
    } catch {
      setPickupResolvedPoint(null);
      setLastConfirmedPickupText(null);
      setPickupGeocodeError('Erreur réseau. Réessayez.');
    } finally {
      setPickupGeocodeLoading(false);
    }
  }, [paltoPickupLocation, language]);

  const prepareRideBookingEndpoints = useCallback(async (): Promise<boolean> => {
    const dq = paltoRideDestination.trim();
    if (!dq) {
      setDestinationSearchError('Indiquez une destination.');
      return false;
    }
    if (paltoPickupTiming === 'later') {
      if (!paltoPickupDateTime.trim()) {
        setPickupGeocodeError('Indiquez la date et l heure de prise en charge.');
        return false;
      }
      const dtp = new Date(paltoPickupDateTime);
      if (Number.isNaN(dtp.getTime())) {
        setPickupGeocodeError('Date ou heure de prise en charge invalide.');
        return false;
      }
    }
    setPickupGeocodeLoading(true);
    setPickupGeocodeError(null);
    setDestinationSearchError(null);
    setPickupSuggestionOpen(false);
    setDestinationSuggestionOpen(false);
    setIsRecapPopupOpen(false);
    setIsCheckoutPopupOpen(false);
    try {
      const pickupRes = await geocodePickupForRide(paltoPickupLocation, language);
      if (!pickupRes.ok) {
        setPickupResolvedPoint(null);
        setLastConfirmedPickupText(null);
        setPickupGeocodeError(pickupRes.error);
        setPaltoMapSelectedDestination(null);
        setLastConfirmedDestinationText(null);
        return false;
      }
      setPaltoPickupLocation(simplifyRideAddress(pickupRes.queryUsed));
      setPickupResolvedPoint(pickupRes.snapped);
      setLastConfirmedPickupText(simplifyRideAddress(pickupRes.queryUsed));

      const destRes = await geocodeDestinationForRide(paltoRideDestination, language);
      if (!destRes.ok) {
        setPaltoMapSelectedDestination(null);
        setLastConfirmedDestinationText(null);
        setDestinationSearchError(destRes.error);
        setPaltoRideSelectedDriverId(null);
        return false;
      }
      setPaltoMapSelectedDestination(destRes.snapped);
      setPaltoRecapCoordsText(simplifyRideAddress(destRes.queryUsed));
      setLastConfirmedDestinationText(simplifyRideAddress(destRes.queryUsed));
      setPaltoRideSelectedDriverId(null);
      return true;
    } catch {
      setPickupGeocodeError('Erreur réseau. Réessayez.');
      return false;
    } finally {
      setPickupGeocodeLoading(false);
    }
  }, [paltoPickupLocation, paltoRideDestination, language, paltoPickupTiming, paltoPickupDateTime]);

  const submitRideSearch = useCallback(async () => {
    setChauffeursSearchOk(false);
    const ok = await prepareRideBookingEndpoints();
    if (ok) setChauffeursSearchOk(true);
  }, [prepareRideBookingEndpoints]);

  const submitScheduledReservation = useCallback(async () => {
    setChauffeursSearchOk(false);
    const ok = await prepareRideBookingEndpoints();
    if (ok) setIsRecapPopupOpen(true);
  }, [prepareRideBookingEndpoints]);

  const onPrimaryBookingAction = useCallback(() => {
    if (paltoPickupTiming === 'later') {
      void submitScheduledReservation();
      return;
    }
    void submitRideSearch();
  }, [paltoPickupTiming, submitScheduledReservation, submitRideSearch]);

  const isGoBookingReady = useMemo(() => {
    if (!paltoPickupLocation.trim()) return false;
    if (!paltoRideDestination.trim()) return false;
    if (paltoPickupTiming === 'later' && !paltoPickupDateTime.trim()) return false;
    return true;
  }, [paltoPickupLocation, paltoRideDestination, paltoPickupTiming, paltoPickupDateTime]);

  const handlePickupTimingChange = useCallback((next: 'now' | 'later') => {
    setPaltoPickupTiming(next);
    if (next === 'later') {
      setChauffeursSearchOk(false);
      setPaltoRideSelectedDriverId(null);
      setIsRecapPopupOpen(false);
      setIsCheckoutPopupOpen(false);
    }
  }, []);

  const onPickupLocationInputChange = useCallback(
    (value: string) => {
      setPaltoPickupLocation(value);
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        setPickupResolvedPoint(null);
        setLastConfirmedPickupText(null);
        setPaltoRideSelectedDriverId(null);
        setPickupGeocodeError(null);
        setChauffeursSearchOk(false);
        return;
      }
      if (lastConfirmedPickupText !== null && trimmed !== lastConfirmedPickupText) {
        setPickupResolvedPoint(null);
        setLastConfirmedPickupText(null);
        setPaltoRideSelectedDriverId(null);
        setPickupGeocodeError(null);
        setChauffeursSearchOk(false);
      }
    },
    [lastConfirmedPickupText]
  );

  const onDestinationInputChange = useCallback(
    (value: string) => {
      setPaltoRideDestination(value);
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        setPaltoMapSelectedDestination(null);
        setLastConfirmedDestinationText(null);
        setDestinationSearchError(null);
        setChauffeursSearchOk(false);
        setPaltoRideSelectedDriverId(null);
        return;
      }
      if (lastConfirmedDestinationText !== null && trimmed !== lastConfirmedDestinationText) {
        setPaltoMapSelectedDestination(null);
        setLastConfirmedDestinationText(null);
        setChauffeursSearchOk(false);
        setDestinationSearchError(null);
        setPaltoRideSelectedDriverId(null);
      }
    },
    [lastConfirmedDestinationText]
  );

  const clearPickupLocationField = useCallback(() => {
    setPaltoPickupLocation('');
    setPickupResolvedPoint(null);
    setLastConfirmedPickupText(null);
    setPaltoRideSelectedDriverId(null);
    setPickupGeocodeError(null);
    setPickupSuggestionOpen(false);
    setPickupAddressSuggestions([]);
    setPickupGeocodeLoading(false);
    setChauffeursSearchOk(false);
    setPaltoMapSelectedDestination(null);
    setLastConfirmedDestinationText(null);
    setDestinationSearchError(null);
    setDestinationSuggestionOpen(false);
    setDestinationAddressSuggestions([]);
    setDestinationSnapLoading(false);
  }, []);

  const clearDestinationField = useCallback(() => {
    setPaltoRideDestination('');
    setPaltoMapSelectedDestination(null);
    setLastConfirmedDestinationText(null);
    setDestinationSearchError(null);
    setChauffeursSearchOk(false);
    setPaltoRideSelectedDriverId(null);
    setDestinationSuggestionOpen(false);
    setDestinationAddressSuggestions([]);
    setDestinationSnapLoading(false);
  }, []);

  const swapRideEndpoints = useCallback(() => {
    const nextPickup = paltoRideDestination;
    const nextDestination = paltoPickupLocation;
    setPaltoPickupLocation(nextPickup);
    setPaltoRideDestination(nextDestination);

    const confirmedPickup = lastConfirmedPickupText;
    const confirmedDestination = lastConfirmedDestinationText;
    setLastConfirmedPickupText(confirmedDestination);
    setLastConfirmedDestinationText(confirmedPickup);

    if (pickupResolvedPoint && paltoMapSelectedDestination) {
      setPickupResolvedPoint(paltoMapSelectedDestination);
      setPaltoMapSelectedDestination(pickupResolvedPoint);
    } else {
      setPickupResolvedPoint(null);
      setPaltoMapSelectedDestination(null);
    }
    setPaltoRideSelectedDriverId(null);
    setChauffeursSearchOk(false);
    setPickupGeocodeError(null);
    setDestinationSearchError(null);
    setDestinationSuggestionOpen(false);
    setPickupSuggestionOpen(false);
  }, [
    paltoPickupLocation,
    paltoRideDestination,
    lastConfirmedPickupText,
    lastConfirmedDestinationText,
    pickupResolvedPoint,
    paltoMapSelectedDestination,
  ]);

  const onPickupRouteMenuClick = useCallback(() => {
    setPickupSuggestionOpen((open) => !open);
    setDestinationSuggestionOpen(false);
  }, []);

  const onPickupLocationKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (!isMobileGoViewport) setPickupSuggestionOpen(false);
      onPrimaryBookingAction();
    },
    [isMobileGoViewport, onPrimaryBookingAction]
  );

  const onDestinationKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (!isMobileGoViewport) setDestinationSuggestionOpen(false);
      onPrimaryBookingAction();
    },
    [isMobileGoViewport, onPrimaryBookingAction]
  );

  const applyPickupFromSuggestion = useCallback(
    async (suggestion: GeocodeSuggestion) => {
      setPaltoPickupLocation(simplifyRideAddress(suggestion.label));
      if (!isMobileGoViewport) setPickupSuggestionOpen(false);
      setPickupGeocodeLoading(true);
      setPickupGeocodeError(null);
      try {
        const picked = await resolvePickOnRoad(suggestion.longitude, suggestion.latitude, {
          searchRadiusMeters: GO_SNAP_SEARCH_RADIUS_M,
        });
        if (!isLngLatInsideReunionIsland(picked.longitude, picked.latitude)) {
          setPickupResolvedPoint(null);
          setLastConfirmedPickupText(null);
          setPickupGeocodeError('Point de départ hors zone ou non accessible par la route.');
          return;
        }
        setPickupResolvedPoint(picked);
        setLastConfirmedPickupText(simplifyRideAddress(suggestion.label));
        setPaltoRideSelectedDriverId(null);
        setChauffeursSearchOk(false);
      } catch {
        setPickupResolvedPoint(null);
        setLastConfirmedPickupText(null);
        setPickupGeocodeError('Erreur réseau. Réessayez.');
      } finally {
        setPickupGeocodeLoading(false);
      }
    },
    [isMobileGoViewport]
  );

  const applyDestinationFromSuggestion = useCallback(
    async (suggestion: GeocodeSuggestion) => {
      setPaltoRideDestination(simplifyRideAddress(suggestion.label));
      if (!isMobileGoViewport) setDestinationSuggestionOpen(false);
      setDestinationSnapLoading(true);
      setDestinationSearchError(null);
      try {
        const picked = await resolvePickOnRoad(suggestion.longitude, suggestion.latitude, {
          searchRadiusMeters: GO_SNAP_SEARCH_RADIUS_M,
        });
        if (!isLngLatInsideReunionIsland(picked.longitude, picked.latitude)) {
          setPaltoMapSelectedDestination(null);
          setLastConfirmedDestinationText(null);
          setDestinationSearchError('Destination hors zone ou non accessible par la route.');
          return;
        }
        setPaltoMapSelectedDestination(picked);
        setPaltoRecapCoordsText(simplifyRideAddress(suggestion.label));
        setLastConfirmedDestinationText(simplifyRideAddress(suggestion.label));
        setChauffeursSearchOk(false);
        setPaltoRideSelectedDriverId(null);
      } catch {
        setPaltoMapSelectedDestination(null);
        setLastConfirmedDestinationText(null);
        setDestinationSearchError('Erreur réseau. Réessayez.');
      } finally {
        setDestinationSnapLoading(false);
      }
    },
    [isMobileGoViewport]
  );

  const requestBrowserPickupLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setPickupGeocodeError('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }
    if (!isMobileGoViewport) setPickupSuggestionOpen(false);
    setPickupGeocodeLoading(true);
    setPickupGeocodeError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { longitude, latitude } = position.coords;
          const picked = await resolvePickOnRoad(longitude, latitude, {
            searchRadiusMeters: GO_SNAP_SEARCH_RADIUS_M,
          });
          if (!isLngLatInsideReunionIsland(picked.longitude, picked.latitude)) {
            setPickupResolvedPoint(null);
            setLastConfirmedPickupText(null);
            setPickupGeocodeError('Position hors zone ou non accessible par la route.');
            return;
          }
          const label =
            (await geocodeReverse(picked.longitude, picked.latitude, undefined, { language: geocodeLang(language) })) ??
            (language === 'en'
              ? 'Pickup selected on the map'
              : 'Départ sélectionné sur la carte');
          setPaltoPickupLocation(simplifyRideAddress(label));
          setPickupResolvedPoint(picked);
          setLastConfirmedPickupText(simplifyRideAddress(label));
          setPaltoRideSelectedDriverId(null);
          setChauffeursSearchOk(false);
        } catch {
          setPickupResolvedPoint(null);
          setLastConfirmedPickupText(null);
          setPickupGeocodeError('Erreur réseau. Réessayez.');
        } finally {
          setPickupGeocodeLoading(false);
        }
      },
      () => {
        setPickupGeocodeLoading(false);
        // Non bloquant : l'utilisateur peut continuer à saisir son adresse manuellement.
        setPickupGeocodeError(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [isMobileGoViewport, language]);

  const onPickupLocationFocus = useCallback(() => {
    setMobileRouteActiveField('pickup');
    setPickupSuggestionOpen(true);
    setDestinationSuggestionOpen(false);
    // Ne pas déclencher la géoloc automatiquement au focus : action explicite uniquement.
    if (!pickupAutoGeolocAsked) setPickupAutoGeolocAsked(true);
  }, [pickupAutoGeolocAsked]);

  const onPickupLocationBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      const next = e.relatedTarget as HTMLElement | null;
      if (next?.dataset?.pickupSuggestion === 'true') return;
      if (!isMobileGoViewport) setPickupSuggestionOpen(false);
    },
    [isMobileGoViewport]
  );

  const onDestinationFocus = useCallback(() => {
    setMobileRouteActiveField('destination');
    setDestinationSuggestionOpen(true);
    setPickupSuggestionOpen(false);
  }, []);

  const onDestinationBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      const next = e.relatedTarget as HTMLElement | null;
      if (next?.dataset?.destinationSuggestion === 'true') return;
      if (!isMobileGoViewport) setDestinationSuggestionOpen(false);
    },
    [isMobileGoViewport]
  );

  const [clientSessionTick, setClientSessionTick] = useState(0);
  const [clientProfileSyncTick, setClientProfileSyncTick] = useState(0);

  useEffect(() => {
    const refreshClientSession = () => setClientSessionTick((n) => n + 1);
    window.addEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, refreshClientSession);
    window.addEventListener('palto:client-profile-synced', refreshClientSession);
    window.addEventListener('storage', refreshClientSession);
    return () => {
      window.removeEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, refreshClientSession);
      window.removeEventListener('palto:client-profile-synced', refreshClientSession);
      window.removeEventListener('storage', refreshClientSession);
    };
  }, []);

  useEffect(() => {
    if (!isGoProjectPage) return;
    const sessionEmail = getCurrentClientUser()?.email?.trim();
    if (!sessionEmail) return;
    migrateLegacySavedPlacesIfOwnedByEmail(sessionEmail);
    let cancelled = false;
    void syncClientProfileWithServer(sessionEmail).then(() => {
      if (!cancelled) setClientProfileSyncTick((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [isGoProjectPage, clientSessionTick]);

  const clientEmailForSavedPlaces = getCurrentClientUser()?.email ?? '';
  const savedPlacesChoices = useMemo(() => {
    const snapshot = loadClientSavedPlaces(clientEmailForSavedPlaces || undefined);
    const entries: Array<{ id: string; label: string; address: string }> = [];
    if (snapshot.domicile.trim()) {
      entries.push({ id: 'home', label: 'Domicile', address: snapshot.domicile.trim() });
    }
    if (snapshot.travail.trim()) {
      entries.push({ id: 'work', label: 'Travail', address: snapshot.travail.trim() });
    }
    for (const extra of snapshot.extras) {
      const address = extra.address.trim();
      if (!address) continue;
      entries.push({
        id: `extra-${extra.id}`,
        label: extra.label.trim() ? extra.label.trim() : 'Favori',
        address,
      });
    }
    return entries;
  }, [clientEmailForSavedPlaces, clientSessionTick, clientProfileSyncTick]);

  const pickupStaticSuggestions = useMemo(() => {
    const items: Array<{ id: string; label: string; action: () => void }> = [
      {
        id: 'ask-geolocation',
        label: 'Utiliser ma position actuelle',
        action: () => {
          requestBrowserPickupLocation();
        },
      },
    ];
    if (savedPlacesChoices.length > 0) {
      for (const place of savedPlacesChoices) {
        items.push({
          id: `saved-${place.id}`,
          label: `${place.label} · ${simplifyRideAddress(place.address)}`,
          action: () => {
            void submitPickupLocationSearch(place.address);
          },
        });
      }
    } else {
      items.push({
        id: 'saved-empty',
        label: 'Aucun lieu enregistré pour le moment',
        action: () => {},
      });
    }
    if (lastConfirmedPickupText && lastConfirmedPickupText.trim()) {
      items.push({
        id: 'last-location',
        label: `Dernier lieu entré : ${lastConfirmedPickupText}`,
        action: () => {
          void submitPickupLocationSearch(lastConfirmedPickupText);
        },
      });
    } else {
      items.push({
        id: 'last-location-empty',
        label: 'Dernier lieu entré : aucun',
        action: () => {},
      });
    }
    return items;
  }, [lastConfirmedPickupText, requestBrowserPickupLocation, savedPlacesChoices, submitPickupLocationSearch]);

  const applyDestinationFromQueryString = useCallback(
    async (query: string) => {
      setDestinationSnapLoading(true);
      setDestinationSearchError(null);
      try {
        const res = await geocodeDestinationForRide(query, language);
        if (!res.ok) {
          onDestinationInputChange(query.trim());
          setDestinationSearchError(res.error);
          return;
        }
        setPaltoRideDestination(simplifyRideAddress(res.queryUsed));
        setPaltoMapSelectedDestination(res.snapped);
        setPaltoRecapCoordsText(`${res.snapped.latitude.toFixed(4)}, ${res.snapped.longitude.toFixed(4)}`);
        setLastConfirmedDestinationText(simplifyRideAddress(res.queryUsed));
        setChauffeursSearchOk(false);
        setPaltoRideSelectedDriverId(null);
      } catch {
        onDestinationInputChange(query.trim());
        setDestinationSearchError('Erreur réseau. Réessayez.');
      } finally {
        setDestinationSnapLoading(false);
        if (!isMobileGoViewport) setDestinationSuggestionOpen(false);
      }
    },
    [isMobileGoViewport, language, onDestinationInputChange]
  );

  const destinationStaticSuggestions = useMemo(() => {
    const items: Array<{ id: string; label: string; action: () => void }> = [];
    if (savedPlacesChoices.length > 0) {
      for (const place of savedPlacesChoices) {
        items.push({
          id: `dest-saved-${place.id}`,
          label: `${place.label} · ${simplifyRideAddress(place.address)}`,
          action: () => {
            void applyDestinationFromQueryString(place.address);
          },
        });
      }
    } else {
      items.push({
        id: 'dest-saved-empty',
        label: 'Aucun lieu enregistré pour le moment',
        action: () => {},
      });
    }
    if (lastConfirmedDestinationText && lastConfirmedDestinationText.trim()) {
      items.push({
        id: 'dest-last',
        label: `Dernière destination entrée : ${lastConfirmedDestinationText}`,
        action: () => {
          void applyDestinationFromQueryString(lastConfirmedDestinationText);
        },
      });
    } else {
      items.push({
        id: 'dest-last-empty',
        label: 'Dernière destination entrée : aucune',
        action: () => {},
      });
    }
    return items;
  }, [lastConfirmedDestinationText, applyDestinationFromQueryString, savedPlacesChoices]);

  const applyPlaceToActiveMobileField = useCallback(
    (address: string) => {
      if (mobileRouteActiveField === 'destination') {
        void applyDestinationFromQueryString(address);
        return;
      }
      void submitPickupLocationSearch(address);
    },
    [mobileRouteActiveField, applyDestinationFromQueryString, submitPickupLocationSearch]
  );

  const applyGeolocationToActiveMobileField = useCallback(() => {
    if (mobileRouteActiveField === 'destination') {
      if (!navigator.geolocation) {
        setDestinationSearchError('La géolocalisation n’est pas disponible sur cet appareil.');
        return;
      }
      setDestinationSnapLoading(true);
      setDestinationSearchError(null);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { longitude, latitude } = position.coords;
            const picked = await resolvePickOnRoad(longitude, latitude, {
              searchRadiusMeters: GO_SNAP_SEARCH_RADIUS_M,
            });
            if (!isLngLatInsideReunionIsland(picked.longitude, picked.latitude)) {
              setDestinationSearchError('Position hors zone ou non accessible par la route.');
              return;
            }
            const label =
              (await geocodeReverse(picked.longitude, picked.latitude, undefined, {
                language: geocodeLang(language),
              })) ??
              (language === 'en' ? 'Destination selected on the map' : 'Destination sélectionnée sur la carte');
            setPaltoRideDestination(simplifyRideAddress(label));
            setPaltoMapSelectedDestination(picked);
            setLastConfirmedDestinationText(simplifyRideAddress(label));
            setChauffeursSearchOk(false);
            setPaltoRideSelectedDriverId(null);
          } catch {
            setDestinationSearchError('Erreur réseau. Réessayez.');
          } finally {
            setDestinationSnapLoading(false);
          }
        },
        () => {
          setDestinationSnapLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
      return;
    }
    requestBrowserPickupLocation();
  }, [mobileRouteActiveField, language, requestBrowserPickupLocation]);

  const goMobileSharedPreselectSuggestions = useMemo(() => {
    const items: Array<{ id: string; label: string; action: () => void }> = [
      {
        id: 'ask-geolocation',
        label: 'Utiliser ma position actuelle',
        action: applyGeolocationToActiveMobileField,
      },
    ];
    if (savedPlacesChoices.length > 0) {
      for (const place of savedPlacesChoices) {
        items.push({
          id: `shared-saved-${place.id}`,
          label: `${place.label} · ${simplifyRideAddress(place.address)}`,
          action: () => {
            applyPlaceToActiveMobileField(place.address);
          },
        });
      }
    } else {
      items.push({
        id: 'shared-saved-empty',
        label: 'Aucun lieu enregistré pour le moment',
        action: () => {},
      });
    }
    return items;
  }, [applyGeolocationToActiveMobileField, applyPlaceToActiveMobileField, savedPlacesChoices]);

  const [goMobileRideHistoryAddresses, setGoMobileRideHistoryAddresses] = useState<string[]>([]);

  useEffect(() => {
    if (!isMobileGoViewport || !isGoProjectPage) return;
    const sessionAddresses: string[] = [];
    const pickup = lastConfirmedPickupText?.trim();
    const destination = lastConfirmedDestinationText?.trim();
    if (pickup) sessionAddresses.push(pickup);
    if (destination && destination !== pickup) sessionAddresses.push(destination);

    const user = getCurrentClientUser();
    if (!user?.email || !clientRidesApiEnabled() || !isClientAuthenticated()) {
      setGoMobileRideHistoryAddresses(sessionAddresses);
      return;
    }

    let cancelled = false;
    void fetchClientRides(user.email, 'all')
      .then((rides) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const fromRides: string[] = [];
        const sorted = [...rides].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        for (const ride of sorted) {
          for (const raw of [ride.pickupAddress, ride.dropoffAddress]) {
            const addr = raw?.trim();
            if (!addr) continue;
            const key = addr.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            fromRides.push(addr);
          }
        }
        setGoMobileRideHistoryAddresses(
          fromRides.length > 0 ? fromRides.slice(0, 8) : sessionAddresses
        );
      })
      .catch(() => {
        if (!cancelled) setGoMobileRideHistoryAddresses(sessionAddresses);
      });

    return () => {
      cancelled = true;
    };
  }, [
    isGoProjectPage,
    isMobileGoViewport,
    lastConfirmedDestinationText,
    lastConfirmedPickupText,
  ]);

  const goMobileHistoryItems = useMemo((): PaltoGoMobileHistoryItem[] => {
    const pickupNorm = simplifyRideAddress(paltoPickupLocation.trim()).toLowerCase();
    const destinationNorm = simplifyRideAddress(paltoRideDestination.trim()).toLowerCase();
    return goMobileRideHistoryAddresses
      .filter((address) => {
        const norm = simplifyRideAddress(address).toLowerCase();
        if (pickupNorm && norm === pickupNorm) return false;
        if (destinationNorm && norm === destinationNorm) return false;
        return true;
      })
      .map((address, index) => ({
        id: `go-mobile-hist-${index}-${address.slice(0, 24)}`,
        label: simplifyRideAddress(address),
        onSelect: () => {
          applyPlaceToActiveMobileField(address);
        },
      }));
  }, [
    applyPlaceToActiveMobileField,
    goMobileRideHistoryAddresses,
    paltoPickupLocation,
    paltoRideDestination,
  ]);

  const goMobilePopularDestTitle = useCallback(
    (d: PopularDestination) => (language === 'en' ? d.titleEn : d.titleFr),
    [language]
  );

  const applyPopularDestinationToActiveField = useCallback(
    (d: PopularDestination) => {
      applyPlaceToActiveMobileField(d.geocodeQuery);
    },
    [applyPlaceToActiveMobileField]
  );

  const nowForDateTimeLocal = useCallback(() => {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  }, []);

  useEffect(() => {
    if (paltoPickupTiming === 'later') return;
    const now = new Date();
    setPaltoRecapPickupText(
      now.toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
  }, [paltoPickupTiming]);

  useEffect(() => {
    if (paltoPickupTiming !== 'later' || !paltoPickupDateTime) return;
    const dt = new Date(paltoPickupDateTime);
    if (Number.isNaN(dt.getTime())) return;
    setPaltoRecapPickupText(
      dt.toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
  }, [paltoPickupTiming, paltoPickupDateTime]);

  useEffect(() => {
    if (!isGoProjectPage) return;
    if (pickupAutocompleteTimerRef.current) {
      clearTimeout(pickupAutocompleteTimerRef.current);
      pickupAutocompleteTimerRef.current = null;
    }
    const pickupAutocompleteEnabled = isMobileGoViewport || pickupSuggestionOpen;
    if (!pickupAutocompleteEnabled) return;
    const q = paltoPickupLocation.trim();
    if (q.length < 2) {
      setPickupAddressSuggestions([]);
      setPickupSuggestionLoading(false);
      return;
    }
    const abort = new AbortController();
    pickupAutocompleteTimerRef.current = setTimeout(async () => {
      pickupAutocompleteTimerRef.current = null;
      setPickupSuggestionLoading(true);
      try {
        const suggestions = await geocodeForwardSuggestions(q, undefined, {
          language: geocodeLang(language),
          proximity: [55.45, -21.15],
          bbox: REUNION_ISLAND_BBOX_GEOCODE,
          limit: 10,
          signal: abort.signal,
        });
        if (abort.signal.aborted) return;
        setPickupAddressSuggestions(suggestions);
      } catch {
        if (!abort.signal.aborted) setPickupAddressSuggestions([]);
      } finally {
        if (!abort.signal.aborted) setPickupSuggestionLoading(false);
      }
    }, PICKUP_AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      abort.abort();
      if (pickupAutocompleteTimerRef.current) {
        clearTimeout(pickupAutocompleteTimerRef.current);
        pickupAutocompleteTimerRef.current = null;
      }
    };
  }, [isGoProjectPage, isMobileGoViewport, pickupSuggestionOpen, paltoPickupLocation, language]);

  useEffect(() => {
    if (!isGoProjectPage) return;
    if (destinationAutocompleteTimerRef.current) {
      clearTimeout(destinationAutocompleteTimerRef.current);
      destinationAutocompleteTimerRef.current = null;
    }
    const destinationAutocompleteEnabled = isMobileGoViewport || destinationSuggestionOpen;
    if (!destinationAutocompleteEnabled) return;
    const q = paltoRideDestination.trim();
    if (q.length < 2) {
      setDestinationAddressSuggestions([]);
      setDestinationSuggestionLoading(false);
      return;
    }
    const abort = new AbortController();
    destinationAutocompleteTimerRef.current = setTimeout(async () => {
      destinationAutocompleteTimerRef.current = null;
      setDestinationSuggestionLoading(true);
      try {
        const suggestions = await geocodeForwardSuggestions(q, undefined, {
          language: geocodeLang(language),
          proximity: [55.45, -21.15],
          bbox: REUNION_ISLAND_BBOX_GEOCODE,
          limit: 10,
          signal: abort.signal,
        });
        if (abort.signal.aborted) return;
        setDestinationAddressSuggestions(suggestions);
      } catch {
        if (!abort.signal.aborted) setDestinationAddressSuggestions([]);
      } finally {
        if (!abort.signal.aborted) setDestinationSuggestionLoading(false);
      }
    }, PICKUP_AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      abort.abort();
      if (destinationAutocompleteTimerRef.current) {
        clearTimeout(destinationAutocompleteTimerRef.current);
        destinationAutocompleteTimerRef.current = null;
      }
    };
  }, [isGoProjectPage, isMobileGoViewport, destinationSuggestionOpen, paltoRideDestination, language]);

  useEffect(() => {
    if (!paltoMapSelectedDestination || !pickupResolvedPoint || isLegacyDevPickupOrigin(pickupResolvedPoint)) {
      setPaltoMapRouteFeature(null);
      setPaltoRouteDistanceKm(null);
      setPaltoRouteDeniveleEstimateM(null);
      return;
    }

    const originLng = pickupResolvedPoint.longitude;
    const originLat = pickupResolvedPoint.latitude;
    const destLng = paltoMapSelectedDestination.longitude;
    const destLat = paltoMapSelectedDestination.latitude;

    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const feature = await fetchDrivingRouteFeature(
            { longitude: originLng, latitude: originLat },
            { longitude: destLng, latitude: destLat },
            { signal: ac.signal }
          );
          if (ac.signal.aborted) return;
          setPaltoMapRouteFeature(feature);
          const durationSeconds =
            feature &&
            feature.properties &&
            typeof (feature.properties as { durationSeconds?: unknown }).durationSeconds === 'number'
              ? ((feature.properties as { durationSeconds: number }).durationSeconds)
              : null;
          const durationTrafficSeconds =
            feature &&
            feature.properties &&
            typeof (feature.properties as { durationTrafficSeconds?: unknown }).durationTrafficSeconds === 'number'
              ? ((feature.properties as { durationTrafficSeconds: number }).durationTrafficSeconds)
              : null;
          setPaltoRecapDurationText(
            durationSeconds && Number.isFinite(durationSeconds)
              ? `~${Math.max(1, Math.round(durationSeconds / 60))} min`
              : ''
          );
          setPaltoRecapTrafficDurationText(
            durationTrafficSeconds && Number.isFinite(durationTrafficSeconds)
              ? `~${Math.max(1, Math.round(durationTrafficSeconds / 60))} min`
              : ''
          );
          const distanceMeters =
            feature &&
            feature.properties &&
            typeof (feature.properties as { distanceMeters?: unknown }).distanceMeters === 'number'
              ? ((feature.properties as { distanceMeters: number }).distanceMeters)
              : null;
          const routeDistanceKm = distanceMeters && Number.isFinite(distanceMeters) ? distanceMeters / 1000 : null;
          setPaltoRouteDistanceKm(routeDistanceKm);
          if (routeDistanceKm) {
            const directKm = haversineDistanceKm(
              { longitude: originLng, latitude: originLat },
              { longitude: destLng, latitude: destLat }
            );
            const deniveleEstimateM = Math.max(0, Math.round((routeDistanceKm - directKm) * 180));
            setPaltoRouteDeniveleEstimateM(deniveleEstimateM);
          } else {
            setPaltoRouteDeniveleEstimateM(null);
          }
        } catch {
          if (ac.signal.aborted) return;
          setPaltoMapRouteFeature(null);
          setPaltoRouteDistanceKm(null);
          setPaltoRouteDeniveleEstimateM(null);
        }
      })();
    }, OSRM_ROUTE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [
    paltoMapSelectedDestination?.latitude,
    paltoMapSelectedDestination?.longitude,
    pickupResolvedPoint?.latitude,
    pickupResolvedPoint?.longitude,
  ]);

  const handlePaltoMainMapPick = useCallback(async (longitude: number, latitude: number) => {
    if (!isLngLatInsideReunionIsland(longitude, latitude)) return;
    if (isMobileGoViewport && chauffeursSearchOk) {
      goBackToRideQueryMobile();
    }
    try {
      const picked = await resolvePickOnRoad(longitude, latitude, { searchRadiusMeters: 75 });
      /** Uniquement l’absence de point départ résolu : sinon un libellé vide (géocode KO) bloquait tout clic en « départ ». */
      const shouldPickPickupFirst = pickupResolvedPoint === null;
      const placeName =
        (await geocodeReverse(picked.longitude, picked.latitude, undefined, { language })) ??
        reverseGeocodeDisplayFallback(language, shouldPickPickupFirst ? 'pickup' : 'destination');
      if (shouldPickPickupFirst) {
        // Premier clic carte: définir le point de départ utilisateur.
        setPaltoPickupLocation(simplifyRideAddress(placeName));
        setPickupResolvedPoint(picked);
        setLastConfirmedPickupText(simplifyRideAddress(placeName));
        setPickupGeocodeError(null);
        // Un clic de départ invalide l'itinéraire en cours: le prochain clic servira pour la destination.
        setPaltoMapSelectedDestination(null);
        setPaltoRideDestination('');
        setLastConfirmedDestinationText(null);
        setDestinationSearchError(null);
        setChauffeursSearchOk(false);
        setPaltoRideSelectedDriverId(null);
      } else {
        setPaltoMapSelectedDestination(picked);
        setPaltoRecapCoordsText(simplifyRideAddress(placeName));
        setPaltoRideDestination(simplifyRideAddress(placeName));
        setLastConfirmedDestinationText(simplifyRideAddress(placeName));
      }
      const now = new Date();
      setPaltoRecapPickupText(
        now.toLocaleString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch {
      // ignore network/snap errors
    }
  }, [language, pickupResolvedPoint, isMobileGoViewport, chauffeursSearchOk, goBackToRideQueryMobile]);
  const [isClosing, setIsClosing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 769px)').matches : false
  );
  const [isRecapPopupOpen, setIsRecapPopupOpen] = useState(false);
  const [isCheckoutPopupOpen, setIsCheckoutPopupOpen] = useState(false);
  const [checkoutCustomerName, setCheckoutCustomerName] = useState('');
  const [checkoutCustomerEmail, setCheckoutCustomerEmail] = useState('');
  const [checkoutClientComment, setCheckoutClientComment] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccessMessage, setCheckoutSuccessMessage] = useState<string | null>(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutStripeClientSecret, setCheckoutStripeClientSecret] = useState<string | null>(null);
  const [checkoutPendingCourseId, setCheckoutPendingCourseId] = useState<string | null>(null);
  const [checkoutPendingExternalCode, setCheckoutPendingExternalCode] = useState<string | null>(null);
  useEffect(() => {
    if (!isClientAuthenticated()) return;
    const sessionUser = getCurrentClientUser();
    const snapshot = loadClientAccountSnapshot();
    const fullName = `${snapshot.prenom || ''} ${snapshot.nom || ''}`.trim();
    if (sessionUser?.email?.trim()) {
      setCheckoutCustomerEmail((prev) => (prev.trim() ? prev : sessionUser.email.trim()));
    }
    if (fullName) {
      setCheckoutCustomerName((prev) => (prev.trim() ? prev : fullName));
    }
  }, []);
  const closeRecapPopup = useCallback(() => {
    setIsRecapPopupOpen(false);
  }, []);
  const closeCheckoutPopup = useCallback(() => {
    setIsCheckoutPopupOpen(false);
    setCheckoutError(null);
    setCheckoutStripeClientSecret(null);
    setCheckoutPendingCourseId(null);
    setCheckoutPendingExternalCode(null);
  }, []);

  /** Modale récap/checkout plein écran + portal : mobile Go uniquement. */
  useEffect(() => {
    if (!isMobileGoViewport || (!isRecapPopupOpen && !isCheckoutPopupOpen)) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('palto-go-ride-modal-open');
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('palto-go-ride-modal-open');
    };
  }, [isMobileGoViewport, isRecapPopupOpen, isCheckoutPopupOpen]);

  const mountGoRideOverlay = useCallback(
    (node: ReactNode) => {
      if (!node) return null;
      if (isMobileGoViewport && typeof document !== 'undefined') {
        return createPortal(node, document.body);
      }
      return node;
    },
    [isMobileGoViewport]
  );
  const handleRecapModalConfirmOrder = useCallback(() => {
    if (paltoPickupTiming === 'now' && !paltoSelectedDriver) {
      return;
    }
    if (paltoPickupTiming === 'later' && !paltoPickupDateTime.trim()) {
      return;
    }
    trackEvent('click', 'go_ride', `${projectData.title}:recap_commande_course`);
    setCheckoutError(null);
    setCheckoutSuccessMessage(null);
    closeRecapPopup();
    setIsCheckoutPopupOpen(true);
  }, [
    closeRecapPopup,
    projectData.title,
    paltoPickupTiming,
    paltoSelectedDriver,
    paltoPickupDateTime,
  ]);
  const handleCheckoutConfirm = useCallback(async () => {
    if (paltoPickupTiming === 'now' && !paltoSelectedDriver) {
      setCheckoutError('Veuillez selectionner un chauffeur pour une course immediate.');
      return;
    }
    if (paltoPickupTiming === 'later' && !paltoPickupDateTime.trim()) {
      setCheckoutError('Veuillez indiquer la date et l heure de prise en charge.');
      return;
    }
    const email = checkoutCustomerEmail.trim();
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailIsValid) {
      setCheckoutError('Veuillez saisir un email valide pour le suivi de la commande.');
      return;
    }
    if (!lastConfirmedPickupText?.trim() || !lastConfirmedDestinationText?.trim()) {
      setCheckoutError('Depart ou destination manquant. Relancez une recherche.');
      return;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const nowParts = () => {
      const d = new Date();
      return {
        scheduledDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        scheduledTime: `${pad(d.getHours())}:${pad(d.getMinutes())}:00`,
      };
    };
    const laterParts = () => {
      const [datePart, timeRaw] = paltoPickupDateTime.split('T');
      if (!datePart || !timeRaw || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
      const timePart = timeRaw.length >= 5 ? `${timeRaw.slice(0, 5)}:00` : null;
      if (!timePart) return null;
      return { scheduledDate: datePart, scheduledTime: timePart };
    };

    const schedule =
      paltoPickupTiming === 'later' ? laterParts() ?? nowParts() : nowParts();
    const bookingKind = paltoPickupTiming === 'later' ? ('scheduled' as const) : ('instant' as const);
    let amountEur = paltoPricing ? Number.parseFloat(paltoPricing.ttc) : NaN;
    if (!Number.isFinite(amountEur) || amountEur <= 0) {
      const km = paltoRouteDistanceKm;
      if (km != null && Number.isFinite(km)) {
        amountEur = Math.max(
          6,
          (effectiveBaseFareEur + km * effectivePricePerKmEur) *
            effectiveDriverPricingMultiplier *
            (1 + (isNightRide ? effectiveNightSurchargeRate : 0))
        );
      } else {
        amountEur = 0;
      }
    }
    if (!Number.isFinite(amountEur) || amountEur <= 0) {
      setCheckoutError('Montant indisponible. Verifiez le trajet sur la carte.');
      return;
    }

    const customerName = checkoutCustomerName.trim();
    trackEvent(
      'submit',
      'go_checkout',
      `${projectData.title}:${bookingKind}:${customerName ? 'named' : 'anonymous'}`
    );
    setCheckoutError(null);
    setCheckoutSuccessMessage(null);
    setCheckoutSubmitting(true);
    try {
      const selDriver = paltoSelectedDriver;
      const result = await createRideOrder({
        bookingKind,
        scheduledDate: schedule.scheduledDate,
        scheduledTime: schedule.scheduledTime,
        pickupAddress: simplifyRideAddress(lastConfirmedPickupText),
        dropoffAddress: simplifyRideAddress(lastConfirmedDestinationText),
        amountEur,
        distanceKm: paltoRouteDistanceKm,
        clientFullName: customerName || null,
        clientEmail: email,
        clientComment: checkoutClientComment.trim() || null,
        requestedDriverExternalKey:
          bookingKind === 'instant' && selDriver && !isChauffeurAccountUuid(selDriver.id)
            ? selDriver.id
            : null,
        requestedChauffeurAccountId:
          bookingKind === 'instant' && selDriver && isChauffeurAccountUuid(selDriver.id)
            ? selDriver.id
            : null,
        pickupLng: pickupResolvedPoint?.longitude ?? null,
        pickupLat: pickupResolvedPoint?.latitude ?? null,
        dropoffLng: paltoMapSelectedDestination?.longitude ?? null,
        dropoffLat: paltoMapSelectedDestination?.latitude ?? null,
      });

      const pk = stripePublishableKey() ?? result.stripePublishableKey ?? null
      const needsStripe =
        Boolean(result.stripeEnabled && result.stripeClientSecret && pk && stripeCheckoutEnabled())

      if (needsStripe && result.stripeClientSecret) {
        setCheckoutPendingCourseId(result.courseId)
        setCheckoutPendingExternalCode(result.externalCode)
        setCheckoutStripeClientSecret(result.stripeClientSecret)
        setCheckoutSubmitting(false)
        return
      }

      const driverLabel =
        bookingKind === 'instant' && paltoSelectedDriver
          ? paltoSelectedDriver.name
          : 'un chauffeur disponible'
      const successMessage =
        bookingKind === 'scheduled'
          ? `Demande prise en compte (${result.externalCode}). Un chauffeur l'acceptera prochainement. Suivi : ${email}.`
          : `Commande enregistree (${result.externalCode}). Chauffeur : ${driverLabel}. Suivi : ${email}.`
      setCheckoutSuccessMessage(successMessage)
      window.setTimeout(() => {
        setIsCheckoutPopupOpen(false)
        if (onOpenClientAccount) onOpenClientAccount()
      }, 900)
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Enregistrement impossible. Reessayez.')
    } finally {
      setCheckoutSubmitting(false)
    }
  }, [
    checkoutCustomerEmail,
    checkoutClientComment,
    checkoutCustomerName,
    lastConfirmedDestinationText,
    lastConfirmedPickupText,
    paltoMapSelectedDestination?.latitude,
    paltoMapSelectedDestination?.longitude,
    pickupResolvedPoint?.latitude,
    pickupResolvedPoint?.longitude,
    paltoPickupDateTime,
    paltoPickupTiming,
    paltoPricing,
    paltoRouteDistanceKm,
    paltoSelectedDriver,
    effectiveBaseFareEur,
    effectivePricePerKmEur,
    effectiveDriverPricingMultiplier,
    effectiveNightSurchargeRate,
    isNightRide,
    onOpenClientAccount,
    projectData.title,
    stripeCheckoutEnabled,
  ]);

  const finishCheckoutAfterPayment = useCallback(async () => {
    const courseId = checkoutPendingCourseId
    const externalCode = checkoutPendingExternalCode
    const email = checkoutCustomerEmail.trim()
    if (!courseId || !externalCode) {
      setCheckoutError('Commande introuvable apres paiement.')
      return
    }
    setCheckoutSubmitting(true)
    setCheckoutError(null)
    try {
      await confirmRidePaymentAuthorized(courseId)
      const bookingKind = paltoPickupTiming === 'later' ? 'scheduled' : 'instant'
      const driverLabel =
        bookingKind === 'instant' && paltoSelectedDriver
          ? paltoSelectedDriver.name
          : 'un chauffeur disponible'
      const successMessage =
        bookingKind === 'scheduled'
          ? `Paiement autorise. Demande ${externalCode} — un chauffeur l'acceptera. Suivi : ${email}.`
          : `Paiement autorise. Commande ${externalCode} — chauffeur : ${driverLabel}. Suivi : ${email}.`
      setCheckoutStripeClientSecret(null)
      setCheckoutSuccessMessage(successMessage)
      window.setTimeout(() => {
        setIsCheckoutPopupOpen(false)
        if (onOpenClientAccount) onOpenClientAccount()
      }, 900)
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Verification paiement impossible.')
    } finally {
      setCheckoutSubmitting(false)
    }
  }, [
    checkoutPendingCourseId,
    checkoutPendingExternalCode,
    checkoutCustomerEmail,
    paltoPickupTiming,
    paltoSelectedDriver,
    onOpenClientAccount,
  ]);

  const [showContactModal, setShowContactModal] = useState(false);
  /** Conception & Itération : indice du concept (graduations) et indice du visuel dans le carrousel vertical du concept actif */
  const [paltoConceptionConceptIndex, setPaltoConceptionConceptIndex] = useState(0);
  const [paltoConceptionSlideIndex, setPaltoConceptionSlideIndex] = useState(0);
  const LIFT_SCROLL_MAX = 200; // Pixels de "scroll" pour que le panneau touche le haut
  const [liftScroll, setLiftScroll] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return window.matchMedia('(min-width: 769px)').matches ? LIFT_SCROLL_MAX : 0;
  });
  const [contentScrollTop, setContentScrollTop] = useState(0); // scroll du contenu une fois le panneau en haut
  const pageRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);
  const userflowTreeContainerRef = useRef<HTMLDivElement>(null);
  const userflowTreeWrapperRef = useRef<HTMLDivElement>(null);
  /** Hauteur de la zone image centrale → contraint graduations + carrousel vertical (scroll interne) */
  const paltoConceptionStageInnerRef = useRef<HTMLDivElement>(null);
  const [paltoConceptionSideMaxPx, setPaltoConceptionSideMaxPx] = useState<number | null>(null);

  useEffect(() => {
    const onResize = () => {
      setIsDesktopViewport(window.matchMedia('(min-width: 769px)').matches);
      setIsMobileGoViewport(window.matchMedia('(max-width: 768px)').matches);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const introText =
    isEn && projectData.translations?.en?.summary ? projectData.translations.en.summary : projectData.summary;
  const introParagraphs = introText
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  /** Nœud « feuille » cliqué : même bulle recliquée → désélection (sans popup) */
  const [userflowSelectedLeafId, setUserflowSelectedLeafId] = useState<string | null>(null);

  const findNode = useCallback((data: FlowNodeData, id: string): FlowNodeData | null => {
    if (data.id === id) return data;
    if (data.branches) {
      for (const branch of data.branches) {
        const found = findNode(branch, id);
        if (found) return found;
      }
    }
    if (data.next) {
      const found = findNode(data.next, id);
      if (found) return found;
    }
    return null;
  }, []);

  const findAncestors = useCallback((data: FlowNodeData, targetId: string, path: string[] = []): string[] | null => {
    if (data.id === targetId) return path;
    if (data.branches) {
      for (const branch of data.branches) {
        const result = findAncestors(branch, targetId, [...path, data.id]);
        if (result) return result;
      }
    }
    if (data.next) {
      const result = findAncestors(data.next, targetId, [...path, data.id]);
      if (result) return result;
    }
    return null;
  }, []);

  const userFlowTreeData = useMemo(() => {
    const uf = projectData.userFlow ? (isEn && projectData.translations?.en?.userFlow ? projectData.translations.en.userFlow : projectData.userFlow) : null;
    return uf ? userFlowToFlowData(uf) : null;
  }, [projectData.userFlow, projectData.translations, isEn]);

  /** Carrousels Palto hors section #audit (ex. Design system — slides 2–3 = creation atelier) */
  const auditCarouselImages = useMemo(() => buildAuditCarouselImages(), []);

  /** Section #audit uniquement : slide 2 MacBook, slide 3 iPad */
  const auditSectionCarouselImages = useMemo(
    () =>
      buildAuditCarouselImages(
        auditCarouselMacBookPaltoAuditSection,
        auditCarouselHandheldIpadPaltoAuditSection
      ),
    []
  );

  /** Design system Palto — Bento 6 tuiles (grille 4×3 type dashboard) */
  const paltoDsBentoItems = useMemo(() => {
    if (!projectData.designSystem) {
      const n = auditCarouselImages.length;
      return auditCarouselImages.map((img, index) => ({
        src: img.src,
        alt: t(`project.auditAlt${index + 1}`),
        label: `${index + 1} / ${n}`,
      }));
    }
    const frameAlt = (id: string) => `Go — Design system (${id})`;
    return [
      {
        src: paltoDsFrame1050,
        alt: frameAlt('Frame 1050'),
      },
      {
        src: paltoDsFrame1051,
        alt: frameAlt('Frame 1051'),
      },
      {
        content: (
          <PaltoTypescaleTable
            projectData={projectData}
            t={t}
            typographyHeadingId="palto-bento-typescale"
          />
        ),
      },
      {
        content: <PaltoPaletteTable projectData={projectData} isEn={isEn} t={t} />,
      },
      {
        src: paltoDsFrame1048,
        alt: frameAlt('Frame 1048'),
      },
      {
        src: paltoCardSwapDashboard,
        alt: frameAlt('Dashboard'),
        hideMediaFrame: true,
      },
    ];
  }, [projectData, isEn, t, auditCarouselImages]);

  /** Groupes d’images par concept (Conception Palto uniquement ; autres projets : repli 1 concept / 1 image) */
  const paltoConceptionConceptGroups = useMemo(() => GO_CONCEPTION_CONCEPT_GROUPS, []);

  const conceptionSafeConceptIdx =
    paltoConceptionConceptGroups.length === 0
      ? 0
      : Math.min(
          Math.max(0, paltoConceptionConceptIndex),
          paltoConceptionConceptGroups.length - 1
        );

  const paltoConceptionCurrentSlides = paltoConceptionConceptGroups[conceptionSafeConceptIdx] ?? [];

  /** Conception & Itération (Palto) : H3 + corps — priorité aux champs conception*, repli sur le doublon design system */
  const paltoConceptionPivotH3 = useMemo(() => {
    return (
      (isEn && projectData.translations?.en?.conceptionDuplicatePivotH3
        ? projectData.translations.en.conceptionDuplicatePivotH3
        : projectData.conceptionDuplicatePivotH3) ??
      (isEn && projectData.translations?.en?.architectureDsDuplicatePivotH3
        ? projectData.translations.en.architectureDsDuplicatePivotH3
        : projectData.architectureDsDuplicatePivotH3)
    );
  }, [projectData, isEn]);

  const paltoConceptionBody = useMemo(() => {
    return (
      (isEn && projectData.translations?.en?.conceptionDuplicateBody
        ? projectData.translations.en.conceptionDuplicateBody
        : projectData.conceptionDuplicateBody) ??
      (isEn && projectData.translations?.en?.architectureDsDuplicateBody
        ? projectData.translations.en.architectureDsDuplicateBody
        : projectData.architectureDsDuplicateBody ?? '')
    );
  }, [projectData, isEn]);

  const conceptionSafeSlideIdx =
    paltoConceptionCurrentSlides.length === 0
      ? 0
      : Math.min(
          Math.max(0, paltoConceptionSlideIndex),
          paltoConceptionCurrentSlides.length - 1
        );

  useEffect(() => {
    setPaltoConceptionConceptIndex((i) =>
      Math.min(i, Math.max(0, paltoConceptionConceptGroups.length - 1))
    );
  }, [paltoConceptionConceptGroups.length]);

  useEffect(() => {
    setPaltoConceptionSlideIndex((i) =>
      Math.min(i, Math.max(0, paltoConceptionCurrentSlides.length - 1))
    );
  }, [conceptionSafeConceptIdx, paltoConceptionCurrentSlides.length]);

  useEffect(() => {
    const el = paltoConceptionStageInnerRef.current;
    if (!el) {
      setPaltoConceptionSideMaxPx(null);
      return;
    }
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setPaltoConceptionSideMaxPx(Math.round(h));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [
    projectData.title,
    conceptionSafeConceptIdx,
    conceptionSafeSlideIdx,
    paltoConceptionCurrentSlides.length,
  ]);

  const handleUserflowNodeClick = useCallback(
    (nodeId: string) => {
      if (!userFlowTreeData) return;
      const node = findNode(userFlowTreeData, nodeId);
      if (!node) return;
      if (userflowSelectedLeafId === nodeId) {
        setUserflowSelectedLeafId(null);
        setSelectedNodes(new Set());
      } else {
        setUserflowSelectedLeafId(nodeId);
        const ancestors = findAncestors(userFlowTreeData, nodeId);
        setSelectedNodes(new Set(ancestors ? [...ancestors, nodeId] : [nodeId]));
      }
    },
    [findNode, findAncestors, userflowSelectedLeafId, userFlowTreeData]
  );

  /** Pan à la souris uniquement : sur tactile, le scroll natif du wrapper évite de casser les taps sur les bulles. */
  useEffect(() => {
    if (!userFlowTreeData) return;
    const container = userflowTreeContainerRef.current;
    const scrollEl = userflowTreeWrapperRef.current;
    if (!container || !scrollEl) return;
    if (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    const PAN_THRESH_PX = 8;
    let activeId: number | null = null;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    let panning = false;
    let movedPastThreshold = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2) return;

      /* Ne pas setPointerCapture ici : sur mobile, une capture immédiate vole le pointeur aux bulles
       * et le clic / tap ne se déclenche plus. On ne capture qu’au-delà du seuil de pan (voir pointermove). */
      activeId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = scrollEl.scrollLeft;
      startScrollTop = scrollEl.scrollTop;
      panning = true;
      movedPastThreshold = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!panning || activeId !== e.pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!movedPastThreshold) {
        if (Math.hypot(dx, dy) < PAN_THRESH_PX) return;
        movedPastThreshold = true;
        container.classList.add('userflow-tree--grabbing');
        try {
          container.setPointerCapture(e.pointerId);
        } catch {
          /* Safari / certains navigateurs : pan sans capture, moins fluide hors zone */
        }
      }
      e.preventDefault();
      scrollEl.scrollLeft = startScrollLeft - dx;
      scrollEl.scrollTop = startScrollTop - dy;
    };

    const endPointer = (e: PointerEvent) => {
      if (!panning || activeId !== e.pointerId) return;
      const didPan = movedPastThreshold;
      panning = false;
      movedPastThreshold = false;
      container.classList.remove('userflow-tree--grabbing');
      if (didPan) {
        try {
          container.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      activeId = null;
      if (didPan) {
        const blockClick = (ev: MouseEvent) => {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          container.removeEventListener('click', blockClick, true);
        };
        container.addEventListener('click', blockClick, true);
      }
    };

    /* Pas d’écoute wheel + preventDefault : ça bloquait le scroll de la page quand la souris était sur l’arbre. */

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove, { passive: false });
    container.addEventListener('pointerup', endPointer);
    container.addEventListener('pointercancel', endPointer);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', endPointer);
      container.removeEventListener('pointercancel', endPointer);
    };
  }, [userFlowTreeData]);

  // Motion values pour le swipe down
  const y = useMotionValue(0);
  const [panelOffsetY, setPanelOffsetY] = useState(0);
  
  // Mémoriser la hauteur de l'écran pour éviter les recalculs
  const screenHeight = useMemo(() => {
    return typeof window !== 'undefined' ? window.innerHeight : 800;
  }, []);

  // Position top : uniquement pilotée par liftScroll (pas par le scroll du contenu)
  const initialTop = useMemo(() => screenHeight * 0.48 + 100, [screenHeight]);
  const topPosition = useMemo(() => {
    if (isDesktopViewport) return 0;
    const progress = Math.min(liftScroll / LIFT_SCROLL_MAX, 1);
    return initialTop * (1 - progress);
  }, [liftScroll, initialTop, isDesktopViewport]);
  const maxSwipeDown = useMemo(() => {
    return Math.max(0, screenHeight - SWIPE_BOTTOM_VISIBLE_MARGIN - topPosition);
  }, [screenHeight, topPosition]);

  // Notifier le parent pour assombrir la cover (0 = pas assombri, 1 = panneau en haut)
  useEffect(() => {
    if (!onLiftProgressChange) return;
    const progress = Math.min(1, Math.max(0, 1 - topPosition / initialTop));
    onLiftProgressChange(progress);
  }, [topPosition, initialTop, onLiftProgressChange]);

  // Wheel/touch : pendant la phase de montée, seul le panneau monte ; mises à jour throttlées en rAF pour fluidité
  const liftDeltaRef = useRef(0);
  const rafScheduledRef = useRef(false);
  const liftScrollRef = useRef(0);
  liftScrollRef.current = liftScroll;

  useEffect(() => {
    if (isDesktopViewport) return;
    const el = pageRef.current;
    if (!el) return;

    const flushLift = () => {
      rafScheduledRef.current = false;
      const delta = liftDeltaRef.current;
      liftDeltaRef.current = 0;
      if (delta === 0) return;
      setLiftScroll(prev => {
        const next = Math.max(0, Math.min(LIFT_SCROLL_MAX, prev + delta));
        return next;
      });
    };

    const scheduleFlush = () => {
      if (rafScheduledRef.current) return;
      rafScheduledRef.current = true;
      requestAnimationFrame(flushLift);
    };

    const handleWheel = (e: WheelEvent) => {
      const scrollTop = el.scrollTop;
      const maxLift = LIFT_SCROLL_MAX;
      const current = liftScrollRef.current;

      if (e.deltaY > 0) {
        if (current < maxLift) {
          liftDeltaRef.current += e.deltaY;
          scheduleFlush();
          e.preventDefault();
        }
      } else {
        if (scrollTop <= 0 && current > 0) {
          liftDeltaRef.current += e.deltaY;
          scheduleFlush();
          e.preventDefault();
        }
      }
    };

    const touchStartY = { current: 0 };
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      const deltaY = touchStartY.current - y;
      touchStartY.current = y;

      const scrollTop = el.scrollTop;
      const maxLift = LIFT_SCROLL_MAX;
      const current = liftScrollRef.current;

      if (deltaY > 0) {
        if (current < maxLift) {
          liftDeltaRef.current += deltaY;
          scheduleFlush();
          e.preventDefault();
        }
      } else {
        if (scrollTop <= 0 && current > 0) {
          liftDeltaRef.current += deltaY;
          scheduleFlush();
          e.preventDefault();
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDesktopViewport]);

  // Suivre le scroll du contenu (pour FAB et autres) une fois le panneau en haut
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const handleScroll = () => setContentScrollTop(el.scrollTop);
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    onProjectScrollCombinedChange?.(liftScroll + contentScrollTop);
  }, [liftScroll, contentScrollTop, onProjectScrollCombinedChange]);

  // Notifier le parent de la valeur initiale
  useEffect(() => {
    if (onSwipeYChange) {
      onSwipeYChange(0);
    }
  }, []); // Seulement au montage

  // Remonter en haut de la page et réinitialiser la phase de montée à chaque changement de projet (prev/next)
  useEffect(() => {
    const nextLift = isDesktopViewport ? LIFT_SCROLL_MAX : 0;
    setLiftScroll(nextLift);
    setContentScrollTop(0);
    setPanelOffsetY(0);
    y.set(0);
    onLiftProgressChange?.(nextLift >= LIFT_SCROLL_MAX ? 1 : 0);
    const el = pageRef.current;
    if (el) el.scrollTo(0, 0);
  }, [projectData.id, onLiftProgressChange, y, isDesktopViewport]);

  /** /go mobile : quand la liste de suggestions rétrécit, remonter le scroll du panneau. */
  useEffect(() => {
    if (!isGoProjectPage || !isMobileGoViewport) return;
    const page = pageRef.current;
    if (!page) return;
    const resetScroll = () => {
      page.scrollTop = 0;
    };
    resetScroll();
    const frame = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(frame);
  }, [
    isGoProjectPage,
    isMobileGoViewport,
    mobileRouteActiveField,
    paltoPickupLocation,
    paltoRideDestination,
    pickupAddressSuggestions.length,
    destinationAddressSuggestions.length,
  ]);

  /** /go mobile : après Rechercher, le bandeau affiche la liste chauffeurs — remonter le panneau. */
  useEffect(() => {
    if (!isGoProjectPage || !mobileShowChooseRideStep) return;
    const page = pageRef.current;
    if (!page) return;
    const resetScroll = () => {
      page.scrollTop = 0;
    };
    resetScroll();
    const frame = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(frame);
  }, [isGoProjectPage, mobileShowChooseRideStep]);

  /** /go mobile : présélection du premier chauffeur (modifiable si plusieurs). */
  useEffect(() => {
    if (!mobileShowChooseRideStep || pickupFilteredDrivers.length === 0) return;
    setPaltoRideSelectedDriverId((prev) => {
      if (prev && pickupFilteredDrivers.some((d) => d.id === prev)) return prev;
      return pickupFilteredDrivers[0]?.id ?? null;
    });
  }, [mobileShowChooseRideStep, pickupFilteredDrivers]);

  useEffect(() => {
    if (!isMobileGoViewport || !mobileShowChooseRideStep) return;
    document.body.classList.add('palto-go-driver-confirm-bar-open');
    return () => {
      document.body.classList.remove('palto-go-driver-confirm-bar-open');
    };
  }, [isMobileGoViewport, mobileShowChooseRideStep]);

  useEffect(() => {
    if (!isGoProjectPage) return;
    const onGoMapUserPick = () => {
      if (isMobileGoViewport && chauffeursSearchOk) {
        goBackToRideQueryMobile();
      }
    };
    window.addEventListener('palto:go-map-user-pick', onGoMapUserPick);
    return () => {
      window.removeEventListener('palto:go-map-user-pick', onGoMapUserPick);
    };
  }, [isGoProjectPage, isMobileGoViewport, chauffeursSearchOk, goBackToRideQueryMobile]);

  useEffect(() => {
    if (!isGoProjectPage) return;
    const onCoverMapUpdate = (evt: Event) => {
      const customEvt = evt as CustomEvent<{
        pickupText?: string;
        pickupLng?: number;
        pickupLat?: number;
        destinationText?: string;
        destinationLng?: number;
        destinationLat?: number;
        coordsText?: string;
        durationText?: string;
        trafficDurationText?: string;
      }>;
      const detail = customEvt.detail;
      if (!detail) return;

      const hasPickupCoords =
        typeof detail.pickupLng === 'number' &&
        typeof detail.pickupLat === 'number' &&
        Number.isFinite(detail.pickupLng) &&
        Number.isFinite(detail.pickupLat);
      const hasDestCoords =
        typeof detail.destinationLng === 'number' &&
        typeof detail.destinationLat === 'number' &&
        Number.isFinite(detail.destinationLng) &&
        Number.isFinite(detail.destinationLat);

      if (hasPickupCoords) {
        const pLng = detail.pickupLng as number;
        const pLat = detail.pickupLat as number;
        const incoming = { longitude: pLng, latitude: pLat };
        if (!isLegacyDevPickupOrigin(incoming)) {
          setPickupResolvedPoint((prev) =>
            prev && Math.abs(prev.longitude - pLng) < 1e-7 && Math.abs(prev.latitude - pLat) < 1e-7
              ? prev
              : incoming
          );
          setPickupGeocodeError(null);
        }
      }
      const pickupRaw = typeof detail.pickupText === 'string' ? detail.pickupText.trim() : '';
      if (pickupRaw && !isGenericMapAddressFallback(pickupRaw)) {
        const p = simplifyRideAddress(detail.pickupText!);
        setPaltoPickupLocation(p);
        setLastConfirmedPickupText(p);
        setPaltoRecapPickupText(p);
      } else if (hasPickupCoords) {
        const lng = detail.pickupLng as number;
        const lat = detail.pickupLat as number;
        void geocodeReverse(lng, lat, undefined, { language: geocodeLang(language) }).then((raw) => {
          if (!raw) return;
          const p = simplifyRideAddress(raw);
          setPaltoPickupLocation(p);
          setLastConfirmedPickupText(p);
          setPaltoRecapPickupText(p);
        });
      }
      if (hasDestCoords) {
        const dLng = detail.destinationLng as number;
        const dLat = detail.destinationLat as number;
        setPaltoMapSelectedDestination((prev) =>
          prev && Math.abs(prev.longitude - dLng) < 1e-7 && Math.abs(prev.latitude - dLat) < 1e-7
            ? prev
            : { longitude: dLng, latitude: dLat }
        );
      }
      const destRaw = typeof detail.destinationText === 'string' ? detail.destinationText.trim() : '';
      if (destRaw && !isGenericMapAddressFallback(destRaw)) {
        const d = simplifyRideAddress(detail.destinationText!);
        setPaltoRideDestination(d);
        setLastConfirmedDestinationText(d);
      } else if (hasDestCoords) {
        const lng = detail.destinationLng as number;
        const lat = detail.destinationLat as number;
        void geocodeReverse(lng, lat, undefined, { language: geocodeLang(language) }).then((raw) => {
          if (!raw) return;
          const d = simplifyRideAddress(raw);
          setPaltoRideDestination(d);
          setLastConfirmedDestinationText(d);
        });
      }
      if (detail.coordsText && detail.coordsText.trim()) {
        setPaltoRecapCoordsText(detail.coordsText);
      }
      if (detail.durationText && detail.durationText.trim()) {
        setPaltoRecapDurationText(detail.durationText);
      }
      if (detail.trafficDurationText && detail.trafficDurationText.trim()) {
        setPaltoRecapTrafficDurationText(detail.trafficDurationText);
      }
    };

    window.addEventListener('palto:cover-map-update', onCoverMapUpdate as EventListener);
    return () => {
      window.removeEventListener('palto:cover-map-update', onCoverMapUpdate as EventListener);
    };
  }, [isGoProjectPage, language]);

  useEffect(() => {
    if (!isGoProjectPage) return;
    if (pickupResolvedPoint) {
      window.dispatchEvent(
        new CustomEvent('palto:go-cover-pickup-sync', {
          detail: {
            lng: pickupResolvedPoint.longitude,
            lat: pickupResolvedPoint.latitude,
            label: lastConfirmedPickupText?.trim() ?? '',
          },
        })
      );
    } else {
      window.dispatchEvent(new CustomEvent('palto:go-cover-pickup-sync', { detail: {} }));
    }
  }, [isGoProjectPage, pickupResolvedPoint?.longitude, pickupResolvedPoint?.latitude, lastConfirmedPickupText]);

  useEffect(() => {
    if (!isGoProjectPage) return;
    window.dispatchEvent(
      new CustomEvent('palto:go-cover-route-sync', {
        detail: {
          routeFeature: paltoMapRouteFeature,
        },
      })
    );
  }, [isGoProjectPage, paltoMapRouteFeature]);

  useEffect(() => {
    if (!isGoProjectPage) return;
    window.dispatchEvent(
      new CustomEvent('palto:go-cover-destination-sync', {
        detail: {
          destination: paltoMapSelectedDestination,
        },
      })
    );
  }, [isGoProjectPage, paltoMapSelectedDestination?.longitude, paltoMapSelectedDestination?.latitude]);

  /** Mobile : carte en cover (ProjectCoverCarousel) — synchroniser les pins chauffeurs comme sur desktop. */
  useEffect(() => {
    if (!isGoProjectPage) return;
    window.dispatchEvent(
      new CustomEvent('palto:go-cover-nearby-drivers-sync', {
        detail: {
          drivers: chauffeursSearchOk ? pickupFilteredDrivers : [],
        },
      })
    );
  }, [isGoProjectPage, chauffeursSearchOk, pickupFilteredDrivers]);

  // JSON-LD CreativeWork pour que les IA et crawlers (avec JS) puissent lire le contenu du projet
  useEffect(() => {
    const baseUrl = (import.meta.env.VITE_SITE_URL as string) || (typeof window !== 'undefined' ? window.location.origin : '')
    const slug = projectData.title.toLowerCase()
    const urlFr = `${baseUrl.replace(/\/$/, '')}/fr/${slug}`
    const urlEn = `${baseUrl.replace(/\/$/, '')}/en/${slug}`
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: projectData.title,
      description: projectData.summary,
      author: { '@type': 'Organization', name: 'Palto' },
      datePublished: projectData.year || undefined,
      url: projectData.projectUrl || urlFr,
      mainEntityOfPage: [{ '@id': urlFr }, { '@id': urlEn }],
      inLanguage: ['fr', 'en'],
    }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(jsonLd)
    script.id = 'project-json-ld'
    document.head.appendChild(script)
    return () => {
      const el = document.getElementById('project-json-ld')
      if (el) el.remove()
    }
  }, [projectData.title, projectData.summary, projectData.year, projectData.projectUrl])



  // Vérifier si on peut swiper (on peut toujours swiper depuis la barre)
  const canSwipe = useCallback(() => {
    if (isDesktopViewport) return false;
    const target = pageRef.current;
    if (!target) return false;
    // Permettre le swipe même si on a scrollé un peu
    return true;
  }, [isDesktopViewport]);

  // Gestion du drag avec logique exacte comme React Native (comportement Facebook)
  // Comme useAnimatedGestureHandler avec ctx.startY et event.translationY
  const [startY, setStartY] = useState<number | null>(null);
  const [startYValue, setStartYValue] = useState<number>(0); // ctx.startY
  const [initialScrollTop, setInitialScrollTop] = useState<number>(0); // Sauvegarder le scroll initial

  const handleBarMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canSwipe()) {
      const target = pageRef.current;
      setInitialScrollTop(target ? target.scrollTop : 0);
      setIsDragging(true);
      setStartY(e.clientY);
      setStartYValue(y.get()); // Sauvegarder la position Y actuelle (comme ctx.startY)
    }
  };

  const handleBarTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canSwipe()) {
      const target = pageRef.current;
      setInitialScrollTop(target ? target.scrollTop : 0);
      setIsDragging(true);
      setStartY(e.touches[0].clientY);
      setStartYValue(y.get()); // Sauvegarder la position Y actuelle (comme ctx.startY)
    }
  };

  // Event listeners globaux pour suivre le mouvement en temps réel (comme PanGestureHandler)
  useEffect(() => {
    if (!isDragging || startY === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = pageRef.current;
      
      // Calculer la translation depuis le point de départ (comme event.translationY en RN)
      const translationY = e.clientY - startY;
      
      // Si on tire vers le haut (translationY < 0), vérifier si on scroll
      if (translationY < 0) {
        // Si on a scrollé depuis le début du drag, annuler le drag pour permettre le scroll
        if (target && target.scrollTop > initialScrollTop + 5) {
          setIsDragging(false);
          setStartY(null);
          setStartYValue(0);
          y.set(0);
          if (onSwipeYChange) {
            onSwipeYChange(0);
          }
          return;
        }
        // Sinon, ne rien faire pour permettre le scroll normal
        return;
      }
      
      // Si on tire vers le bas (translationY > 0), continuer le drag même si on a scrollé
      e.preventDefault();
      e.stopPropagation();
      
      // Calculer la prochaine position Y (comme ctx.startY + event.translationY dans l'exemple RN)
      const nextY = startYValue + translationY;
      
      // Limiter le drag entre 0 (haut) et maxSwipeDown (bas avec marge visible)
      const newY = Math.min(maxSwipeDown, Math.max(0, nextY));
      y.set(newY);
      if (onSwipeYChange) {
        // Garde la cover fixe: ne pas translater l'image de couverture pendant le drag.
        onSwipeYChange(0);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const target = pageRef.current;
      
      // Calculer la translation depuis le point de départ (comme event.translationY en RN)
      const translationY = e.touches[0].clientY - startY;
      
      // Si on tire vers le haut (translationY < 0), vérifier si on scroll
      if (translationY < 0) {
        // Si on a scrollé depuis le début du drag, annuler le drag pour permettre le scroll
        if (target && target.scrollTop > initialScrollTop + 5) {
          setIsDragging(false);
          setStartY(null);
          setStartYValue(0);
          y.set(0);
          if (onSwipeYChange) {
            onSwipeYChange(0);
          }
          return;
        }
        // Sinon, ne rien faire pour permettre le scroll normal
        return;
      }
      
      // Si on tire vers le bas (translationY > 0), continuer le drag même si on a scrollé
      e.preventDefault();
      e.stopPropagation();
      
      // Calculer la prochaine position Y (comme ctx.startY + event.translationY dans l'exemple RN)
      const nextY = startYValue + translationY;
      
      // Limiter le drag entre 0 (haut) et maxSwipeDown (bas avec marge visible)
      const newY = Math.min(maxSwipeDown, Math.max(0, nextY));
      y.set(newY);
      if (onSwipeYChange) {
        // Garde la cover fixe: ne pas translater l'image de couverture pendant le drag.
        onSwipeYChange(0);
      }
    };

    // Handler unifié pour mouseup et touchend
    const handleEnd = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const currentY = y.get();
      
      setIsDragging(false);
      setStartY(null);
      setStartYValue(0);
      
      // On ne ferme jamais la page avec le swipe vers le bas:
      // on conserve la position pour pouvoir redescendre/remonter librement.
      const clamped = Math.min(maxSwipeDown, Math.max(0, currentY));
      y.set(clamped);
      setPanelOffsetY(clamped);
      if (onSwipeYChange) {
        onSwipeYChange(0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleEnd, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, startY, startYValue, initialScrollTop, y, onSwipeYChange, maxSwipeDown]);

  // Notifier le parent des changements de y directement dans les handlers

  return (
    <>
      <motion.div
        ref={pageRef}
        className={`page active single-project-page ${isClosing ? 'closing' : ''} ${isDragging ? 'dragging' : ''} ${coverFullscreenActive ? 'cover-fullscreen-active' : ''}`}
        style={
          isDragging
            ? { y: y, top: `${topPosition}px`, borderRadius: topPosition <= 0 ? 0 : '24px 24px 0 0' }
            : { top: `${topPosition}px`, borderRadius: topPosition <= 0 ? 0 : '24px 24px 0 0' }
        }
        animate={
          isDragging
            ? undefined
            : (isClosing || coverFullscreenActive)
              ? { y: screenHeight }
              : { y: panelOffsetY }
        }
        transition={coverFullscreenActive
          ? { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
          : {
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
        initial={false}
      >
        {/* Barre de fermeture en haut */}
        <div 
          ref={barRef}
          className="swipe-indicator-bar"
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
            onMouseDown={handleBarMouseDown}
          onTouchStart={handleBarTouchStart}
        >
          <div className="swipe-indicator-handle"></div>
        </div>
        
        <div className="main-single-project">
        {isGoProjectPage ? (
        <>
        {isDesktopViewport ? (
        <div className="dashboard-container dashboard-container--home-accueil single-project-go-topbar-wrap">
          <div className="dashboard-main single-project-go-topbar-wrap__main">
            <DashboardHomeRidesBanner
              clientUpcomingRide={clientUpcomingRide}
              clientLiveMeetActive={clientLiveMeetActive}
              onOpenClientLiveMeet={onOpenClientLiveMeet}
              analyticsSuffix="go"
            />
          </div>
        </div>
        ) : null}
        <div className="palto-ride-main">
          <div
            className={`palto-ride-layout${showDriversColumn ? ' palto-ride-layout--has-drivers' : ' palto-ride-layout--no-drivers'}${mobileShowChooseRideStep ? ' palto-ride-layout--mobile-choose-ride' : ''}`}
          >
          <div className="palto-ride-column palto-ride-column--booking">
          {isMobileGoViewport ? (
            <div
              className={
                'palto-ride-mobile-floating-booking' +
                (mobileShowChooseRideStep ? ' palto-ride-mobile-floating-booking--choose-ride' : '')
              }
            >
              {mobileShowChooseRideStep ? (
                <>
                  <div className="palto-ride-mobile-choose-ride__header">
                    <button
                      type="button"
                      className="palto-ride-mobile-choose-ride__prev"
                      onClick={goBackToRideQueryMobile}
                      aria-label={t('search.goPreviousStep')}
                    >
                      <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
                      <span>{t('search.goPreviousStep')}</span>
                    </button>
                  </div>
                  <h2 className="palto-ride-mobile-floating-booking__title">{t('search.chooseRideTitle')}</h2>
                  {renderPaltoDriversList(true)}
                </>
              ) : (
                <>
                  <h2 className="palto-ride-mobile-floating-booking__title">{t('clientAccount.bookRide')}</h2>
                  <PaltoGoPickupTimingSelect
                    timing={paltoPickupTiming}
                    onTimingChange={handlePickupTimingChange}
                    pickupDateTime={paltoPickupDateTime}
                    onPickupDateTimeChange={setPaltoPickupDateTime}
                    minDateTimeLocal={nowForDateTimeLocal()}
                    labelNow={t('search.goTimingNow')}
                    labelLater={t('search.goTimingLater')}
                    scheduleInputAriaLabel={t('clientAccount.rideDepartTime')}
                  />
                  <PaltoGoMobileRouteCard
                    pickupValue={paltoPickupLocation}
                    destinationValue={paltoRideDestination}
                    destinationPlaceholder={t('search.destinationPlaceholder')}
                    onPickupChange={onPickupLocationInputChange}
                    onDestinationChange={onDestinationInputChange}
                    onPickupKeyDown={onPickupLocationKeyDown}
                    onDestinationKeyDown={onDestinationKeyDown}
                    onPickupFocus={onPickupLocationFocus}
                    onPickupBlur={onPickupLocationBlur}
                    onDestinationFocus={onDestinationFocus}
                    onDestinationBlur={onDestinationBlur}
                    onClearPickup={clearPickupLocationField}
                    onClearDestination={clearDestinationField}
                    clearPickupAriaLabel="Effacer le départ"
                    clearDestinationAriaLabel="Effacer la destination"
                    pickupGeocodeLoading={pickupGeocodeLoading}
                    destinationSuggestionLoading={destinationSuggestionLoading}
                    destinationSnapLoading={destinationSnapLoading}
                    pickupSuggestionOpen={pickupSuggestionOpen}
                    destinationSuggestionOpen={destinationSuggestionOpen}
                  />
                </>
              )}
            </div>
          ) : null}
          {!(isMobileGoViewport && mobileShowChooseRideStep) ? (
          <section
            className={`palto-ride-card${isMobileGoViewport ? ' palto-ride-card--mobile-route' : ''}`}
          >
            {!isMobileGoViewport ? (
              <>
            <h2 className="palto-ride-card__title">Commandez une course</h2>
            <p className="palto-ride-card__lead">Indiquez votre départ et votre arrivée sur La Réunion.</p>
            <PaltoGoPickupTimingSelect
              timing={paltoPickupTiming}
              onTimingChange={handlePickupTimingChange}
              pickupDateTime={paltoPickupDateTime}
              onPickupDateTimeChange={setPaltoPickupDateTime}
              minDateTimeLocal={nowForDateTimeLocal()}
              labelNow={t('search.goTimingNow')}
              labelLater={t('search.goTimingLater')}
              scheduleInputAriaLabel={t('clientAccount.rideDepartTime')}
            />
            <label className="palto-ride-field">
              <span className="palto-ride-field__label">Localisation (départ)</span>
              <div className="palto-ride-input-row">
                <input
                  type="text"
                  className="palto-ride-input palto-ride-input--with-clear"
                  value={paltoPickupLocation}
                  placeholder="Indiquez votre depart"
                  onChange={(e) => onPickupLocationInputChange(e.target.value)}
                  onKeyDown={onPickupLocationKeyDown}
                  onFocus={onPickupLocationFocus}
                  onBlur={onPickupLocationBlur}
                  aria-busy={pickupGeocodeLoading}
                />
                {paltoPickupLocation.trim().length > 0 ? (
                  <button
                    type="button"
                    className="palto-ride-input-clear"
                    aria-label="Effacer la localisation"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={clearPickupLocationField}
                  >
                    ×
                  </button>
                ) : null}
                {pickupSuggestionOpen ? (
                  <div className="palto-pickup-suggestions" role="listbox" aria-label="Suggestions localisation">
                    {paltoPickupLocation.trim().length >= 2 ? (
                      <>
                        <p className="palto-pickup-suggestions__title">Suggestions d’adresse</p>
                        {pickupAddressSuggestions.length > 0 ? (
                          <div className="palto-pickup-suggestions__list">
                            {pickupAddressSuggestions.map((s) => (
                              <button
                                key={`${s.longitude}-${s.latitude}-${s.label}`}
                                type="button"
                                className="palto-pickup-suggestions__item"
                                data-pickup-suggestion="true"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  void applyPickupFromSuggestion(s);
                                }}
                              >
                                {simplifyRideAddress(s.label)}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="palto-pickup-suggestions__hint">
                            {pickupSuggestionLoading ? 'Recherche en cours…' : 'Aucune adresse trouvée.'}
                          </p>
                        )}
                        {pickupSuggestionLoading && pickupAddressSuggestions.length > 0 ? (
                          <p className="palto-pickup-suggestions__hint">Affinage des suggestions…</p>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <p className="palto-pickup-suggestions__title">Pré-sélection</p>
                        <div className="palto-pickup-suggestions__list">
                          {pickupStaticSuggestions.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="palto-pickup-suggestions__item"
                              data-pickup-suggestion="true"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={item.action}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
              {pickupGeocodeError ? (
                <p className="palto-ride-field-error" role="alert">
                  {pickupGeocodeError}
                </p>
              ) : null}
              {pickupGeocodeLoading ? (
                <p className="palto-ride-field-hint" aria-live="polite">
                  Vérification du départ, de la destination et des chauffeurs…
                </p>
              ) : null}
            </label>
            <label className="palto-ride-field">
              <span className="palto-ride-field__label">Destination</span>
              <div className="palto-ride-input-row">
                <input
                  type="text"
                  className="palto-ride-input palto-ride-input--with-clear"
                  placeholder={t('search.destinationPlaceholder')}
                  value={paltoRideDestination}
                  onChange={(e) => onDestinationInputChange(e.target.value)}
                  onKeyDown={onDestinationKeyDown}
                  onFocus={onDestinationFocus}
                  onBlur={onDestinationBlur}
                  aria-busy={destinationSuggestionLoading || destinationSnapLoading}
                />
                {paltoRideDestination.trim().length > 0 ? (
                  <button
                    type="button"
                    className="palto-ride-input-clear"
                    aria-label="Effacer la destination"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={clearDestinationField}
                  >
                    ×
                  </button>
                ) : null}
                {destinationSuggestionOpen ? (
                  <div className="palto-pickup-suggestions" role="listbox" aria-label="Suggestions destination">
                    {paltoRideDestination.trim().length >= 2 ? (
                      <>
                        <p className="palto-pickup-suggestions__title">Suggestions d’adresse</p>
                        {destinationAddressSuggestions.length > 0 ? (
                          <div className="palto-pickup-suggestions__list">
                            {destinationAddressSuggestions.map((s) => (
                              <button
                                key={`dest-${s.longitude}-${s.latitude}-${s.label}`}
                                type="button"
                                className="palto-pickup-suggestions__item"
                                data-destination-suggestion="true"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  void applyDestinationFromSuggestion(s);
                                }}
                              >
                                {simplifyRideAddress(s.label)}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="palto-pickup-suggestions__hint">
                            {destinationSuggestionLoading ? 'Recherche en cours…' : 'Aucune adresse trouvée.'}
                          </p>
                        )}
                        {destinationSuggestionLoading && destinationAddressSuggestions.length > 0 ? (
                          <p className="palto-pickup-suggestions__hint">Affinage des suggestions…</p>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <p className="palto-pickup-suggestions__title">Pré-sélection</p>
                        <div className="palto-pickup-suggestions__list">
                          {destinationStaticSuggestions.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="palto-pickup-suggestions__item"
                              data-destination-suggestion="true"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={item.action}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
              {destinationSnapLoading ? (
                <p className="palto-ride-field-hint" aria-live="polite">
                  Mise à jour de la destination sur la carte…
                </p>
              ) : null}
              {destinationSearchError ? (
                <p className="palto-ride-field-error" role="alert">
                  {destinationSearchError}
                </p>
              ) : null}
            </label>
              </>
            ) : (
              <>
                <div
                  id="palto-mobile-suggestions-panel"
                  className="palto-ride-mobile-suggestions-sheet"
                  role="region"
                  aria-label="Suggestions et pré-sélection"
                >
                  <PaltoGoMobileSuggestionsPanel
                    ariaLabel="Suggestions et pré-sélection"
                    queryLength={
                      mobileRouteActiveField === 'pickup'
                        ? paltoPickupLocation.trim().length
                        : paltoRideDestination.trim().length
                    }
                    addressSuggestions={
                      mobileRouteActiveField === 'pickup'
                        ? pickupAddressSuggestions
                        : destinationAddressSuggestions
                    }
                    staticSuggestions={goMobileSharedPreselectSuggestions}
                    historyItems={goMobileHistoryItems}
                    popularDestinations={POPULAR_DESTINATIONS}
                    popularSectionTitle={t('search.popularPlacesTitle')}
                    popularDestTitle={goMobilePopularDestTitle}
                    onSelectPopular={applyPopularDestinationToActiveField}
                    suggestionLoading={
                      mobileRouteActiveField === 'pickup'
                        ? pickupSuggestionLoading
                        : destinationSuggestionLoading
                    }
                    onApplyAddress={
                      mobileRouteActiveField === 'pickup'
                        ? applyPickupFromSuggestion
                        : applyDestinationFromSuggestion
                    }
                    simplifyAddress={simplifyRideAddress}
                    dataAttr={
                      mobileRouteActiveField === 'pickup'
                        ? 'data-pickup-suggestion'
                        : 'data-destination-suggestion'
                    }
                  />
                </div>
                {pickupGeocodeError ? (
                  <p className="palto-ride-field-error" role="alert">
                    {pickupGeocodeError}
                  </p>
                ) : null}
                {pickupGeocodeLoading ? (
                  <p className="palto-ride-field-hint" aria-live="polite">
                    Vérification du départ, de la destination et des chauffeurs…
                  </p>
                ) : null}
                {destinationSnapLoading ? (
                  <p className="palto-ride-field-hint" aria-live="polite">
                    Mise à jour de la destination sur la carte…
                  </p>
                ) : null}
                {destinationSearchError ? (
                  <p className="palto-ride-field-error" role="alert">
                    {destinationSearchError}
                  </p>
                ) : null}
              </>
            )}
            {isGoBookingReady ? (
              <Button
                variant="primary"
                type="button"
                className="palto-ride-search-btn"
                onClick={onPrimaryBookingAction}
                disabled={pickupGeocodeLoading}
              >
                {pickupGeocodeLoading
                  ? paltoPickupTiming === 'later'
                    ? t('search.bookingReserveLoading')
                    : t('search.bookingSearchLoading')
                  : paltoPickupTiming === 'later'
                    ? t('search.bookingReserve')
                    : t('search.bookingSearch')}
              </Button>
            ) : null}
          </section>
          ) : null}
          </div>

          {showDriversColumn && !isMobileGoViewport ? (
          <div className="palto-ride-column palto-ride-column--drivers">
          <section className="palto-ride-card palto-ride-card--drivers">
            <h2 className="palto-ride-card__title">{t('search.chooseRideTitle')}</h2>
            <p className="palto-ride-card__lead">
              {t('search.chooseRideRadiusLead', { km: effectiveDriverSearchRadiusKm })}
            </p>
            {renderPaltoDriversList()}
          </section>
          </div>
          ) : null}

          {isDesktopViewport ? (
          <div className="palto-ride-column palto-ride-column--map">
            <section className="palto-ride-card palto-ride-card--map-live">
              <div className="palto-ride-map-shell">
                <HomeOsmMapBackground
                  variant="embedded"
                  userOrigin={pickupResolvedPoint}
                  flyToTarget={embeddedMapFlyToTarget}
                  selectedDestination={paltoMapSelectedDestination}
                  routeFeature={paltoMapRouteFeature}
                  nearbyDrivers={chauffeursSearchOk ? pickupFilteredDrivers : []}
                  onMapDestinationPick={handlePaltoMainMapPick}
                />
              </div>
            </section>
          </div>
          ) : null}
          </div>
          {mountGoRideOverlay(
            mobileShowChooseRideStep && !isRecapPopupOpen && !isCheckoutPopupOpen ? (
              <div
                className="palto-go-driver-confirm-bar"
                role="region"
                aria-label={t('search.chooseDriverCta')}
              >
                {paltoSelectedDriver ? (
                  <>
                    <div className="palto-go-driver-confirm-bar__summary">
                      <p className="palto-go-driver-confirm-bar__name">{paltoSelectedDriver.name}</p>
                      <p className="palto-go-driver-confirm-bar__meta">
                        {formatDriverMetaLine(paltoSelectedDriver, pickupResolvedPoint)}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      type="button"
                      className="palto-go-driver-confirm-bar__cta palto-ride-search-btn"
                      onClick={confirmSelectedDriverOnMobile}
                    >
                      {(() => {
                        const ttc = computeDriverPriceTtc(paltoSelectedDriver);
                        const priceLabel =
                          ttc !== null
                            ? `${ttc.toFixed(2).replace('.', ',')} €`
                            : paltoSelectedDriver.price;
                        return `${t('search.chooseDriverCta')} · ${priceLabel}`;
                      })()}
                    </Button>
                  </>
                ) : (
                  <p className="palto-go-driver-confirm-bar__hint">{t('search.chooseDriverHint')}</p>
                )}
              </div>
            ) : null
          )}
          {mountGoRideOverlay(
            isRecapPopupOpen ? (
            <div
              className={
                'palto-ride-recap-modal' + (isMobileGoViewport ? ' palto-ride-recap-modal--mobile' : '')
              }
              role="dialog"
              aria-modal="true"
              aria-label="Recap commande"
            >
              <div className="palto-ride-recap-modal__backdrop" onClick={closeRecapPopup} />
              <div className="palto-ride-recap-modal__content" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="palto-ride-recap-modal__close"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={closeRecapPopup}
                  aria-label="Fermer"
                >
                  ×
                </button>
                <h2 className="palto-ride-card__title">Recap commande</h2>
                <div className="palto-ride-recap">
                  <div className="palto-ride-recap__section">
                    <p className="palto-ride-recap-row">
                      <span>Prise en charge</span>
                      <strong>{paltoRecapPickupText}</strong>
                    </p>
                    <p className="palto-ride-recap__coords">{paltoRecapCoordsText}</p>
                    <p className="palto-ride-recap-row">
                      <span>Temps estime du trajet</span>
                      <strong>{paltoRecapDurationText}</strong>
                    </p>
                    <p className="palto-ride-recap-row">
                      <span>Temps en voiture a cause des bouchons</span>
                      <strong>{paltoRecapTrafficDurationText}</strong>
                    </p>
                    {paltoRouteDistanceKm ? (
                      <p className="palto-ride-recap-row">
                        <span>Distance estimee</span>
                        <strong>{paltoRouteDistanceKm.toFixed(2)} km</strong>
                      </p>
                    ) : null}
                    {paltoRouteDeniveleEstimateM !== null ? (
                      <p className="palto-ride-recap-row">
                        <span>Denivele estime</span>
                        <strong>+{paltoRouteDeniveleEstimateM} m</strong>
                      </p>
                    ) : null}
                  </div>
                  <hr className="palto-ride-recap-separator" />
                  <div className="palto-ride-recap__section">
                    <p className="palto-ride-recap-row">
                      <span>Chauffeur selectionne</span>
                      <strong>
                        {paltoPickupTiming === 'later'
                          ? 'A confirmer par un chauffeur'
                          : paltoSelectedDriver
                            ? paltoSelectedDriver.name
                            : 'Aucun'}
                      </strong>
                    </p>
                    <p className="palto-ride-recap-row">
                      <span>Vehicule</span>
                      <strong>
                        {paltoPickupTiming === 'later'
                          ? '—'
                          : paltoSelectedDriver
                            ? paltoSelectedDriver.moto
                            : '-'}
                      </strong>
                    </p>
                  </div>
                  <hr className="palto-ride-recap-separator" />
                  <div className="palto-ride-recap__section">
                    {paltoPricing ? (
                      <>
                        <p className="palto-ride-recap-price-row">
                          <span>Montant HT:</span>
                          <strong>{paltoPricing.ht} EUR</strong>
                        </p>
                        <p className="palto-ride-recap-price-row">
                          <span>TVA (20%):</span>
                          <strong>{paltoPricing.tva} EUR</strong>
                        </p>
                        <p className="palto-ride-recap-price-row palto-ride-recap-price-row--total">
                          <span>Total TTC:</span>
                          <strong>{paltoPricing.ttc} EUR</strong>
                        </p>
                      </>
                    ) : paltoRouteDistanceKm != null ? (
                      <p className="palto-ride-recap-price-row palto-ride-recap-price-row--total">
                        <span>Total estime TTC:</span>
                        <strong>
                          {Math.max(
                            6,
                            (effectiveBaseFareEur + paltoRouteDistanceKm * effectivePricePerKmEur) *
                              effectiveDriverPricingMultiplier *
                              (1 + (isNightRide ? effectiveNightSurchargeRate : 0))
                          ).toFixed(2)}{' '}
                          EUR
                        </strong>
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="palto-ride-recap-modal__actions">
                  <Button
                    variant="primary"
                    type="button"
                    className="palto-ride-search-btn palto-ride-recap-modal__cta"
                    disabled={
                      (paltoPickupTiming === 'now' && !paltoSelectedDriver) ||
                      (paltoPickupTiming === 'later' && !paltoPickupDateTime.trim())
                    }
                    onClick={handleRecapModalConfirmOrder}
                  >
                    {paltoPickupTiming === 'later'
                      ? t('search.bookingRecapConfirmScheduled')
                      : 'Commandez la course'}
                  </Button>
                </div>
              </div>
            </div>
            ) : null
          )}
          {mountGoRideOverlay(
            isCheckoutPopupOpen ? (
            <div
              className={
                'palto-ride-recap-modal' + (isMobileGoViewport ? ' palto-ride-recap-modal--mobile' : '')
              }
              role="dialog"
              aria-modal="true"
              aria-label="Checkout commande"
            >
              <div className="palto-ride-recap-modal__backdrop" onClick={closeCheckoutPopup} />
              <div className="palto-ride-recap-modal__content" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="palto-ride-recap-modal__close"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={closeCheckoutPopup}
                  aria-label="Fermer"
                >
                  ×
                </button>
                <h2 className="palto-ride-card__title">Checkout commande</h2>
                <div className="palto-checkout">
                  <p className="palto-checkout__lead">
                    Verifiez les informations de la course avant confirmation.
                  </p>
                  <div className="palto-checkout__summary">
                    <p>
                      <span>Chauffeur :</span>{' '}
                      <strong>
                        {paltoPickupTiming === 'later'
                          ? 'A confirmer par un chauffeur'
                          : paltoSelectedDriver
                            ? paltoSelectedDriver.name
                            : '—'}
                      </strong>
                    </p>
                    <p>
                      <span>Vehicule :</span>{' '}
                      <strong>
                        {paltoPickupTiming === 'later'
                          ? '—'
                          : paltoSelectedDriver
                            ? paltoSelectedDriver.moto
                            : '—'}
                      </strong>
                    </p>
                    {(() => {
                      let driverEur = paltoPricing ? Number.parseFloat(paltoPricing.ttc) : NaN
                      if (!Number.isFinite(driverEur) || driverEur <= 0) {
                        const km = paltoRouteDistanceKm
                        if (km != null && Number.isFinite(km)) {
                          driverEur = Math.max(
                            6,
                            (effectiveBaseFareEur + km * effectivePricePerKmEur) *
                              effectiveDriverPricingMultiplier *
                              (1 + (isNightRide ? effectiveNightSurchargeRate : 0))
                          )
                        }
                      }
                      const breakdown =
                        Number.isFinite(driverEur) && driverEur > 0
                          ? formatRideTotalWithPaltoFee(driverEur)
                          : null
                      return breakdown ? (
                        <>
                          <p>
                            <span>Tarif chauffeur (TTC) :</span>{' '}
                            <strong>{breakdown.driverEur.toFixed(2)} EUR</strong>
                          </p>
                          <p>
                            <span>Commission Palto :</span>{' '}
                            <strong>{breakdown.paltoFeeEur.toFixed(2)} EUR</strong>
                          </p>
                          <p>
                            <span>Total autorise sur la carte :</span>{' '}
                            <strong>{breakdown.totalEur.toFixed(2)} EUR</strong>
                          </p>
                        </>
                      ) : (
                        <p>
                          <span>Total estime TTC :</span> <strong>—</strong>
                        </p>
                      )
                    })()}
                    <p className="palto-checkout__lead">
                      {stripeCheckoutEnabled()
                        ? `Autorisation bancaire (sans debit immediat). Palto preleve ${PALTO_PLATFORM_FEE_EUR} EUR + le tarif chauffeur a la fin de course. Annulation rapide : aucun frais.`
                        : 'Paiement en ligne non configure : reglement prevu directement avec le chauffeur.'}
                    </p>
                  </div>

                  <label className="palto-checkout__field">
                    <span>Nom (optionnel)</span>
                    <input
                      type="text"
                      className="palto-ride-input"
                      value={checkoutCustomerName}
                      onChange={(e) => setCheckoutCustomerName(e.target.value)}
                      placeholder="Votre nom"
                      autoComplete="name"
                    />
                  </label>

                  <label className="palto-checkout__field">
                    <span>Email pour le recapitulatif</span>
                    <input
                      type="email"
                      className="palto-ride-input"
                      value={checkoutCustomerEmail}
                      onChange={(e) => setCheckoutCustomerEmail(e.target.value)}
                      placeholder="vous@example.com"
                      autoComplete="email"
                    />
                  </label>
                  <label className="palto-checkout__field">
                    <span>Commentaire pour le chauffeur (optionnel)</span>
                    <textarea
                      className="palto-ride-input"
                      value={checkoutClientComment}
                      onChange={(e) => setCheckoutClientComment(e.target.value)}
                      placeholder="Ex: l entree de mon batiment est derriere le batiment de la poste."
                      maxLength={600}
                      rows={3}
                    />
                  </label>

                  {checkoutStripeClientSecret && stripePublishableKey() ? (
                    <PaltoStripePaymentForm
                      publishableKey={stripePublishableKey()!}
                      clientSecret={checkoutStripeClientSecret}
                      submitLabel="Autoriser le paiement sur la carte"
                      onSuccess={() => void finishCheckoutAfterPayment()}
                      onError={(msg) => setCheckoutError(msg)}
                    />
                  ) : null}

                  {checkoutError ? <p className="palto-checkout__error">{checkoutError}</p> : null}
                  {checkoutSuccessMessage ? (
                    <p className="palto-checkout__success">{checkoutSuccessMessage}</p>
                  ) : null}
                </div>
                <div className="palto-ride-recap-modal__actions">
                  {!checkoutStripeClientSecret ? (
                    <Button
                      variant="primary"
                      type="button"
                      className="palto-ride-search-btn palto-ride-recap-modal__cta"
                      disabled={
                        checkoutSubmitting ||
                        Boolean(checkoutSuccessMessage) ||
                        (paltoPickupTiming === 'now' && !paltoSelectedDriver)
                      }
                      onClick={() => void handleCheckoutConfirm()}
                    >
                      {checkoutSubmitting
                        ? 'Preparation…'
                        : stripeCheckoutEnabled()
                          ? 'Continuer vers le paiement'
                          : paltoPickupTiming === 'later'
                            ? 'Finaliser la reservation'
                            : 'Confirmer la commande'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            ) : null
          )}
        </div>
        </>
        ) : (
        <>

        {/* 1. Header (Figma: titre → badges) */}
        {/* Bloc unique Figma : titre, badges + Contexte du projet, gap 40px */}
        <div className="project-top-block">
          <div className="project-header-section">
            <h1 className="project-main-title">
              <BlurText text={projectData.title} className="project-main-title" />
            </h1>
            <div className="project-badges">
              {projectCategory && projectCategory !== '2025' && <span className="project-badge">{projectCategory}</span>}
              {projectData.badges?.filter(badge => {
                const categoryBadges = ['Application', 'Site Web', 'Navigation', 'Logo', 'Motion', 'PLV'];
                return !categoryBadges.includes(badge);
              }).map((badge, index) => (
                <span key={index} className="project-badge">{badge}</span>
              ))}
            </div>
            {projectData.subtitle && <p className="project-subtitle">{isEn && projectData.translations?.en?.subtitle ? projectData.translations.en.subtitle : projectData.subtitle}</p>}
            {projectData.projectUrl && (
              <a
                href={projectData.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="project-external-link"
                onClick={() => trackEvent('click', 'project_external', projectData.title)}
              >
                {t('project.viewProject')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </a>
            )}
          </div>

          {/* Contexte du projet (même bloc, gap 40px) */}
          {(projectData.objectifs || projectData.teamNote) && (
            <motion.section id="context" className="project-section context-project-section" {...scrollSectionProps}>
              <div className="context-project-wrapper">
                <h2 className="section-title">{t('project.context')}</h2>
                <div className="context-project-grid">
                <div className="context-project-left">
                  <div className="context-intro">
                    <p>{isEn && projectData.translations?.en?.summary ? projectData.translations.en.summary : projectData.summary}</p>
                  </div>
                  {(projectData.objectifs?.length ?? 0) > 0 && (
                    <div className="context-objectifs">
                      <h3 className="context-subtitle">{t('project.objectives')}</h3>
                      <ol className="context-objectifs-list">
                        {(isEn && projectData.translations?.en?.objectifs ? projectData.translations.en.objectifs : projectData.objectifs!).map((obj, i) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
                <div className="context-project-right">
                  <h3 className="context-equipe-title">{t('project.team')}</h3>
                  <table className="figma-equipe-table">
                    <thead>
                      <tr>
                        <th>{t('project.role')}</th>
                        <th>{t('project.name')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isEn && projectData.translations?.en?.team ? projectData.translations.en.team : projectData.team).map((member, index) => {
                        const parts = member.includes(',') ? member.split(',').map(s => s.trim()) : [member, ''];
                        const name = parts[0] ?? '';
                        const role = parts[1] ?? '';
                        return (
                          <tr key={index}>
                            <td>{role}</td>
                            <td>{name}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {projectData.teamNote && (
                    <div className="context-my-role">
                      <h3 className="context-subtitle">{t('project.myRole')}</h3>
                      <p className="context-team-note">{isEn && projectData.translations?.en?.teamNote ? projectData.translations.en.teamNote : projectData.teamNote}</p>
                    </div>
                  )}
                </div>
                </div>
              </div>
            </motion.section>
          )}
        </div>

        {/* 1.5. Sommaire */}
        <motion.section className="project-section table-of-contents-section" {...scrollSectionProps}>
          <div ref={tocRef} className="section-card">
            <nav className="table-of-contents">
              <ul className="toc-list">
                <li><a href="#introduction" className="toc-link">{t('project.tocSummary')}</a></li>
                <li><a href="#team" className="toc-link">{t('project.tocTeam')}</a></li>
                {projectData.approach && (
                  <li><a href="#approach" className="toc-link">{projectData.approach.title}</a></li>
                )}
                <li><a href="#case-studie" className="toc-link">{t('project.caseStudie')}</a></li>
                {projectData.wireframes && (
                  <li><a href="#wireframes" className="toc-link">{t('project.ideation')}</a></li>
                )}
                {projectData.designSystem && (
                  <li><a href="#design-system" className="toc-link">{projectData.designSystem.colorPalette.title}</a></li>
                )}
                <li><a href="#implementation" className="toc-link">{t('project.implementation')}</a></li>
                <li><a href="#results" className="toc-link">{t('project.results')}</a></li>
              </ul>
            </nav>
          </div>
        </motion.section>

        {/* 2. Résumé / Introduction (masqué si Contexte du projet affiché) */}
        {!projectData.objectifs && !projectData.teamNote && (
        <motion.section id="introduction" className="project-section intro-section" {...scrollSectionProps}>
          <div className="section-card intro-metadata-container">
            {introParagraphs.map((part, index) => (
              <div
                key={index}
                className={
                  introParagraphs.length === 1
                    ? 'intro-text-block intro-text-block--full'
                    : `intro-text-block ${index === 0 ? 'intro-text-primary' : 'intro-text-secondary'}`
                }
              >
                <p className="intro-text">{part}</p>
              </div>
            ))}
          </div>
        </motion.section>
        )}

        {/* 2b. Problématique / Solution (gauche) + Matrice de positionnement (droite) */}
        {(projectData.problematique || projectData.solution || projectData.positionnementMatrix) && (
          <motion.section id="problematique" className="project-section problematique-section" {...scrollSectionProps}>
            <div className="problematique-solution-grid">
              <div className="problematique-solution-texts">
                <div className="problematique-block">
                  <h2 className="section-title">{t('project.problematique')}</h2>
                  <p className="problematique-text">{isEn && projectData.translations?.en?.problematique ? projectData.translations.en.problematique : projectData.problematique}</p>
                </div>
                <div className="solution-block">
                  <h2 className="section-title">{t('project.solution')}</h2>
                  <p className="solution-text">{isEn && projectData.translations?.en?.solution ? projectData.translations.en.solution : projectData.solution}</p>
                </div>
              </div>
              {projectData.positionnementMatrix && (
                <div className="positionnement-matrix-wrapper">
                  <PositionnementMatrixChart
                    data={isEn && projectData.translations?.en?.positionnementMatrix ? projectData.translations.en.positionnementMatrix : projectData.positionnementMatrix}
                    className="positionnement-matrix-chart"
                    scrollRootRef={pageRef}
                  />
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* 3. L'équipe projet (Figma 96-98) */}
        {!projectData.teamNote && (
        <motion.section id="team" className="project-section team-section" {...scrollSectionProps}>
          <div className="section-card">
            <h2 className="section-title">{t('project.team')}</h2>
            <table className="figma-equipe-table">
              <thead>
                <tr>
                    <th>{t('project.role')}</th>
                    <th>{t('project.name')}</th>
                </tr>
              </thead>
              <tbody>
                {(isEn && projectData.translations?.en?.team ? projectData.translations.en.team : projectData.team).map((member, index) => {
                  const parts = member.includes(',') ? member.split(',').map(s => s.trim()) : [member, ''];
                  const name = parts[0] ?? '';
                  const role = parts[1] ?? '';
                  return (
                    <tr key={index}>
                      <td>{role}</td>
                      <td>{name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.section>
        )}

        {/* 4. Processus détaillé – 4 cartes (Figma) */}
        {projectData.processReunions && projectData.processReunions.length > 0 && (
          <motion.section id="processus" className="project-section processus-cards-section" {...scrollSectionProps}>
            <h2 className="section-title">{t('project.process')}</h2>
            <p className="processus-intro">{t('project.processIntro')}</p>
            <div className="processus-cards-wrapper">
              <Swiper
                modules={[Pagination]}
                spaceBetween={24}
                slidesPerView="auto"
                centeredSlides={false}
                pagination={{ clickable: true }}
                className="processus-cards-swiper"
                onSwiper={(swiper) => {
                  const slideWidthPx = 406;
                  const applySlideWidth = () => {
                    swiper.slides.forEach((slide) => {
                      const el = slide as HTMLElement;
                      el.style.width = `${slideWidthPx}px`;
                      el.style.minWidth = `${slideWidthPx}px`;
                    });
                    swiper.update();
                  };
                  applySlideWidth();
                  swiper.on('resize', applySlideWidth);
                }}
              >
                {(isEn && projectData.translations?.en?.processReunions ? projectData.translations.en.processReunions : projectData.processReunions).map((reunion, index) => (
                  <SwiperSlide key={index} style={{ width: 406, minWidth: 406 }}>
                    <div className="processus-card">
                      <div className="processus-card-content">
                        <span className="processus-card-label">{reunion.label}</span>
                        <h3 className="processus-card-title">{reunion.title}</h3>
                        {reunion.subtitle && (
                          <p className="processus-card-subtitle">{reunion.subtitle}</p>
                        )}
                        <p className="processus-card-desc">{reunion.description}</p>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
            <p className="processus-summary">{t('project.processSummary')}</p>
          </motion.section>
        )}

        {/* === Contenu Figma 10-84 (après processus) === */}

        {/* Audit */}
        <motion.section id="audit" className="project-section figma-audit-section" {...scrollSectionProps}>
          <h2 className="section-title">{t('project.audit')}</h2>
          <p className="figma-audit-subtitle">
            {isEn ? 'Competitive benchmarking' : 'Benchmark concurrentiel'}
          </p>
          <div className="figma-two-cols">
            <p className="figma-lead">
              {isEn
                ? projectData.translations?.en?.auditLead ?? t('project.auditLead')
                : projectData.auditLead ?? t('project.auditLead')}
            </p>
            <p className="figma-body">
              {isEn
                ? projectData.translations?.en?.auditBody ?? t('project.auditBody')
                : projectData.auditBody ?? t('project.auditBody')}
            </p>
          </div>
          {/* Carrousel puis texte de synthèse : empilement explicite sous l’intro à deux colonnes */}
          <div
            className="figma-audit-carousel-stack"
            role="group"
            aria-label={isEn ? 'Audit carousel and summary' : 'Carrousel audit et synthèse'}
          >
            <div className="figma-audit-carousel-wrapper">
              <Swiper
                modules={[Pagination]}
                spaceBetween={24}
                slidesPerView="auto"
                centeredSlides={false}
                pagination={{ clickable: true }}
                className="figma-audit-carousel figma-audit-carousel--palto"
                onSwiper={(swiper) => {
                  const idealWidth = 506.667;
                  const applySlideWidth = () => {
                    const w = Math.min(idealWidth, Math.max(0, swiper.width - 24));
                    swiper.slides.forEach((slide) => {
                      const el = slide as HTMLElement;
                      el.style.width = `${w}px`;
                      el.style.minWidth = `${w}px`;
                    });
                    swiper.update();
                  };
                  applySlideWidth();
                  swiper.on('resize', applySlideWidth);
                }}
              >
                {auditSectionCarouselImages.map((img, index) => (
                  <SwiperSlide key={index}>
                    <div
                      className={
                        index === 0 ? 'figma-audit-slide figma-audit-slide--palto-blue' : 'figma-audit-slide'
                      }
                    >
                      <img src={img.src} alt={t(`project.auditAlt${index + 1}`)} loading="eager" decoding="async" />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
            <div className="figma-two-cols figma-two-cols--audit-after-carousel">
              <p className="figma-lead">
                {isEn
                  ? projectData.translations?.en?.auditLeadAfterCarousel ??
                    projectData.translations?.en?.auditLead ??
                    t('project.auditLead')
                  : projectData.auditLeadAfterCarousel ?? projectData.auditLead ?? t('project.auditLead')}
              </p>
              <p className="figma-body">
                {isEn
                  ? projectData.translations?.en?.auditBodyAfterCarousel ??
                    projectData.translations?.en?.auditBody ??
                    t('project.auditBody')
                  : projectData.auditBodyAfterCarousel ?? projectData.auditBody ?? t('project.auditBody')}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Architecture & Flux */}
        <motion.section id="architecture" className="project-section figma-architecture-section" {...scrollSectionProps}>
          <h2 className="section-title">{t('project.architecture')}</h2>
          <div className="figma-two-cols">
            <p className="figma-lead">
              {isEn && projectData.translations?.en?.archLead
                ? projectData.translations.en.archLead
                : projectData.archLead ?? t('project.archLead')}
            </p>
            <p className="figma-body">{t('project.archBody')}</p>
          </div>
          <div className="figma-userflow userflow-arbre-style">
            {userFlowTreeData ? (
              <div className="skill-tree-wrapper" ref={userflowTreeWrapperRef}>
                <div ref={userflowTreeContainerRef} id="userflow-tree" className="skill-tree-container">
                  <TreeNode
                    data={userFlowTreeData}
                    selectedNodes={selectedNodes}
                    onNodeClick={handleUserflowNodeClick}
                    variant="userflow"
                  />
                </div>
              </div>
            ) : (
              <img src={PLACEHOLDER_MEDIA} alt="User flow" className="figma-userflow-img" />
            )}
          </div>

          {/* Palto : Design system — texte + bento (palette & typéchelle intégrés aux tuiles) */}
          {projectData.designSystem && (
            <>
              <div id="design-system" className="figma-audit-palto-duplicate">
                <h3 className="figma-subsection-title">{t('project.designSystem')}</h3>
                <div className="figma-two-cols">
                  <p className="figma-lead whitespace-pre-line">
                    {isEn && projectData.translations?.en?.architectureDsDuplicateLead
                      ? projectData.translations.en.architectureDsDuplicateLead
                      : projectData.architectureDsDuplicateLead ?? ''}
                  </p>
                  <p className="figma-body whitespace-pre-line">
                    {isEn && projectData.translations?.en?.architectureDsDuplicateBody
                      ? projectData.translations.en.architectureDsDuplicateBody
                      : projectData.architectureDsDuplicateBody ?? ''}
                  </p>
                </div>
                <div className="palto-ds-magic-bento-wrap">
                  <MagicBento
                    className="palto-ds-magic-bento"
                    imageItems={paltoDsBentoItems}
                    glowColor="241, 88, 42"
                  />
                </div>
              </div>

              <div className="figma-audit-palto-duplicate figma-audit-palto-duplicate--stacked">
                <h3 className="figma-subsection-title">{t('project.conception')}</h3>
                <p className="figma-lead figma-lead--palto-conception-stacked whitespace-pre-line">
                  {isEn && projectData.translations?.en?.conceptionDuplicateLead
                    ? projectData.translations.en.conceptionDuplicateLead
                    : projectData.conceptionDuplicateLead ?? ''}
                </p>
                <div className="palto-conception-swap-copy-row">
                  <div className="palto-ds-stacked-body-col palto-ds-stacked-body-col--swap-row">
                    {paltoConceptionPivotH3 && (
                      <h3 className="figma-ds-pivot-h3">{paltoConceptionPivotH3}</h3>
                    )}
                    <p className="figma-body whitespace-pre-line">{paltoConceptionBody}</p>
                  </div>
                  <div className="figma-audit-carousel-wrapper palto-conception-gallery-wrap palto-conception-gallery-wrap--swap-copy-row">
                    <div
                      className="palto-conception-gallery palto-conception-gallery--hidden"
                      role="region"
                      aria-label={t('project.conception')}
                      style={
                        {
                          '--palto-conception-n': paltoConceptionConceptGroups.length,
                          '--palto-conception-images-n': paltoConceptionCurrentSlides.length,
                          ...(paltoConceptionSideMaxPx != null
                            ? { '--palto-conception-side-max-h': `${paltoConceptionSideMaxPx}px` }
                            : {}),
                        } as React.CSSProperties
                      }
                    >
                      <div
                        className="palto-conception-concept-triggers"
                        role="group"
                        aria-label={t('project.conceptionGraduationGroup')}
                      >
                      {paltoConceptionConceptGroups.map((_, conceptIdx) => (
                        <button
                          key={conceptIdx}
                          type="button"
                          className={`palto-conception-concept-item${
                            conceptionSafeConceptIdx === conceptIdx
                              ? ' palto-conception-concept-item--active'
                              : ''
                          }`}
                          aria-pressed={conceptionSafeConceptIdx === conceptIdx}
                          aria-controls="palto-conception-main"
                          onClick={() => {
                            setPaltoConceptionConceptIndex(conceptIdx);
                            setPaltoConceptionSlideIndex(0);
                          }}
                        >
                          <span className="palto-conception-concept-item__icon">
                            <PaltoConceptionGraduationIcon />
                          </span>
                          <span className="palto-conception-concept-item__label">
                            {t('project.conceptGraduationLabel', { n: conceptIdx + 1 })}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="palto-conception-stage">
                      <div
                        ref={paltoConceptionStageInnerRef}
                        className="palto-conception-stage-inner"
                        id="palto-conception-main"
                      >
                        <img
                          src={paltoConceptionCurrentSlides[conceptionSafeSlideIdx]?.src}
                          alt={t('project.conceptionStageAlt', {
                            concept: conceptionSafeConceptIdx + 1,
                            slide: conceptionSafeSlideIdx + 1,
                          })}
                          loading="lazy"
                          decoding="async"
                          onLoad={() => {
                            const el = paltoConceptionStageInnerRef.current;
                            if (el) {
                              const h = el.getBoundingClientRect().height;
                              if (h > 0) setPaltoConceptionSideMaxPx(Math.round(h));
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="palto-conception-thumbs-wrap">
                      <div
                        className="palto-conception-thumbs"
                        role="tablist"
                        aria-label={t('project.conceptionVerticalCarousel')}
                      >
                        {paltoConceptionCurrentSlides.map((img, index) => (
                          <button
                            key={`${conceptionSafeConceptIdx}-${index}`}
                            type="button"
                            role="tab"
                            id={`palto-conception-thumb-${conceptionSafeConceptIdx}-${index}`}
                            tabIndex={paltoConceptionSlideIndex === index ? 0 : -1}
                            aria-selected={paltoConceptionSlideIndex === index}
                            aria-controls="palto-conception-main"
                            className={`palto-conception-thumb${paltoConceptionSlideIndex === index ? ' palto-conception-thumb--active' : ''}`}
                            onClick={() => setPaltoConceptionSlideIndex(index)}
                          >
                            <img src={img.src} alt="" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {GO_CARD_SWAP_SLIDE_SRCS.length >= 2 && (
                    <div
                      className="palto-conception-card-swap-wrap"
                      role="region"
                      aria-label={t('project.cardSwapAria')}
                    >
                      <CardSwap
                        width="min(100%, 560px)"
                        height={400}
                        cardDistance={56}
                        verticalDistance={68}
                        dropDistance={320}
                        delay={8000}
                        pauseOnHover
                        skewAmount={0}
                        easing="elastic"
                        containerClassName="palto-card-swap-aspect relative mx-auto perspective-[900px] overflow-visible max-[480px]:scale-[0.88]"
                      >
                        {GO_CARD_SWAP_SLIDE_SRCS.map((src, idx) => (
                          <Card
                            key={`palto-card-swap-${idx}`}
                            customClass="!border-[#b2aaaa] !bg-[#EAEAE6] shadow-md box-border overflow-hidden p-2"
                          >
                            <img
                              src={src}
                              alt=""
                              className="palto-card-swap-img h-full w-full min-h-0 object-contain object-top"
                              loading="lazy"
                              decoding="async"
                            />
                          </Card>
                        ))}
                      </CardSwap>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.section>

        {/* Bloc light-mode : logo Palto (hors <section>) collé visuellement juste au-dessus de #light-mode */}
        <div className="figma-light-mode-group">
          <PaltoH1HandwritingLogo className="figma-light-mode-h1-logo" scrollContainerRef={pageRef} />
          {/* Suite aux tests de contraste */}
          <motion.section id="light-mode" className="project-section figma-light-mode-section" {...scrollSectionProps}>
            <ScrollStack
              scrollRootRef={pageRef}
              className="figma-light-mode-scroll-stack"
              centerStackVertically
              smoothFactor={0.22}
              itemDistance={72}
              itemStackDistance={32}
              stackPosition="22%"
              baseScale={0.82}
              itemScale={0.035}
            >
              <ScrollStackItem itemClassName="figma-light-mode-scroll-stack-card">
                <div className="figma-light-mode-img-frame figma-light-mode-img-frame--stack-item">
                  <img
                    src={paltoLightModeMaine}
                    alt={t('project.contrastImageAlt')}
                    className="figma-light-mode-zoom-img"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </ScrollStackItem>
              <ScrollStackItem itemClassName="figma-light-mode-scroll-stack-card">
                <div className="figma-light-mode-img-frame figma-light-mode-img-frame--stack-item">
                  <img
                    src={paltoLightModeSinglePage}
                    alt={t('project.lightModeSinglePageAlt')}
                    className="figma-light-mode-zoom-img figma-light-mode-extra-img"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </ScrollStackItem>
              <ScrollStackItem itemClassName="figma-light-mode-scroll-stack-card">
                <div className="figma-light-mode-img-frame figma-light-mode-img-frame--stack-item">
                  <img
                    src={paltoLightModeSetp1}
                    alt={t('project.lightModeSetp1Alt')}
                    className="figma-light-mode-zoom-img figma-light-mode-extra-img"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </ScrollStackItem>
            </ScrollStack>
          </motion.section>
        </div>

        <ContactModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
        />
        </>
        )}
        </div>
      </motion.div>

      {/* Bouton Contact fixe en bas d'écran, visible au scroll (même style que close/arrows) */}
      {(liftScroll + contentScrollTop) > 150 && (
        <div className="single-project-contact-fab-wrap">
          <button
            type="button"
            className="single-project-contact-fab"
            onClick={() => {
              trackEvent('click', 'project_cta', 'contact_fab');
              setShowContactModal(true);
            }}
            aria-label={t('project.contactMe')}
          >
            {t('project.contactMe')}
          </button>
        </div>
      )}
    </>
  );
};

export default SingleProjectNew;
