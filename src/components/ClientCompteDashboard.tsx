/**
 * Page « Compte » utilisateur : même shell UI que le Dashboard chauffeur
 * (sidebar, dashboard-main, dashboard-content, Dashboard.css), sans vues chauffeur.
 */
import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from 'react';
import {
  User,
  Pencil,
  PanelLeft,
  Menu,
  ArrowLeft,
  House,
  Briefcase,
  Plane,
  LayoutDashboard,
  IdCard,
  Route,
  MapPin,
  Plus,
  Trash2,
  Shield,
  FileLock,
  Wallet,
  Settings,
  CircleHelp,
  Phone,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { trackEvent } from '../services/googleAnalyticsTracking';
import { fileToCompressedProfilePhotoDataUrl } from '../utils/clientProfilePhotoDataUrl';
import { useClientHomeTopbarRides } from '../hooks/useClientHomeTopbarRides';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import './Dashboard.css';
import './Dashboard.app-theme.css';
import './ClientCompteDashboard.css';
import {
  buildInternationalPhone,
  isValidNationalPhone,
  normalizeNationalPhone,
  parseStoredPhone,
  PHONE_COUNTRIES,
  type SupportedPhoneCountry,
} from '../services/phoneNumber';
import {
  loadClientAccountSnapshot,
  saveClientAccountSnapshot,
  type ClientAccountSnapshot,
  type ClientPreferredPayment,
} from '../constants/clientAccountStorage';
import {
  loadClientSecuritySnapshot,
  migrateLegacySecurityIfOwnedByEmail,
  saveClientSecuritySnapshot,
  type ClientSecuritySnapshot,
} from '../constants/clientAccountSecurityStorage';
import {
  formatWalletEUR,
  loadClientWalletSnapshot,
  migrateLegacyWalletIfOwnedByEmail,
  saveClientWalletSnapshot,
} from '../constants/clientWalletStorage';
import {
  FONT_SCALE_PERCENT_MAX,
  FONT_SCALE_PERCENT_MIN,
  applyAppThemeToDocument,
  applyUserFontScaleToDocument,
  clampFontScalePercent,
  loadClientAppPreferences,
  saveClientAppPreferences,
  type AppTheme,
  type ClientAppPreferencesSnapshot,
} from '../constants/clientAppPreferencesStorage';
import {
  createEmptySavedPlaceExtra,
  loadClientSavedPlaces,
  migrateLegacySavedPlacesIfOwnedByEmail,
  saveClientSavedPlaces,
  type ClientSavedPlacesSnapshot,
} from '../constants/clientSavedPlacesStorage';
import ClientComptePlaceAddressField from './ClientComptePlaceAddressField';
import ClientComptePlaceMapModal, { type ClientCompteMapPickResult } from './ClientComptePlaceMapModal';
import ClientCompteRideMeetDriver from './ClientCompteRideMeetDriver';
import ClientCompteRideEndCash from './ClientCompteRideEndCash';
import type { Language } from '../contexts/LanguageContext';
import {
  CHAUFFEUR_ORG_CHANGED_EVENT,
  CHAUFFEUR_ORG_STORAGE_KEY,
  loadChauffeurOrg,
} from '../constants/chauffeurOrganizationStorage';
import { simplifyAddressDisplay } from '../services/addressDisplay';
import { saveGoPrefill } from '../constants/goPrefillStorage';
import {
  loadClientPaymentMethods,
  saveClientPaymentMethod,
  type ClientSavedPaymentMethod,
} from '../constants/clientPaymentMethodsStorage';
import { DEFAULT_HERO_DEPARTMENT_ID } from '../data/heroDepartments';
import { stripeCheckoutEnabled, stripePublishableKey } from '../constants/featureFlags';
import PaltoStripeSetupForm from './PaltoStripeSetupForm';
import PaltoStripePaymentForm from './PaltoStripePaymentForm';
import PaltoStripeTestCardHint from './PaltoStripeTestCardHint';
import {
  clientStripeApiEnabled,
  confirmClientWalletTopUp,
  createClientSetupIntent,
  createClientWalletTopUp,
  detachClientPaymentMethod,
  updateClientPaymentMethodBilling,
  fetchClientStripePaymentMethods,
  fetchClientWalletBalanceCents,
  type ClientStripePaymentMethod,
  type ClientStripePaymentMethodBilling,
} from '../services/clientStripeApi';
import {
  getCurrentClientUser,
  isClientAuthenticated,
  logoutClientToHome,
  PALTO_CLIENT_SESSION_CHANGED_EVENT,
} from '../services/authService';
import {
  buildClientLiveMeetRideFromRideItem,
  saveClientLiveMeetRideModel,
} from '../constants/clientLiveMeetRide';
import { clientDriverDisplayFromRideItem } from '../lib/clientDriverDisplay';
import { cancelClientRide, clientRidesApiEnabled, fetchClientRides, type ClientRideItem } from '../services/clientRidesApi';
import { scheduleClientProfilePush, syncClientProfileWithServer } from '../services/clientProfileSync';

type ClientPlaceMapTarget =
  | { kind: 'domicile' }
  | { kind: 'travail' }
  | { kind: 'extra'; id: string };

function pickInitialMarkerForMap(
  target: ClientPlaceMapTarget,
  draft: ClientSavedPlacesSnapshot
): { lng: number; lat: number } | null {
  if (target.kind === 'domicile') return draft.domicileCoords;
  if (target.kind === 'travail') return draft.travailCoords;
  return draft.extras.find((e) => e.id === target.id)?.coords ?? null;
}

type ClientRideFlowKind = 'meet_driver' | 'end_cash';

type ClientAccountRideRow = {
  id: string;
  rawStatus: string;
  route: string;
  date: string;
  dateEn?: string;
  status: string;
  statusEn?: string;
  pickupLabel: string;
  dropoffLabel: string;
  departTime: string;
  arriveTime: string;
  durationMin: number;
  distanceKm: number;
  priceEur: number;
  driverName: string;
  vehicleLabel: string;
  paymentMethod: string;
  paymentMethodEn?: string;
  reference: string;
  flow?: ClientRideFlowKind | null;
  licensePlate?: string;
  vehicleColor?: string;
  driverPhone?: string;
  driverProfilePhotoUrl?: string;
  vehicleType?: string;
  vehicleModel?: string;
  /** Prise en charge (carte « retrouver le chauffeur ») */
  meetPickupCoords?: { lng: number; lat: number };
  /** Position initiale du chauffeur (animation vers la prise en charge si pas de temps réel) */
  meetDriverCoordsInitial?: { lng: number; lat: number };
};

function rideRowStatusLabel(r: ClientAccountRideRow, lang: Language): string {
  if (lang === 'en' && r.statusEn) return r.statusEn;
  return r.status;
}

function rideStatusTone(status: string): 'pending' | 'active' | 'completed' | 'cancelled' {
  const value = status.toLowerCase();
  if (value.includes('annul') || value.includes('cancel')) return 'cancelled';
  if (value.includes('termin') || value.includes('completed')) return 'completed';
  if (value.includes('cours') || value.includes('progress') || value.includes('accept')) return 'active';
  return 'pending';
}

function rideRowDateLabel(r: ClientAccountRideRow, lang: Language): string {
  if (lang === 'en' && r.dateEn) return r.dateEn;
  return r.date;
}

function rideRowPaymentLabel(r: ClientAccountRideRow, lang: Language): string {
  if (lang === 'en' && r.paymentMethodEn) return r.paymentMethodEn;
  return r.paymentMethod;
}

function clientRideDurationMinutes(ride: ClientRideItem): number {
  const s = ride.startedAt?.trim();
  const c = ride.completedAt?.trim();
  if (!s || !c) return 0;
  const a = Date.parse(s);
  const b = Date.parse(c);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.max(1, Math.round((b - a) / 60000));
}

function formatStripeCardBrand(brand: string): string {
  const b = brand.toLowerCase();
  if (b === 'visa') return 'Visa';
  if (b === 'mastercard') return 'Mastercard';
  if (b === 'amex') return 'American Express';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function formatStripeBillingLines(
  billing: ClientStripePaymentMethodBilling | null | undefined
): string[] {
  if (!billing?.line1) return [];
  const lines: string[] = [billing.line1];
  if (billing.line2?.trim()) lines.push(billing.line2.trim());
  const cityLine = [billing.postalCode, billing.city].filter(Boolean).join(' ').trim();
  if (cityLine) lines.push(cityLine);
  if (billing.country?.trim()) lines.push(billing.country.trim());
  return lines;
}

function paymentLabel(t: (k: string) => string, p: ClientPreferredPayment): string {
  if (p === 'card') return t('clientAccount.prefCard');
  if (p === 'cash') return t('clientAccount.prefCash');
  return t('clientAccount.prefIndifferent');
}

export interface ClientCompteDashboardProps {
  onBack: () => void;
  /** Ouvre la page « Chauffeur sur place » (`/compte/course`). */
  onOpenClientLiveMeet?: () => void;
}

type ClientAccountNavId =
  | 'overview'
  | 'account'
  | 'personal'
  | 'courses'
  | 'places'
  | 'wallet'
  | 'security'
  | 'privacy'
  | 'settings'
  | 'help';

type AccountManageSectionId = 'personal' | 'security' | 'payment' | 'privacy' | 'help';
type AccountEditModalState = {
  open: boolean;
  key: string;
  title: string;
  fields: Array<{
    id: string;
    label: string;
    value: string;
    type?: 'text' | 'select' | 'password';
    options?: Array<{ value: string; label: string }>;
  }>;
};

function ClientAccountBackToOverviewButton(props: {
  onClick: () => void;
  label: string;
  ariaLabel: string;
}) {
  return (
    <div className="client-compte-content-back-row">
      <button type="button" className="client-compte-content-back-btn" onClick={props.onClick} aria-label={props.ariaLabel}>
        <ArrowLeft size={18} aria-hidden />
        <span>{props.label}</span>
      </button>
    </div>
  );
}

function readCompteNavFromPath(): ClientAccountNavId {
  if (typeof window === 'undefined') return 'overview';
  const path = window.location.pathname.replace(/^\/(fr|en)/, '') || '/';
  if (path === '/compte/lieux' || path.startsWith('/compte/lieux/')) return 'places';
  return 'overview';
}

function inferClientIdentityFromEmail(email: string): { prenom: string; nom: string } {
  const localPart = email.split('@')[0] ?? '';
  const chunks = localPart
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const pretty = (value: string) => value.slice(0, 1).toUpperCase() + value.slice(1).toLowerCase();
  if (chunks.length === 0) return { prenom: '', nom: '' };
  if (chunks.length === 1) return { prenom: pretty(chunks[0]), nom: '' };
  return { prenom: pretty(chunks[0]), nom: pretty(chunks.slice(1).join(' ')) };
}

export default function ClientCompteDashboard({ onBack, onOpenClientLiveMeet }: ClientCompteDashboardProps) {
  const { t, language, setLanguage } = useLanguage();
  const isEn = language === 'en';
  const { clientUpcomingRide, clientLiveMeetActive, ridesRefreshEpoch } = useClientHomeTopbarRides(language);
  const [wallet, setWallet] = useState(() => loadClientWalletSnapshot(getCurrentClientUser()?.email));
  const [appPrefs, setAppPrefs] = useState<ClientAppPreferencesSnapshot>(() =>
    loadClientAppPreferences(getCurrentClientUser()?.email)
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<ClientAccountNavId>(() => readCompteNavFromPath());
  const [accountManageSection, setAccountManageSection] = useState<AccountManageSectionId>('personal');
  const [accountCardOverrides, setAccountCardOverrides] = useState<Record<string, string>>({});
  const [accountEditModal, setAccountEditModal] = useState<AccountEditModalState>({
    open: false,
    key: '',
    title: '',
    fields: [],
  });
  const [accountEditErrors, setAccountEditErrors] = useState<Record<string, string>>({});
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    country: 'FR',
    addressLine1: '',
    city: '',
    postalCode: '',
  });
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<ClientSavedPaymentMethod[]>(() =>
    loadClientPaymentMethods(getCurrentClientUser()?.email)
  );
  const [stripePaymentMethods, setStripePaymentMethods] = useState<ClientStripePaymentMethod[]>([]);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [paymentModalLoading, setPaymentModalLoading] = useState(false);
  const [pendingWalletTopupEur, setPendingWalletTopupEur] = useState<number | null>(null);
  const [walletTopupAmountEur, setWalletTopupAmountEur] = useState(10);
  const walletTopupPromptedRef = useRef(false);
  const [walletTopupClientSecret, setWalletTopupClientSecret] = useState<string | null>(null);
  const [walletTopupPaymentIntentId, setWalletTopupPaymentIntentId] = useState<string | null>(null);
  const [walletTopupLoading, setWalletTopupLoading] = useState(false);
  const [paymentViewPm, setPaymentViewPm] = useState<ClientStripePaymentMethod | null>(null);
  const [paymentEditPm, setPaymentEditPm] = useState<ClientStripePaymentMethod | null>(null);
  const [paymentEditForm, setPaymentEditForm] = useState({
    name: '',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    country: 'FR',
  });
  const [paymentEditSaving, setPaymentEditSaving] = useState(false);
  const stripeOn = clientStripeApiEnabled();
  const stripePk = stripePublishableKey();
  const [placesDraft, setPlacesDraft] = useState<ClientSavedPlacesSnapshot>(() =>
    loadClientSavedPlaces(getCurrentClientUser()?.email)
  );
  const [mapPickTarget, setMapPickTarget] = useState<ClientPlaceMapTarget | null>(null);
  const clientCompteModalOpen =
    accountEditModal.open ||
    paymentModalOpen ||
    paymentViewPm !== null ||
    paymentEditPm !== null ||
    mapPickTarget !== null;
  useBodyScrollLock(clientCompteModalOpen);
  const [security, setSecurity] = useState<ClientSecuritySnapshot>(() =>
    loadClientSecuritySnapshot(getCurrentClientUser()?.email)
  );
  const [pwdPanelOpen, setPwdPanelOpen] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [clientRides, setClientRides] = useState<ClientRideItem[]>([]);
  const [ridesSyncTick, setRidesSyncTick] = useState(0);
  const [authSessionTick, setAuthSessionTick] = useState(0);
  const [profileSyncTick, setProfileSyncTick] = useState(0);
  const [orgSyncTick, setOrgSyncTick] = useState(0);
  const ridesForUi = useMemo<ClientAccountRideRow[]>(() => {
    return clientRides.map((ride) => {
      const iso = `${ride.scheduledDate}T${ride.scheduledTime}`;
      const dt = new Date(iso);
      const dateFr = Number.isNaN(dt.getTime())
        ? `${ride.scheduledDate} ${ride.scheduledTime.slice(0, 5)}`
        : dt.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
      const dateEn = Number.isNaN(dt.getTime())
        ? `${ride.scheduledDate} ${ride.scheduledTime.slice(0, 5)}`
        : dt.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
      const statusMapFr: Record<string, string> = {
        pending: 'En attente',
        accepted: 'Acceptee',
        in_progress: 'En cours',
        completed: 'Terminee',
        cancelled: 'Annulee',
      };
      const statusMapEn: Record<string, string> = {
        pending: 'Pending',
        accepted: 'Accepted',
        in_progress: 'In progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
      };
      const trackModel = buildClientLiveMeetRideFromRideItem(ride);
      const liveMeet =
        trackModel && (ride.status === 'in_progress' || ride.status === 'accepted')
          ? trackModel
          : null;
      const driver =
        ride.driverName || ride.vehicleLabel || ride.driverPhone
          ? clientDriverDisplayFromRideItem(ride)
          : null;
      const flow: ClientRideFlowKind | null =
        ride.status === 'completed'
          ? 'end_cash'
          : liveMeet
            ? 'meet_driver'
            : null;
      const payFr = ride.paymentMethod === 'cash' ? 'Espèces' : ride.paymentMethod === 'card' ? 'Carte' : '—';
      const payEn = ride.paymentMethod === 'cash' ? 'Cash' : ride.paymentMethod === 'card' ? 'Card' : '—';
      return {
        id: ride.id,
        rawStatus: ride.status,
        route: `${simplifyAddressDisplay(ride.pickupAddress)} -> ${simplifyAddressDisplay(ride.dropoffAddress)}`,
        date: dateFr,
        dateEn,
        status: statusMapFr[ride.status] ?? ride.status,
        statusEn: statusMapEn[ride.status] ?? ride.status,
        pickupLabel: simplifyAddressDisplay(ride.pickupAddress),
        dropoffLabel: simplifyAddressDisplay(ride.dropoffAddress),
        departTime: ride.scheduledTime.slice(0, 5),
        arriveTime: '',
        durationMin: ride.status === 'completed' ? clientRideDurationMinutes(ride) : 0,
        distanceKm: Number(ride.distanceKm ?? 0),
        priceEur: Number(ride.amountEur ?? 0),
        driverName: (driver?.driverName ?? ride.driverName?.trim()) || '—',
        vehicleLabel: driver?.vehicleLine || ride.vehicleLabel?.trim() || '—',
        driverPhone: driver?.driverPhone,
        driverProfilePhotoUrl: driver?.driverProfilePhotoUrl,
        licensePlate: driver?.licensePlate,
        vehicleType: ride.vehicleType ?? undefined,
        vehicleModel: driver?.vehicleModel,
        paymentMethod: payFr,
        paymentMethodEn: payEn,
        reference: ride.id,
        flow,
        meetPickupCoords: liveMeet?.meetPickupCoords,
        meetDriverCoordsInitial: liveMeet?.meetDriverCoordsInitial,
      };
    });
  }, [clientRides]);
  const selectedRide = useMemo(
    () => ridesForUi.find((r) => r.id === selectedRideId) ?? null,
    [selectedRideId, ridesForUi]
  );
  const canCancelSelectedRide = useMemo(() => {
    if (!selectedRide) return false;
    return selectedRide.rawStatus === 'pending' || selectedRide.rawStatus === 'accepted';
  }, [selectedRide]);
  const walletRideMovements = useMemo(() => {
    const createdAtById = new Map(clientRides.map((r) => [r.id, r.createdAt]));
    return [...ridesForUi]
      .filter((r) => r.priceEur > 0)
      .sort((a, b) => {
        const ta = Date.parse(createdAtById.get(a.id) ?? '') || 0;
        const tb = Date.parse(createdAtById.get(b.id) ?? '') || 0;
        return tb - ta;
      });
  }, [ridesForUi, clientRides]);

  const recentRidePrices = useMemo(() => walletRideMovements.slice(0, 3), [walletRideMovements]);
  const overviewRecentRides = useMemo(() => ridesForUi.slice(0, 6), [ridesForUi]);
  const overviewMapBgUrl = '/images/2948124.jpg';

  const [profile, setProfile] = useState<ClientAccountSnapshot>(() =>
    loadClientAccountSnapshot(getCurrentClientUser()?.email)
  );
  const activeClientEmail = useMemo(() => {
    const fromSession = getCurrentClientUser()?.email?.trim().toLowerCase() ?? '';
    if (fromSession) return fromSession;
    return profile.email.trim().toLowerCase();
  }, [profile.email, ridesSyncTick, authSessionTick]);
  const clientFullName = useMemo(
    () => `${profile.prenom} ${profile.nom}`.trim(),
    [profile.prenom, profile.nom]
  );
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ClientAccountSnapshot>(profile);
  const [phoneCountryDraft, setPhoneCountryDraft] = useState<SupportedPhoneCountry>('RE');
  const [phoneNationalDraft, setPhoneNationalDraft] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [photoDraftUrl, setPhotoDraftUrl] = useState<string | null>(profile.profilePhotoUrl ?? null);
  const [photoDraftName, setPhotoDraftName] = useState(profile.profilePhotoName ?? '');
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [createRideMenuOpen, setCreateRideMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const topbarPhotoInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobileViewport(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!accountModalOpen && !createRideMenuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!accountMenuRef.current) return;
      if (accountMenuRef.current.contains(e.target as Node)) return;
      setAccountModalOpen(false);
      setCreateRideMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [accountModalOpen, createRideMenuOpen]);

  useEffect(() => {
    const bump = () => setRidesSyncTick((n) => n + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'palto:client_token' || e.key === 'palto:client_auth') bump();
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
    const bump = () => setAuthSessionTick((n) => n + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key == null) return;
      if (e.key === 'palto:client_token' || e.key === 'palto:client_auth' || e.key === 'dashboard_token' || e.key === 'dashboard_auth') {
        bump();
      }
    };
    const onProfileSynced = () => setProfileSyncTick((n) => n + 1);
    window.addEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, bump as EventListener);
    window.addEventListener('palto:client-profile-synced', onProfileSynced as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, bump as EventListener);
      window.removeEventListener('palto:client-profile-synced', onProfileSynced as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (!clientRidesApiEnabled()) {
      setClientRides([]);
      return;
    }
    const user = getCurrentClientUser();
    if (!user?.email || !isClientAuthenticated()) {
      setClientRides([]);
      return;
    }
    let cancelled = false;
    void fetchClientRides(user.email, 'all')
      .then((items) => {
        if (!cancelled) setClientRides(items);
      })
      .catch((e) => {
        console.warn('[ClientCompteDashboard] rides api unavailable', e);
        if (!cancelled) setClientRides([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ridesSyncTick, ridesRefreshEpoch]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sessionUser = getCurrentClientUser();
      const sessionEmail = (sessionUser?.email ?? '').trim().toLowerCase();
      if (!sessionEmail) return;
      migrateLegacySavedPlacesIfOwnedByEmail(sessionEmail);
      migrateLegacyWalletIfOwnedByEmail(sessionEmail);
      migrateLegacySecurityIfOwnedByEmail(sessionEmail);
      await syncClientProfileWithServer(sessionEmail);
      if (!cancelled) setProfileSyncTick((n) => n + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [authSessionTick]);

  useEffect(() => {
    const sessionUser = getCurrentClientUser();
    const sessionEmail = (sessionUser?.email ?? '').trim().toLowerCase();
    const snap = loadClientAccountSnapshot(sessionEmail);
    const needsEmailHydration = sessionEmail.length > 0 && snap.email.trim().toLowerCase() !== sessionEmail;
    const needsNameHydration = !snap.prenom.trim() && !snap.nom.trim() && sessionEmail.length > 0;
    const inferred = inferClientIdentityFromEmail(sessionEmail);
    const hydrated = {
      ...snap,
      email: needsEmailHydration ? sessionEmail : snap.email,
      prenom: needsNameHydration ? inferred.prenom : snap.prenom,
      nom: needsNameHydration ? inferred.nom : snap.nom,
    };
    if (sessionEmail && (needsEmailHydration || needsNameHydration)) {
      saveClientAccountSnapshot(hydrated, sessionEmail);
    }
    setProfile(hydrated);
    setDraft(hydrated);
    const parsed = parseStoredPhone(hydrated.telephone);
    setPhoneCountryDraft(parsed.country);
    setPhoneNationalDraft(parsed.nationalNumber);
    setPhotoDraftUrl(hydrated.profilePhotoUrl ?? null);
    setPhotoDraftName(hydrated.profilePhotoName ?? '');
    setPlacesDraft(loadClientSavedPlaces(sessionEmail));
    if (sessionEmail) {
      const prefs = loadClientAppPreferences(sessionEmail);
      setAppPrefs(prefs);
      applyAppThemeToDocument(prefs.theme);
      applyUserFontScaleToDocument(prefs.fontScalePercent);
      setWallet(loadClientWalletSnapshot(sessionEmail));
      setSecurity(loadClientSecuritySnapshot(sessionEmail));
    }
  }, [authSessionTick, profileSyncTick]);

  useEffect(() => {
    const bump = () => setOrgSyncTick((n) => n + 1);
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CHAUFFEUR_ORG_STORAGE_KEY) bump();
    };
    window.addEventListener(CHAUFFEUR_ORG_CHANGED_EVENT, bump as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHAUFFEUR_ORG_CHANGED_EVENT, bump as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const syncNavFromLocation = useCallback(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.replace(/^\/(fr|en)/, '') || '/';
    if (path === '/compte/lieux' || path.startsWith('/compte/lieux/')) {
      setActiveNav('places');
      return;
    }
    if (path === '/compte' || path === '/compte/') {
      setActiveNav((prev) => (prev === 'places' ? 'overview' : prev));
    }
  }, []);

  useEffect(() => {
    syncNavFromLocation();
    const onPop = () => syncNavFromLocation();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [syncNavFromLocation]);

  useEffect(() => {
    syncNavFromLocation();
  }, [language, syncNavFromLocation]);

  useEffect(() => {
    if (activeNav === 'places') {
      setPlacesDraft(loadClientSavedPlaces(activeClientEmail));
    }
  }, [activeClientEmail, activeNav, authSessionTick, profileSyncTick]);

  useEffect(() => {
    if (activeNav === 'places') {
      document.title = language === 'en' ? 'Saved places — Palto' : 'Lieux enregistrés — Palto';
      return;
    }
    document.title = language === 'en' ? 'My account — Palto' : 'Mon compte — Palto';
  }, [activeNav, language]);

  const startEdit = useCallback(() => {
    const parsed = parseStoredPhone(profile.telephone);
    setDraft(profile);
    setPhoneCountryDraft(parsed.country);
    setPhoneNationalDraft(parsed.nationalNumber);
    setPhotoDraftUrl(profile.profilePhotoUrl ?? null);
    setPhotoDraftName(profile.profilePhotoName ?? '');
    setPhoneError(null);
    setIsEditing(true);
    trackEvent('click', 'client_account', 'edit');
  }, [profile]);

  useEffect(() => {
    const email = activeClientEmail || undefined;
    setWallet(loadClientWalletSnapshot(email));
    setAppPrefs(loadClientAppPreferences(email));
    if (activeNav === 'security') {
      setSecurity(loadClientSecuritySnapshot(email));
      setPwdPanelOpen(false);
      setNewPwd('');
      setConfirmPwd('');
      setPwdError(null);
    }
    if (activeNav !== 'courses') {
      setSelectedRideId(null);
    }
  }, [activeNav, activeClientEmail]);

  const handleWalletSimulateTopup = useCallback(() => {
    const email = activeClientEmail || undefined;
    const current = loadClientWalletSnapshot(email);
    const next = { balanceCents: current.balanceCents + 500 };
    saveClientWalletSnapshot(next, email);
    setWallet(next);
    trackEvent('click', 'client_account', 'wallet_simulate_topup');
  }, [activeClientEmail]);

  const refreshStripeWalletBalance = useCallback(async () => {
    if (!stripeOn || !isClientAuthenticated()) return;
    try {
      const balanceCents = await fetchClientWalletBalanceCents();
      const next = { balanceCents };
      setWallet(next);
      if (activeClientEmail) saveClientWalletSnapshot(next, activeClientEmail);
    } catch (e) {
      console.warn('[client/stripe] wallet balance', e);
    }
  }, [activeClientEmail, stripeOn]);

  const refreshStripePaymentMethods = useCallback(async () => {
    if (!stripeOn || !isClientAuthenticated()) return;
    try {
      const { items, stripeCustomerId: customerId } = await fetchClientStripePaymentMethods(
        clientFullName || undefined
      );
      setStripePaymentMethods(items);
      setStripeCustomerId(customerId);
    } catch (e) {
      console.warn('[client/stripe] payment methods', e);
    }
  }, [clientFullName, stripeOn]);

  useEffect(() => {
    if (!stripeOn || !isClientAuthenticated()) return;
    void refreshStripeWalletBalance();
    void refreshStripePaymentMethods();
  }, [stripeOn, authSessionTick, refreshStripePaymentMethods, refreshStripeWalletBalance]);

  useEffect(() => {
    if (!stripeOn || activeNav !== 'wallet') return;
    void refreshStripeWalletBalance();
  }, [activeNav, refreshStripeWalletBalance, stripeOn]);

  const setAppTheme = useCallback((theme: AppTheme) => {
    const email = activeClientEmail || undefined;
    setAppPrefs((prev) => {
      const next = { ...prev, theme };
      saveClientAppPreferences(next, email);
      trackEvent('click', 'client_account', `theme_${theme}`);
      return next;
    });
  }, [activeClientEmail]);

  const setFontScalePercent = useCallback((raw: number) => {
    const fontScalePercent = clampFontScalePercent(raw);
    const email = activeClientEmail || undefined;
    setAppPrefs((prev) => {
      const next = { ...prev, fontScalePercent };
      saveClientAppPreferences(next, email);
      trackEvent('click', 'client_account', `font_scale_${fontScalePercent}`);
      return next;
    });
  }, [activeClientEmail]);

  useEffect(() => {
    setSavedPaymentMethods(loadClientPaymentMethods(activeClientEmail));
  }, [activeClientEmail, authSessionTick]);

  const toggleAppNotify = useCallback((key: 'notifyEmail' | 'notifySms' | 'notifyPush') => {
    const email = activeClientEmail || undefined;
    setAppPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveClientAppPreferences(next, email);
      trackEvent('click', 'client_account', `notify_${key}_${next[key] ? 'on' : 'off'}`);
      return next;
    });
  }, [activeClientEmail]);

  const cancelEdit = useCallback(() => {
    const parsed = parseStoredPhone(profile.telephone);
    setDraft(profile);
    setPhoneCountryDraft(parsed.country);
    setPhoneNationalDraft(parsed.nationalNumber);
    setPhotoDraftUrl(profile.profilePhotoUrl ?? null);
    setPhotoDraftName(profile.profilePhotoName ?? '');
    setPhoneError(null);
    setIsEditing(false);
  }, [profile]);

  const goNav = useCallback(
    (id: ClientAccountNavId) => {
      if (activeNav === 'personal' && id !== 'personal' && isEditing) {
        cancelEdit();
      }
      setActiveNav(id);
      const prefix = language === 'en' ? '/en' : '/fr';
      if (id === 'places') {
        window.history.pushState({}, '', `${prefix}/compte/lieux`);
      } else {
        const pathNow =
          (typeof window !== 'undefined' ? window.location.pathname : '').replace(/^\/(fr|en)/, '') || '/';
        if (pathNow.startsWith('/compte/lieux')) {
          window.history.pushState({}, '', `${prefix}/compte`);
        }
      }
      if (isMobileViewport) setMobileSidebarOpen(false);
      trackEvent('click', 'client_account', `nav_${id}`);
    },
    [activeNav, isEditing, cancelEdit, isMobileViewport, language]
  );

  const openClientRideTracking = useCallback(() => {
    if (!onOpenClientLiveMeet) return;
    const trackable = clientRides.find(
      (r) =>
        (r.status === 'accepted' || r.status === 'pending' || r.status === 'in_progress') &&
        typeof r.pickupLng === 'number' &&
        typeof r.pickupLat === 'number'
    );
    if (trackable) {
      const model = buildClientLiveMeetRideFromRideItem(trackable);
      if (model) {
        saveClientLiveMeetRideModel(model);
        trackEvent('click', 'client_account', 'overview_ride_tracking');
        onOpenClientLiveMeet();
        return;
      }
    }
    goNav('courses');
  }, [clientRides, onOpenClientLiveMeet, goNav]);

  const openManageAccount = useCallback((section: AccountManageSectionId = 'personal') => {
    setAccountManageSection(section);
    setActiveNav('account');
  }, []);

  const openAccountEditModal = useCallback((key: string, title: string, value: string) => {
    const raw = value.trim();
    const tokens = raw.split(/\s+/).filter(Boolean);
    const phoneMatch = raw.match(/^(\+\d+)\s*(.*)$/);
    const phonePrefixOptions = [
      { value: '+262', label: '+262 (Reunion)' },
      { value: '+33', label: '+33 (France)' },
      { value: '+261', label: '+261 (Madagascar)' },
      { value: '+230', label: '+230 (Mauritius)' },
    ];
    const languageOptions = [
      { value: 'Francais', label: isEn ? 'French' : 'Francais' },
      { value: 'English', label: 'English' },
      { value: 'Creole reunionnais', label: isEn ? 'Reunion Creole' : 'Creole reunionnais' },
    ];
    const normalizedLanguage =
      raw.toLowerCase() === 'francais'
        ? 'Francais'
        : raw.toLowerCase() === 'english'
          ? 'English'
          : 'Creole reunionnais';
    const defaultFields =
      key === 'personal-card-1'
        ? [
            { id: 'firstName', label: isEn ? 'First name' : 'Prenom', value: tokens[0] ?? '' },
            { id: 'lastName', label: isEn ? 'Last name' : 'Nom', value: tokens.slice(1).join(' ') },
          ]
        : key === 'security-card-1'
          ? [
              { id: 'newPassword', label: isEn ? 'New password' : 'Nouveau mot de passe', value: '', type: 'password' as const },
              { id: 'confirmPassword', label: isEn ? 'Confirm password' : 'Confirmer le mot de passe', value: '', type: 'password' as const },
            ]
        : key === 'personal-card-2'
          ? [
              {
                id: 'phonePrefix',
                label: isEn ? 'Dial code' : 'Indicatif',
                value: phoneMatch?.[1] ?? '+262',
                type: 'select' as const,
                options: phonePrefixOptions,
              },
              { id: 'phoneNumber', label: isEn ? 'Phone number' : 'Numero', value: (phoneMatch?.[2] ?? raw).trim() },
            ]
        : key === 'personal-card-4'
          ? [
              {
                id: 'languageChoice',
                label: isEn ? 'Language' : 'Langue',
                value: normalizedLanguage,
                type: 'select' as const,
                options: languageOptions,
              },
            ]
        : [
            { id: 'main', label: isEn ? 'Value' : 'Valeur', value: raw },
          ];
    setAccountEditModal({
      open: true,
      key,
      title,
      fields: defaultFields,
    });
    setAccountEditErrors({});
  }, [isEn]);

  const closeAccountEditModal = useCallback(() => {
    setAccountEditModal((prev) => ({ ...prev, open: false }));
    setAccountEditErrors({});
  }, []);

  const validateAccountEditFields = useCallback((modal: AccountEditModalState): Record<string, string> => {
    const errors: Record<string, string> = {};
    const valueOf = (id: string) => modal.fields.find((f) => f.id === id)?.value.trim() ?? '';

    if (modal.key === 'personal-card-1') {
      const firstName = valueOf('firstName');
      const lastName = valueOf('lastName');
      if (firstName.length < 2) errors.firstName = isEn ? 'Invalid first name (min 2 chars).' : 'Prenom invalide (min 2 caracteres).';
      if (lastName.length < 2) errors.lastName = isEn ? 'Invalid last name (min 2 chars).' : 'Nom invalide (min 2 caracteres).';
      return errors;
    }

    if (modal.key === 'personal-card-2') {
      const prefix = valueOf('phonePrefix');
      const number = valueOf('phoneNumber').replace(/\s+/g, '');
      if (!/^\+\d{1,4}$/.test(prefix)) errors.phonePrefix = isEn ? 'Invalid dial code (ex: +262).' : 'Indicatif invalide (ex: +262).';
      if (!/^\d{6,12}$/.test(number)) errors.phoneNumber = isEn ? 'Invalid phone number (6 to 12 digits).' : 'Numero invalide (6 a 12 chiffres).';
      return errors;
    }

    if (modal.key === 'personal-card-3') {
      const email = valueOf('main');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.main = isEn ? 'Invalid email.' : 'Email invalide.';
      return errors;
    }

    if (modal.key === 'personal-card-4') {
      const languageChoice = valueOf('languageChoice');
      if (!languageChoice) errors.languageChoice = isEn ? 'Please select a language.' : 'Selectionnez une langue.';
      return errors;
    }

    if (modal.key === 'security-card-1') {
      const newPasswordValue = valueOf('newPassword');
      const confirmPasswordValue = valueOf('confirmPassword');
      if (newPasswordValue.length < 8) {
        errors.newPassword = isEn ? 'Password must have at least 8 characters.' : 'Le mot de passe doit contenir au moins 8 caracteres.';
      }
      if (confirmPasswordValue !== newPasswordValue) {
        errors.confirmPassword = isEn ? 'Passwords do not match.' : 'Les mots de passe ne correspondent pas.';
      }
      return errors;
    }

    for (const field of modal.fields) {
      if (field.value.trim().length < 2) {
        errors[field.id] = isEn ? 'This field is required (min 2 chars).' : 'Ce champ est requis (min 2 caracteres).';
      }
    }
    return errors;
  }, [isEn]);

  const saveAccountEditModal = useCallback(() => {
    const errors = validateAccountEditFields(accountEditModal);
    if (Object.keys(errors).length > 0) {
      setAccountEditErrors(errors);
      return;
    }
    const nextValue =
      accountEditModal.key === 'security-card-1'
        ? (() => {
            const updatedAt = new Date().toISOString();
            const nextSecurity: ClientSecuritySnapshot = {
              ...security,
              passwordLastChangedAt: updatedAt,
            };
            saveClientSecuritySnapshot(nextSecurity, activeClientEmail || undefined);
            setSecurity(nextSecurity);
            return `${'•'.repeat(10)} · ${formatSecurityDate(updatedAt)}`;
          })()
        : accountEditModal.key === 'personal-card-2'
        ? (() => {
            const prefix = accountEditModal.fields.find((f) => f.id === 'phonePrefix')?.value.trim() ?? '';
            const number = accountEditModal.fields.find((f) => f.id === 'phoneNumber')?.value.trim() ?? '';
            return `${prefix} ${number}`.trim();
          })()
        : accountEditModal.key === 'personal-card-4'
          ? (() => {
              return accountEditModal.fields.find((f) => f.id === 'languageChoice')?.value.trim() ?? '';
            })()
        : accountEditModal.fields
            .map((f) => f.value.trim())
            .filter(Boolean)
            .join(' ')
            .trim();
    if (!accountEditModal.key) return;

    if (
      accountEditModal.key === 'personal-card-1' ||
      accountEditModal.key === 'personal-card-2' ||
      accountEditModal.key === 'personal-card-3'
    ) {
      const emailKey = activeClientEmail.trim().toLowerCase();
      let nextProfile: ClientAccountSnapshot = profile;
      if (accountEditModal.key === 'personal-card-1') {
        const firstName = accountEditModal.fields.find((f) => f.id === 'firstName')?.value.trim() ?? '';
        const lastName = accountEditModal.fields.find((f) => f.id === 'lastName')?.value.trim() ?? '';
        nextProfile = { ...profile, prenom: firstName, nom: lastName };
      } else if (accountEditModal.key === 'personal-card-2') {
        nextProfile = { ...profile, telephone: nextValue };
      } else {
        nextProfile = { ...profile, email: nextValue.trim().toLowerCase() };
      }
      setProfile(nextProfile);
      setDraft(nextProfile);
      if (accountEditModal.key === 'personal-card-2') {
        const parsed = parseStoredPhone(nextValue);
        setPhoneCountryDraft(parsed.country);
        setPhoneNationalDraft(parsed.nationalNumber);
      }
      if (emailKey) {
        saveClientAccountSnapshot(nextProfile, emailKey);
        scheduleClientProfilePush(emailKey);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(PALTO_CLIENT_SESSION_CHANGED_EVENT));
        }
      }
      toast.success(isEn ? 'Profile updated.' : 'Profil enregistré.');
    }

    if (accountEditModal.key === 'personal-card-4') {
      const languageChoice = accountEditModal.fields.find((f) => f.id === 'languageChoice')?.value.trim() ?? '';
      const nextLang = languageChoice === 'English' ? 'en' : 'fr';
      setLanguage(nextLang);
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname || '/';
        const pathWithoutPrefix = currentPath.replace(/^\/(fr|en)(?=\/|$)/, '') || '/';
        const prefix = nextLang === 'en' ? '/en' : '/fr';
        const nextUrl = `${prefix}${pathWithoutPrefix === '/' ? '' : pathWithoutPrefix}${window.location.search}${window.location.hash}`;
        window.history.replaceState({}, '', nextUrl);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
    setAccountCardOverrides((prev) => ({ ...prev, [accountEditModal.key]: nextValue }));
    setAccountEditModal((prev) => ({ ...prev, open: false }));
    setAccountEditErrors({});
  }, [
    accountEditModal,
    activeClientEmail,
    isEn,
    profile,
    security,
    setLanguage,
    validateAccountEditFields,
    formatSecurityDate,
  ]);

  const openPaymentModal = useCallback(() => {
    setPaymentErrors({});
    setSetupClientSecret(null);
    setPaymentModalOpen(true);
    if (!stripeOn) return;
    setPaymentModalLoading(true);
    void createClientSetupIntent(clientFullName || undefined)
      .then((secret) => setSetupClientSecret(secret))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : isEn ? 'Stripe unavailable' : 'Stripe indisponible');
      })
      .finally(() => setPaymentModalLoading(false));
  }, [clientFullName, isEn, stripeOn]);

  const closePaymentModal = useCallback(() => {
    setPaymentModalOpen(false);
    setPaymentErrors({});
    setSetupClientSecret(null);
    setPaymentModalLoading(false);
  }, []);

  const goToPaymentForWalletTopUp = useCallback(() => {
    if (!stripeOn) return;
    setPendingWalletTopupEur(walletTopupAmountEur);
    setWalletTopupClientSecret(null);
    setWalletTopupPaymentIntentId(null);
    openManageAccount('payment');
    trackEvent('click', 'client_account', 'wallet_goto_payment');
  }, [openManageAccount, stripeOn, walletTopupAmountEur]);

  const startWalletTopUp = useCallback(() => {
    if (!stripeOn || !stripePk) return;
    const amountEur = pendingWalletTopupEur ?? walletTopupAmountEur;
    setWalletTopupLoading(true);
    setWalletTopupClientSecret(null);
    setWalletTopupPaymentIntentId(null);
    void createClientWalletTopUp(amountEur, clientFullName || undefined)
      .then(({ clientSecret, paymentIntentId }) => {
        setWalletTopupClientSecret(clientSecret);
        setWalletTopupPaymentIntentId(paymentIntentId);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : isEn ? 'Top-up failed' : 'Recharge impossible');
      })
      .finally(() => setWalletTopupLoading(false));
  }, [clientFullName, isEn, pendingWalletTopupEur, stripeOn, stripePk, walletTopupAmountEur]);

  const handleSetupCardSuccess = useCallback(() => {
    void refreshStripePaymentMethods().then(() => {
      setProfile((p) => ({ ...p, preferredPayment: 'card' }));
      setDraft((p) => ({ ...p, preferredPayment: 'card' }));
      setPaymentModalOpen(false);
      setSetupClientSecret(null);
      toast.success(
        isEn
          ? 'Card and billing address saved. You can top up your wallet below.'
          : 'Carte et adresse de facturation enregistrees. Vous pouvez recharger le portefeuille ci-dessous.'
      );
      if (pendingWalletTopupEur != null) {
        void startWalletTopUp();
      }
    });
  }, [isEn, pendingWalletTopupEur, refreshStripePaymentMethods, startWalletTopUp]);

  const handleWalletTopUpSuccess = useCallback(() => {
    const piId = walletTopupPaymentIntentId;
    if (!piId) return;
    void confirmClientWalletTopUp(piId)
      .then((balanceCents) => {
        const next = { balanceCents };
        setWallet(next);
        if (activeClientEmail) saveClientWalletSnapshot(next, activeClientEmail);
        setWalletTopupClientSecret(null);
        setWalletTopupPaymentIntentId(null);
        setPendingWalletTopupEur(null);
        toast.success(isEn ? 'Wallet topped up.' : 'Portefeuille recharge.');
        trackEvent('click', 'client_account', 'wallet_stripe_topup');
        goNav('wallet');
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : isEn ? 'Confirmation failed' : 'Confirmation impossible');
      });
  }, [activeClientEmail, goNav, isEn, walletTopupPaymentIntentId]);

  const cancelWalletTopUp = useCallback(() => {
    setWalletTopupClientSecret(null);
    setWalletTopupPaymentIntentId(null);
    setPendingWalletTopupEur(null);
  }, []);

  const openPaymentMethodView = useCallback((pm: ClientStripePaymentMethod) => {
    setPaymentViewPm(pm);
  }, []);

  const openPaymentMethodEdit = useCallback((pm: ClientStripePaymentMethod) => {
    const b = pm.billing;
    setPaymentEditPm(pm);
    setPaymentEditForm({
      name: b?.name?.trim() || clientFullName,
      line1: b?.line1?.trim() || '',
      line2: b?.line2?.trim() || '',
      city: b?.city?.trim() || '',
      postalCode: b?.postalCode?.trim() || '',
      country: (b?.country?.trim() || 'FR').toUpperCase().slice(0, 2),
    });
  }, [clientFullName]);

  const closePaymentMethodView = useCallback(() => setPaymentViewPm(null), []);
  const closePaymentMethodEdit = useCallback(() => setPaymentEditPm(null), []);

  const savePaymentMethodEdit = useCallback(() => {
    if (!paymentEditPm) return;
    const { name, line1, line2, city, postalCode, country } = paymentEditForm;
    if (line1.trim().length < 3 || city.trim().length < 2 || postalCode.trim().length < 2) {
      toast.error(isEn ? 'Complete billing address.' : 'Adresse de facturation incomplete.');
      return;
    }
    setPaymentEditSaving(true);
    void updateClientPaymentMethodBilling(
      paymentEditPm.id,
      {
        name: name.trim() || null,
        line1: line1.trim(),
        line2: line2.trim() || null,
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim().toUpperCase().slice(0, 2),
      },
      clientFullName || undefined
    )
      .then(() => refreshStripePaymentMethods())
      .then(() => {
        setPaymentEditPm(null);
        toast.success(isEn ? 'Billing address updated.' : 'Adresse de facturation mise a jour.');
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : isEn ? 'Update failed' : 'Mise a jour impossible');
      })
      .finally(() => setPaymentEditSaving(false));
  }, [clientFullName, isEn, paymentEditForm, paymentEditPm, refreshStripePaymentMethods]);

  const deletePaymentMethod = useCallback(
    (pm: ClientStripePaymentMethod) => {
      const label = `${formatStripeCardBrand(pm.brand)} •••• ${pm.last4}`;
      const ok = window.confirm(
        isEn
          ? `Remove card ${label} from your account?`
          : `Supprimer la carte ${label} de votre compte ?`
      );
      if (!ok) return;
      void detachClientPaymentMethod(pm.id, clientFullName || undefined)
        .then(() => refreshStripePaymentMethods())
        .then(() => toast.success(isEn ? 'Card removed.' : 'Carte supprimee.'))
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : isEn ? 'Delete failed' : 'Suppression impossible');
        });
    },
    [clientFullName, isEn, refreshStripePaymentMethods]
  );

  useEffect(() => {
    if (activeNav !== 'account' || accountManageSection !== 'payment') {
      walletTopupPromptedRef.current = false;
      return;
    }
    if (pendingWalletTopupEur == null || !stripeOn) return;
    if (
      stripePaymentMethods.length === 0 &&
      !paymentModalOpen &&
      !paymentModalLoading &&
      !walletTopupPromptedRef.current
    ) {
      walletTopupPromptedRef.current = true;
      openPaymentModal();
    }
  }, [
    accountManageSection,
    activeNav,
    openPaymentModal,
    paymentModalLoading,
    paymentModalOpen,
    pendingWalletTopupEur,
    stripeOn,
    stripePaymentMethods.length,
  ]);

  const submitPaymentMethod = useCallback(() => {
    const errors: Record<string, string> = {};
    const cardDigits = paymentForm.cardNumber.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(cardDigits)) {
      errors.cardNumber = isEn ? 'Card number must contain 16 digits.' : 'Le numero de carte doit contenir 16 chiffres.';
    }
    if (paymentForm.cardholderName.trim().length < 2) {
      errors.cardholderName = isEn ? 'Cardholder name is required.' : 'Le nom du titulaire est requis.';
    }
    if (!/^\d{2}$/.test(paymentForm.expiryMonth) || Number(paymentForm.expiryMonth) < 1 || Number(paymentForm.expiryMonth) > 12) {
      errors.expiryMonth = isEn ? 'Invalid month.' : 'Mois invalide.';
    }
    if (!/^\d{2}$/.test(paymentForm.expiryYear)) errors.expiryYear = isEn ? 'Invalid year.' : 'Annee invalide.';
    if (!/^\d{3,4}$/.test(paymentForm.cvc)) errors.cvc = isEn ? 'Invalid security code.' : 'Code de securite invalide.';
    if (paymentForm.addressLine1.trim().length < 4) errors.addressLine1 = isEn ? 'Address is required.' : 'Adresse requise.';
    if (paymentForm.city.trim().length < 2) errors.city = isEn ? 'City is required.' : 'Ville requise.';
    if (paymentForm.postalCode.trim().length < 3) errors.postalCode = isEn ? 'Postal code is required.' : 'Code postal requis.';
    if (Object.keys(errors).length > 0) {
      setPaymentErrors(errors);
      return;
    }
    const brand = cardDigits.startsWith('4') ? 'Visa' : 'Carte'
    const next = saveClientPaymentMethod(activeClientEmail, {
      brand,
      last4: cardDigits.slice(-4),
      cardholderName: paymentForm.cardholderName.trim(),
      expiryMonth: paymentForm.expiryMonth,
      expiryYear: paymentForm.expiryYear,
      billing: {
        country: paymentForm.country,
        addressLine1: paymentForm.addressLine1.trim(),
        city: paymentForm.city.trim(),
        postalCode: paymentForm.postalCode.trim(),
      },
    })
    setSavedPaymentMethods(next)
    setProfile((p) => ({ ...p, preferredPayment: 'card' }))
    setDraft((p) => ({ ...p, preferredPayment: 'card' }))
    setPaymentModalOpen(false)
    toast.success(
      isEn
        ? 'Card saved locally (preview). Online payment is completed on the Go page with Stripe.'
        : 'Carte enregistree localement (apercu). Le paiement en ligne se fait sur la page Go avec Stripe.'
    )
  }, [activeClientEmail, isEn, paymentForm]);

  const savePlaces = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      saveClientSavedPlaces(placesDraft, activeClientEmail);
      scheduleClientProfilePush(activeClientEmail);
      trackEvent('click', 'client_account', 'places_save');
      toast.success(isEn ? 'Saved places updated.' : 'Lieux enregistrés avec succès.');
      goNav('overview');
    },
    [activeClientEmail, goNav, isEn, placesDraft]
  );

  const handleCancelSelectedRide = useCallback(async () => {
    if (!selectedRide || !canCancelSelectedRide) return;
    const confirmed = window.confirm(
      isEn
        ? 'Do you really want to cancel this ride?'
        : 'Confirmez-vous l’annulation de cette course ?'
    );
    if (!confirmed) return;
    try {
      await cancelClientRide(selectedRide.id);
      setClientRides((prev) =>
        prev.map((ride) => (ride.id === selectedRide.id ? { ...ride, status: 'cancelled' } : ride))
      );
      toast.success(isEn ? 'Ride cancelled.' : 'Course annulée.');
    } catch (e) {
      console.error('[ClientCompteDashboard] cancel ride', e);
      toast.error(isEn ? 'Unable to cancel this ride.' : "Impossible d'annuler cette course.");
    }
  }, [canCancelSelectedRide, isEn, selectedRide]);

  const applyMapPickResult = useCallback((r: ClientCompteMapPickResult, target: ClientPlaceMapTarget) => {
    const coords = { lng: r.lng, lat: r.lat };
    if (target.kind === 'domicile') {
      setPlacesDraft((p) => ({ ...p, domicile: r.address, domicileCoords: coords }));
    } else if (target.kind === 'travail') {
      setPlacesDraft((p) => ({ ...p, travail: r.address, travailCoords: coords }));
    } else {
      setPlacesDraft((p) => ({
        ...p,
        extras: p.extras.map((x) => (x.id === target.id ? { ...x, address: r.address, coords } : x)),
      }));
    }
    trackEvent('click', 'client_account', 'places_map_confirm');
  }, []);

  const saveEdit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const normalizedNational = normalizeNationalPhone(phoneCountryDraft, phoneNationalDraft);
      if (!isValidNationalPhone(phoneCountryDraft, normalizedNational)) {
        setPhoneError(
          phoneCountryDraft === 'FR'
            ? 'Numéro invalide (France).'
            : 'Numéro invalide (Réunion).'
        );
        return;
      }
      setPhoneError(null);
      const next: ClientAccountSnapshot = {
        ...draft,
        telephone: buildInternationalPhone(phoneCountryDraft, normalizedNational),
        profilePhotoUrl: photoDraftUrl,
        profilePhotoName: photoDraftName,
      };
      const ok = saveClientAccountSnapshot(next, activeClientEmail);
      if (!ok) {
        toast.error(t('clientAccount.photoStorageError'));
        return;
      }
      scheduleClientProfilePush(activeClientEmail);
      setProfile(next);
      setIsEditing(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(PALTO_CLIENT_SESSION_CHANGED_EVENT));
      }
      trackEvent('click', 'client_account', 'save');
    },
    [activeClientEmail, draft, phoneCountryDraft, phoneNationalDraft, photoDraftName, photoDraftUrl, t]
  );

  const onPhotoPick = useCallback(async (file: File | undefined | null) => {
    if (!file) return;
    try {
      const dataUrl = await fileToCompressedProfilePhotoDataUrl(file);
      setPhotoDraftUrl(dataUrl);
      setPhotoDraftName(file.name);
    } catch {
      toast.error(t('clientAccount.photoReadError'));
    }
  }, [t]);

  const onTopbarPhotoPick = useCallback(async (file: File | undefined | null) => {
    if (!file) return;
    let dataUrl: string;
    try {
      dataUrl = await fileToCompressedProfilePhotoDataUrl(file);
    } catch {
      toast.error(t('clientAccount.photoReadError'));
      return;
    }
    const next: ClientAccountSnapshot = {
      ...profile,
      profilePhotoUrl: dataUrl,
      profilePhotoName: file.name,
    };
    const ok = saveClientAccountSnapshot(next, activeClientEmail);
    if (!ok) {
      toast.error(t('clientAccount.photoStorageError'));
      return;
    }
    scheduleClientProfilePush(activeClientEmail);
    setProfile(next);
    setDraft(next);
    setPhotoDraftUrl(dataUrl);
    setPhotoDraftName(file.name);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PALTO_CLIENT_SESSION_CHANGED_EVENT));
    }
    setAccountModalOpen(false);
    trackEvent('click', 'client_account', 'topbar_photo_updated');
    toast.success(isEn ? 'Profile photo updated.' : 'Photo de profil mise à jour.');
  }, [activeClientEmail, isEn, profile, t]);

  const handleBackSite = useCallback(() => {
    onBack();
    if (isMobileViewport) setMobileSidebarOpen(false);
  }, [onBack, isMobileViewport]);

  const handleClientLogout = useCallback(() => {
    setAccountModalOpen(false);
    if (isMobileViewport) setMobileSidebarOpen(false);
    logoutClientToHome();
  }, [isMobileViewport]);

  const handleGoPage = useCallback(() => {
    const prefix = language === 'en' ? '/en' : '/fr';
    const domicile = placesDraft.domicile.trim();
    const coords = placesDraft.domicileCoords;
    saveGoPrefill({
      pickup: domicile,
      destination: '',
      timing: 'now',
      homeDepartmentId: DEFAULT_HERO_DEPARTMENT_ID,
      ...(coords && Number.isFinite(coords.lng) && Number.isFinite(coords.lat)
        ? { pickupLng: coords.lng, pickupLat: coords.lat }
        : {}),
    });
    window.history.pushState({}, '', `${prefix}/go`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    trackEvent('click', 'client_account', 'overview_go_cta');
  }, [language, placesDraft.domicile, placesDraft.domicileCoords]);

  const overviewPlacesPreview = useMemo(() => {
    const out: Array<{ key: string; label: string; address: string; kind: 'home' | 'work' | 'airport' | 'other' }> = [];
    if (placesDraft.domicile.trim()) {
      out.push({
        key: 'domicile',
        label: t('clientAccount.placesHome'),
        address: placesDraft.domicile,
        kind: 'home',
      });
    }
    if (placesDraft.travail.trim()) {
      out.push({
        key: 'travail',
        label: t('clientAccount.placesWork'),
        address: placesDraft.travail,
        kind: 'work',
      });
    }
    for (const row of placesDraft.extras) {
      const address = row.address.trim();
      if (!address) continue;
      const label = row.label.trim() || t('clientAccount.placesExtraLabel');
      const lower = `${label} ${address}`.toLowerCase();
      out.push({
        key: row.id,
        label,
        address,
        kind: lower.includes('aéroport') || lower.includes('aeroport') || lower.includes('airport') ? 'airport' : 'other',
      });
      if (out.length >= 3) break;
    }
    return out.slice(0, 3);
  }, [placesDraft, t]);

  function formatSecurityDate(iso: string): string {
    return new Date(iso).toLocaleDateString(language === 'en' ? 'en-GB' : 'fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  const toggleOAuth = useCallback(
    (key: 'oauthGoogle' | 'oauthFacebook' | 'oauthApple') => {
      const email = activeClientEmail || undefined;
      setSecurity((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        saveClientSecuritySnapshot(next, email);
        trackEvent('click', 'client_account', `oauth_${key}_${next[key] ? 'on' : 'off'}`);
        return next;
      });
    },
    [activeClientEmail]
  );

  const submitPasswordChange = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (newPwd.length < 8) {
        setPwdError(t('clientAccount.securityPasswordTooShort'));
        return;
      }
      if (newPwd !== confirmPwd) {
        setPwdError(t('clientAccount.securityPasswordMismatch'));
        return;
      }
      setPwdError(null);
      setSecurity((prev) => {
        const next: ClientSecuritySnapshot = {
          ...prev,
          passwordLastChangedAt: new Date().toISOString(),
        };
        saveClientSecuritySnapshot(next, activeClientEmail || undefined);
        return next;
      });
      setNewPwd('');
      setConfirmPwd('');
      setPwdPanelOpen(false);
      trackEvent('click', 'client_account', 'password_local_updated');
    },
    [activeClientEmail, newPwd, confirmPwd, t]
  );

  const mainSectionTitle =
    activeNav === 'overview'
      ? 'Palto'
      : activeNav === 'account'
        ? 'Gerer le compte'
      : activeNav === 'personal'
        ? t('clientAccount.navPersonalInfo')
        : activeNav === 'courses'
          ? t('clientAccount.navCourses')
          : activeNav === 'places'
            ? t('clientAccount.navPlaces')
            : activeNav === 'wallet'
              ? t('clientAccount.navWallet')
              : activeNav === 'security'
                ? t('clientAccount.navSecurity')
                : activeNav === 'privacy'
                  ? t('clientAccount.navPrivacy')
                  : activeNav === 'settings'
                    ? t('clientAccount.navSettings')
                    : t('clientAccount.navHelp');

  return (
    <div className="page active">
      <div className="main-accueil">
        <div
          className={`dashboard-container dashboard-container--client-compte ${
            sidebarCollapsed ? 'sidebar-collapsed' : ''
          } ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}
        >
          {isMobileViewport && mobileSidebarOpen && (
            <button
              type="button"
              className="dashboard-mobile-backdrop"
              aria-label={t('clientAccount.closeMenu')}
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}

          <aside className="dashboard-sidebar">
            <div className="dashboard-logo">
              <span className="dashboard-logo-dot" />
              <h2>Palto</h2>
              <button
                className="topbar-icon-btn sidebar-toggle-btn"
                type="button"
                aria-label={sidebarCollapsed ? t('clientAccount.expandNav') : t('clientAccount.collapseNav')}
                onClick={() => setSidebarCollapsed((prev) => !prev)}
              >
                <PanelLeft size={16} />
              </button>
            </div>

            <nav className="dashboard-nav">
              <button
                type="button"
                className={`dashboard-nav-item${activeNav === 'overview' ? ' active' : ''}`}
                aria-current={activeNav === 'overview' ? 'page' : undefined}
                onClick={() => goNav('overview')}
              >
                <span className="nav-icon">
                  <LayoutDashboard size={18} />
                </span>
                <span className="nav-label">{t('clientAccount.navOverview')}</span>
              </button>
              <button
                type="button"
                className={`dashboard-nav-item${activeNav === 'personal' ? ' active' : ''}`}
                aria-current={activeNav === 'personal' ? 'page' : undefined}
                onClick={() => goNav('personal')}
              >
                <span className="nav-icon">
                  <IdCard size={18} />
                </span>
                <span className="nav-label">{t('clientAccount.navPersonalInfo')}</span>
              </button>
              <button
                type="button"
                className={`dashboard-nav-item${activeNav === 'courses' ? ' active' : ''}`}
                aria-current={activeNav === 'courses' ? 'page' : undefined}
                onClick={() => goNav('courses')}
              >
                <span className="nav-icon">
                  <Route size={18} />
                </span>
                <span className="nav-label">{t('clientAccount.navCourses')}</span>
              </button>
              <button
                type="button"
                className={`dashboard-nav-item${activeNav === 'places' ? ' active' : ''}`}
                aria-current={activeNav === 'places' ? 'page' : undefined}
                onClick={() => goNav('places')}
              >
                <span className="nav-icon">
                  <MapPin size={18} />
                </span>
                <span className="nav-label">{t('clientAccount.navPlaces')}</span>
              </button>
              <button
                type="button"
                className={`dashboard-nav-item${activeNav === 'wallet' ? ' active' : ''}`}
                aria-current={activeNav === 'wallet' ? 'page' : undefined}
                onClick={() => goNav('wallet')}
              >
                <span className="nav-icon">
                  <Wallet size={18} />
                </span>
                <span className="nav-label">{t('clientAccount.navWallet')}</span>
              </button>
              <button
                type="button"
                className={`dashboard-nav-item${activeNav === 'security' ? ' active' : ''}`}
                aria-current={activeNav === 'security' ? 'page' : undefined}
                onClick={() => goNav('security')}
              >
                <span className="nav-icon">
                  <Shield size={18} />
                </span>
                <span className="nav-label">{t('clientAccount.navSecurity')}</span>
              </button>
              <button
                type="button"
                className={`dashboard-nav-item${activeNav === 'privacy' ? ' active' : ''}`}
                aria-current={activeNav === 'privacy' ? 'page' : undefined}
                onClick={() => goNav('privacy')}
              >
                <span className="nav-icon">
                  <FileLock size={18} />
                </span>
                <span className="nav-label">{t('clientAccount.navPrivacy')}</span>
              </button>
              <button
                type="button"
                className={`dashboard-nav-item${activeNav === 'settings' ? ' active' : ''}`}
                aria-current={activeNav === 'settings' ? 'page' : undefined}
                onClick={() => goNav('settings')}
              >
                <span className="nav-icon">
                  <Settings size={18} />
                </span>
                <span className="nav-label">{t('clientAccount.navSettings')}</span>
              </button>
              <button
                type="button"
                className={`dashboard-nav-item${activeNav === 'help' ? ' active' : ''}`}
                aria-current={activeNav === 'help' ? 'page' : undefined}
                onClick={() => goNav('help')}
              >
                <span className="nav-icon">
                  <CircleHelp size={18} />
                </span>
                <span className="nav-label">{t('clientAccount.navHelp')}</span>
              </button>
              <button type="button" className="dashboard-nav-item" onClick={handleBackSite}>
                <span className="nav-icon">
                  <ArrowLeft size={18} />
                </span>
                <span className="nav-label">{t('clientAccount.navBackSite')}</span>
              </button>
            </nav>

            <div className="dashboard-user">
              <button type="button" className="dashboard-avatar active" disabled tabIndex={-1}>
                <span className="dashboard-avatar-icon" aria-hidden>
                  <User size={18} />
                </span>
                <span className="dashboard-avatar-meta">
                  <strong>
                    {profile.prenom} {profile.nom}
                  </strong>
                </span>
              </button>
            </div>
          </aside>

          <div className="dashboard-main">
            <header
              className="dashboard-topbar dashboard-topbar--home-client"
            >
              <div className="dashboard-home-topbar-row">
                <div className="dashboard-home-topbar-start">
                  <button
                    type="button"
                    className="dashboard-client-main-title"
                    onClick={handleBackSite}
                  >
                    {mainSectionTitle}
                  </button>
                </div>
                <div className="dashboard-topbar-right" ref={accountMenuRef}>
                  <div className="dashboard-home-topbar-right-cluster">
                    <div className="client-compte-topbar-menu-anchor">
                      <button
                        type="button"
                        className="client-compte-topbar-add-btn"
                        onClick={() => {
                          setCreateRideMenuOpen((prev) => !prev);
                          setAccountModalOpen(false);
                          trackEvent('click', 'client_account', 'open_create_ride_menu');
                        }}
                        aria-label={t('clientAccount.bookRide')}
                      >
                        <Plus size={16} aria-hidden />
                      </button>
                      {createRideMenuOpen ? (
                        <div className="client-compte-account-menu client-compte-account-menu--add" role="menu" aria-label="Commander">
                          <div className="client-compte-account-menu__actions">
                            <button
                              type="button"
                              className="client-compte-account-menu__item"
                              onClick={() => {
                                setCreateRideMenuOpen(false);
                                handleGoPage();
                              }}
                            >
                              {t('clientAccount.bookRide')}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="client-compte-topbar-menu-anchor">
                      <button
                        type="button"
                        className="client-compte-topbar-user-btn"
                        onClick={() => {
                          setAccountModalOpen((prev) => !prev);
                          setCreateRideMenuOpen(false);
                          trackEvent('click', 'client_account', 'open_manage_modal');
                        }}
                        aria-label="Gerer le compte"
                      >
                        {profile.profilePhotoUrl ? (
                          <img
                            src={profile.profilePhotoUrl}
                            alt={t('clientAccount.photoAlt')}
                            className="client-compte-topbar-user-btn__avatar"
                          />
                        ) : (
                          <User size={16} aria-hidden />
                        )}
                        <span>
                          {profile.prenom} {profile.nom}
                        </span>
                      </button>
                      <input
                        ref={topbarPhotoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          void onTopbarPhotoPick(file);
                          e.currentTarget.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                      {accountModalOpen ? (
                        <div className="client-compte-account-menu" role="menu" aria-label="Menu compte">
                          <div className="client-compte-account-menu__head">
                            <strong>
                              {profile.prenom} {profile.nom}
                            </strong>
                            <span>{profile.email}</span>
                          </div>
                          <div className="client-compte-account-menu__actions">
                            <button
                              type="button"
                              className="client-compte-account-menu__item"
                              onClick={() => {
                                goNav('settings');
                                setAccountModalOpen(false);
                              }}
                            >
                              Reglages Palto
                            </button>
                            <button
                              type="button"
                              className="client-compte-account-menu__item"
                              onClick={() => {
                                openManageAccount('personal');
                                setAccountModalOpen(false);
                              }}
                            >
                              Gerer le compte Palto
                            </button>
                            <button
                              type="button"
                              className="client-compte-account-menu__item client-compte-account-menu__item--danger"
                              onClick={handleClientLogout}
                            >
                              {isEn ? 'Sign out' : 'Se deconnecter'}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {activeNav === 'overview' && (
            <div className="dashboard-content">
              <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                {t('clientAccount.lead')}
              </p>
              <section className="client-compte-bento-grid">
                <article className="dashboard-user-card client-compte-bento-card client-compte-bento-card--profile">
                  <div className="dashboard-user-card-head client-compte-profile-head">
                    <div className="dashboard-user-avatar-lg">
                      {profile.profilePhotoUrl ? <img src={profile.profilePhotoUrl} alt={t('clientAccount.photoAlt')} /> : <User size={22} />}
                    </div>
                    <div
                      className="client-compte-profile-meta client-compte-profile-meta--interactive"
                      role="button"
                      tabIndex={0}
                      onClick={() => openManageAccount('personal')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openManageAccount('personal');
                        }
                      }}
                    >
                      <h4 className="client-compte-profile-name">{profile.prenom}</h4>
                      <p className="dashboard-field-hint client-compte-profile-email">
                        {profile.email}
                      </p>
                    </div>
                  </div>
                </article>

                <article
                  className={`dashboard-user-card client-compte-bento-card client-compte-bento-card--ride-featured client-compte-overview-ride-card client-compte-bento-card--clickable${
                    overviewMapBgUrl ? ' client-compte-overview-ride-card--with-map' : ''
                  }`}
                  style={{ backgroundImage: `url(${overviewMapBgUrl})` }}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (clientUpcomingRide || clientLiveMeetActive) {
                      openClientRideTracking();
                      return;
                    }
                    goNav('courses');
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    if (clientUpcomingRide || clientLiveMeetActive) {
                      openClientRideTracking();
                      return;
                    }
                    goNav('courses');
                  }}
                >
                  {clientUpcomingRide ? (
                    <div className="dashboard-home-topbar-upcoming" role="status">
                      <MapPin size={14} className="dashboard-home-topbar-upcoming-ico" aria-hidden />
                      <span className="dashboard-home-topbar-upcoming-label">{t('hero.clientNextRideLabel')}</span>
                      <span className="dashboard-home-topbar-upcoming-route">
                        {clientUpcomingRide.departShort} → {clientUpcomingRide.arriveShort}
                      </span>
                      <span className="dashboard-home-topbar-upcoming-sep" aria-hidden>
                        ·
                      </span>
                      <time className="dashboard-home-topbar-upcoming-time" dateTime={clientUpcomingRide.startsAtIso}>
                        {clientUpcomingRide.startsLabel}
                      </time>
                    </div>
                  ) : (
                    <p className="dashboard-field-hint">{t('clientAccount.coursesRecapLead')}</p>
                  )}
                </article>

                <article
                  className="dashboard-user-card client-compte-bento-card client-compte-bento-card--clickable client-compte-bento-card--courses-featured"
                  role="button"
                  tabIndex={0}
                  onClick={() => goNav('courses')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goNav('courses');
                    }
                  }}
                >
                  <h3 className="client-compte-section-title">
                    <span className="client-compte-section-title__icon" aria-hidden>
                      <Route size={16} />
                    </span>
                    <span>{t('clientAccount.navCourses')}</span>
                  </h3>
                  {overviewRecentRides.length > 0 ? (
                    <ul className="client-compte-overview-rides-list" aria-label={t('clientAccount.coursesRecapTitle')}>
                      {overviewRecentRides.map((ride) => (
                        <li
                          key={ride.id}
                          className="client-compte-overview-rides-list__item"
                          role="button"
                          tabIndex={0}
                          onClick={() => goNav('courses')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              goNav('courses');
                            }
                          }}
                        >
                          <span className="client-compte-overview-rides-list__route">{ride.route}</span>
                          <span className="client-compte-overview-rides-list__meta">
                            {rideRowDateLabel(ride, language)} ·{' '}
                            <span className={`ride-status-badge ride-status-badge--${rideStatusTone(rideRowStatusLabel(ride, language))}`}>
                              {rideRowStatusLabel(ride, language)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="client-compte-overview-empty-state">
                      <p className="dashboard-field-hint">{t('clientAccount.coursesEmptyHint')}</p>
                      <button
                        type="button"
                        className="client-compte-overview-empty-cta"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGoPage();
                        }}
                      >
                        {t('clientAccount.bookRide')}
                      </button>
                    </div>
                  )}
                </article>

                <article
                  className="dashboard-user-card client-compte-bento-card client-compte-bento-card--clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => goNav('wallet')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goNav('wallet');
                    }
                  }}
                >
                  <h3 className="client-compte-section-title">
                    <span className="client-compte-section-title__icon" aria-hidden>
                      <Wallet size={16} />
                    </span>
                    <span>{t('clientAccount.navWallet')}</span>
                  </h3>
                  <p className="client-compte-wallet-balance" aria-live="polite">
                    {formatWalletEUR(wallet.balanceCents, language)}
                  </p>
                  <ul className="client-compte-wallet-mini-list" aria-label={t('clientAccount.walletMovementsTitle')}>
                    {recentRidePrices.map((ride) => (
                      <li
                        key={ride.id}
                        className="client-compte-wallet-mini-list__item"
                        role="button"
                        tabIndex={0}
                        onClick={() => goNav('wallet')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            goNav('wallet');
                          }
                        }}
                      >
                        <span className="client-compte-wallet-mini-list__route">{ride.route}</span>
                        <span className="client-compte-wallet-mini-list__amount">
                          {t('clientAccount.ridePriceEur', { n: String(ride.priceEur) })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>

                <article
                  className="dashboard-user-card client-compte-bento-card client-compte-bento-card--clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => goNav('places')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goNav('places');
                    }
                  }}
                >
                  <h3 className="client-compte-section-title">
                    <span className="client-compte-section-title__icon" aria-hidden>
                      <MapPin size={16} />
                    </span>
                    <span>{t('clientAccount.navPlaces')}</span>
                  </h3>
                  {overviewPlacesPreview.length > 0 ? (
                    <ul className="client-compte-overview-places-list">
                      {overviewPlacesPreview.map((place) => (
                        <li
                          key={place.key}
                          className="client-compte-overview-places-list__item"
                          role="button"
                          tabIndex={0}
                          onClick={() => goNav('places')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              goNav('places');
                            }
                          }}
                        >
                          <span className="client-compte-overview-places-list__icon" aria-hidden>
                            {place.kind === 'home' ? (
                              <House size={14} />
                            ) : place.kind === 'work' ? (
                              <Briefcase size={14} />
                            ) : place.kind === 'airport' ? (
                              <Plane size={14} />
                            ) : (
                              <MapPin size={14} />
                            )}
                          </span>
                          <span className="client-compte-overview-places-list__content">
                            <span className="client-compte-overview-places-list__label">{place.label}</span>
                            <span className="client-compte-overview-places-list__text">{place.address}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="dashboard-field-hint">{t('clientAccount.placesOverviewHint')}</p>
                  )}
                </article>
              </section>
            </div>
            )}

            {activeNav === 'account' && (
            <div className="dashboard-content">
              <ClientAccountBackToOverviewButton
                onClick={() => goNav('overview')}
                label={t('clientAccount.navBackOverview')}
                ariaLabel={t('clientAccount.navBackOverviewAria')}
              />
              <section className="client-compte-account-layout">
                <aside className="client-compte-account-sidebar">
                  <div className="client-compte-account-profile">
                    <label className="client-compte-account-avatar-uploader">
                      <span className="client-compte-account-avatar-uploader__visual">
                        <span className="dashboard-user-avatar-lg">
                          {profile.profilePhotoUrl ? (
                            <img src={profile.profilePhotoUrl} alt="" />
                          ) : (
                            <User size={22} aria-hidden />
                          )}
                        </span>
                        <span className="client-compte-account-avatar-uploader__overlay" aria-hidden>
                          <Pencil size={22} strokeWidth={2.25} />
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          aria-label={t('clientAccount.changeProfilePhotoAria')}
                          className="client-compte-account-avatar-uploader__input"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            void onTopbarPhotoPick(file);
                            e.currentTarget.value = '';
                          }}
                        />
                      </span>
                    </label>
                    <div className="client-compte-account-profile-meta">
                      <strong>{profile.prenom} {profile.nom}</strong>
                      <span>{profile.email}</span>
                    </div>
                  </div>
                  <nav className="client-compte-account-nav" aria-label={isEn ? 'Account sections' : 'Sections du compte'}>
                    <button type="button" className={`client-compte-account-nav-item${accountManageSection === 'personal' ? ' is-active' : ''}`} onClick={() => openManageAccount('personal')}>
                      <span className="nav-icon" aria-hidden><IdCard size={16} /></span>
                      <span>{isEn ? 'Personal info' : 'Infos personnel'}</span>
                    </button>
                    <button type="button" className={`client-compte-account-nav-item${accountManageSection === 'security' ? ' is-active' : ''}`} onClick={() => openManageAccount('security')}>
                      <span className="nav-icon" aria-hidden><Shield size={16} /></span>
                      <span>{isEn ? 'Security' : 'Securite'}</span>
                    </button>
                    <button type="button" className={`client-compte-account-nav-item${accountManageSection === 'payment' ? ' is-active' : ''}`} onClick={() => openManageAccount('payment')}>
                      <span className="nav-icon" aria-hidden><Wallet size={16} /></span>
                      <span>{isEn ? 'Payment' : 'Paiement'}</span>
                    </button>
                    <button type="button" className={`client-compte-account-nav-item${accountManageSection === 'privacy' ? ' is-active' : ''}`} onClick={() => openManageAccount('privacy')}>
                      <span className="nav-icon" aria-hidden><FileLock size={16} /></span>
                      <span>{isEn ? 'Data privacy' : 'Confidentialite de donnee'}</span>
                    </button>
                    <button type="button" className={`client-compte-account-nav-item${accountManageSection === 'help' ? ' is-active' : ''}`} onClick={() => openManageAccount('help')}>
                      <span className="nav-icon" aria-hidden><CircleHelp size={16} /></span>
                      <span>{isEn ? 'Help' : 'Aides'}</span>
                    </button>
                  </nav>
                </aside>
                <div className="client-compte-account-main">
                  <header className="client-compte-account-main-head">
                    <h3>
                      {accountManageSection === 'personal'
                        ? (isEn ? 'Personal information' : 'Informations personnelles')
                        : accountManageSection === 'security'
                          ? (isEn ? 'Sign-in and security' : 'Connexion et securite')
                          : accountManageSection === 'payment'
                            ? (isEn ? 'Payment methods' : 'Moyens de paiement')
                          : accountManageSection === 'privacy'
                            ? (isEn ? 'Data privacy' : 'Confidentialite de donnee')
                            : (isEn ? 'Help' : 'Aides')}
                    </h3>
                    <p className="dashboard-field-hint">
                      {accountManageSection === 'personal'
                        ? t('clientAccount.personalHint')
                        : accountManageSection === 'security'
                          ? t('clientAccount.securityPasswordTitle')
                          : accountManageSection === 'payment'
                            ? (isEn ? 'Manage your cards and default payment method.' : 'Gerez vos cartes et votre moyen de paiement par defaut.')
                          : accountManageSection === 'privacy'
                            ? t('clientAccount.sectionPlaceholder')
                            : t('clientAccount.helpLead')}
                    </p>
                  </header>
                  {accountManageSection === 'payment' ? (
                    <section className="client-compte-payment-layout">
                      {pendingWalletTopupEur != null && stripeOn && stripePk ? (
                        <article className="dashboard-user-card client-compte-payment-topup-pending">
                          <h4 className="client-compte-section-title">
                            {isEn ? 'Wallet top-up' : 'Recharge portefeuille'}
                          </h4>
                          <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
                            {isEn
                              ? `Amount: ${formatWalletEUR(pendingWalletTopupEur * 100, language)}. Add or select a card below, with billing address.`
                              : `Montant : ${formatWalletEUR(pendingWalletTopupEur * 100, language)}. Ajoutez ou choisissez une carte ci-dessous (adresse de facturation requise).`}
                          </p>
                          {walletTopupClientSecret ? (
                            <>
                              <PaltoStripeTestCardHint className="client-compte-payment-test-hint" />
                              <PaltoStripePaymentForm
                                publishableKey={stripePk}
                                clientSecret={walletTopupClientSecret}
                                stripeCustomerId={stripeCustomerId}
                                onSuccess={handleWalletTopUpSuccess}
                                onError={(msg) => toast.error(msg)}
                                submitLabel={
                                  isEn
                                    ? `Pay ${formatWalletEUR(pendingWalletTopupEur * 100, language)}`
                                    : `Payer ${formatWalletEUR(pendingWalletTopupEur * 100, language)}`
                                }
                              />
                              <button
                                type="button"
                                className="dashboard-user-edit-btn dashboard-user-edit-btn--secondary"
                                style={{ marginTop: 8 }}
                                onClick={cancelWalletTopUp}
                              >
                                {isEn ? 'Cancel top-up' : 'Annuler la recharge'}
                              </button>
                            </>
                          ) : (
                            <div className="dashboard-payment-actions">
                              <button
                                type="button"
                                className="dashboard-user-edit-btn"
                                disabled={
                                  walletTopupLoading ||
                                  !isClientAuthenticated() ||
                                  stripePaymentMethods.length === 0
                                }
                                onClick={() => void startWalletTopUp()}
                              >
                                {walletTopupLoading
                                  ? isEn
                                    ? 'Preparing…'
                                    : 'Preparation…'
                                  : stripePaymentMethods.length === 0
                                    ? isEn
                                      ? 'Add a card first'
                                      : "Ajoutez une carte d'abord"
                                    : isEn
                                      ? 'Continue to payment'
                                      : 'Continuer vers le paiement'}
                              </button>
                              <button
                                type="button"
                                className="dashboard-user-edit-btn dashboard-user-edit-btn--secondary"
                                style={{ marginLeft: 8 }}
                                onClick={cancelWalletTopUp}
                              >
                                {isEn ? 'Cancel' : 'Annuler'}
                              </button>
                            </div>
                          )}
                        </article>
                      ) : null}
                      <p className="client-compte-payment-stripe-notice" role="status">
                        {stripeOn
                          ? isEn
                            ? 'Save a card with Stripe (test: 4242…). Billing address is required. Used for Go rides and wallet top-ups.'
                            : 'Enregistrez une carte Stripe (test : 4242…). Adresse de facturation obligatoire. Utilisable pour Go et le portefeuille.'
                          : stripeCheckoutEnabled()
                            ? isEn
                              ? 'Sign in to save a card with Stripe.'
                              : 'Connectez-vous pour enregistrer une carte Stripe.'
                            : isEn
                              ? 'Online card payment is not configured yet. Rides can be paid directly to the driver.'
                              : 'Le paiement carte en ligne n est pas encore configure. Reglement prevu avec le chauffeur.'}
                      </p>

                      {stripeOn ? <PaltoStripeTestCardHint className="client-compte-payment-test-hint" /> : null}

                      <div className="client-compte-payment-row">
                        <div className="client-compte-payment-cards-list">
                        {stripeOn ? (
                          stripePaymentMethods.length > 0 ? (
                            stripePaymentMethods.map((pm) => (
                              <article key={pm.id} className="dashboard-user-card client-compte-payment-card">
                                <div className="client-compte-payment-card-main">
                                  <div>
                                    <div className="client-compte-payment-card-head">
                                      <strong>{formatStripeCardBrand(pm.brand)}</strong>
                                      <span>•••• {pm.last4}</span>
                                    </div>
                                    <p className="dashboard-field-hint" style={{ margin: '6px 0 0' }}>
                                      {String(pm.expMonth).padStart(2, '0')}/{String(pm.expYear).slice(-2)}
                                      {pm.billing?.line1
                                        ? ` · ${pm.billing.city || pm.billing.line1}`
                                        : ''}
                                    </p>
                                  </div>
                                  <div className="client-compte-payment-card-brand" aria-hidden>
                                    {formatStripeCardBrand(pm.brand).toUpperCase().slice(0, 4)}
                                  </div>
                                </div>
                                <div className="client-compte-payment-card-toolbar">
                                  <button
                                    type="button"
                                    className="client-compte-payment-card-action"
                                    onClick={() => openPaymentMethodView(pm)}
                                  >
                                    {isEn ? 'View' : 'Voir'}
                                  </button>
                                  <button
                                    type="button"
                                    className="client-compte-payment-card-action"
                                    onClick={() => openPaymentMethodEdit(pm)}
                                  >
                                    {isEn ? 'Edit' : 'Modifier'}
                                  </button>
                                  <button
                                    type="button"
                                    className="client-compte-payment-card-action client-compte-payment-card-action--danger"
                                    onClick={() => deletePaymentMethod(pm)}
                                  >
                                    {isEn ? 'Remove' : 'Supprimer'}
                                  </button>
                                </div>
                              </article>
                            ))
                          ) : (
                            <article className="dashboard-user-card client-compte-payment-card client-compte-payment-address-card--empty">
                              <p className="dashboard-field-hint" style={{ margin: 0 }}>
                                {isEn
                                  ? 'No card on file yet. Add one below with Stripe Elements.'
                                  : 'Aucune carte enregistree. Ajoutez-en une ci-dessous via Stripe.'}
                              </p>
                            </article>
                          )
                        ) : savedPaymentMethods.length > 0 ? (
                          savedPaymentMethods.map((pm) => (
                            <article key={pm.id} className="dashboard-user-card client-compte-payment-card">
                              <div className="client-compte-payment-card-main">
                                <div className="client-compte-payment-card-head">
                                  <strong>{pm.brand}</strong>
                                  <span>•••• {pm.last4}</span>
                                </div>
                                <p className="dashboard-field-hint" style={{ margin: '6px 0 0' }}>
                                  {pm.cardholderName} · {pm.expiryMonth}/{pm.expiryYear}
                                </p>
                                <div className="client-compte-payment-card-brand" aria-hidden>
                                  {pm.brand.toUpperCase().slice(0, 4)}
                                </div>
                              </div>
                            </article>
                          ))
                        ) : (
                          <article className="dashboard-user-card client-compte-payment-card client-compte-payment-address-card--empty">
                            <p className="dashboard-field-hint" style={{ margin: 0 }}>
                              {isEn
                                ? 'No card saved yet. Configure Stripe to save cards securely.'
                                : 'Aucune carte enregistree. Configurez Stripe pour enregistrer une carte.'}
                            </p>
                          </article>
                        )}
                        </div>
                        <div className="client-compte-payment-actions">
                          <button
                            type="button"
                            className="client-compte-payment-link"
                            onClick={openPaymentModal}
                            disabled={stripeOn && !isClientAuthenticated()}
                          >
                            {isEn ? 'Add payment method' : 'Ajouter un mode de paiement'}
                          </button>
                        </div>
                      </div>

                      {stripeOn && stripePaymentMethods[0]?.billing?.line1 ? (
                        <>
                          <h4 className="client-compte-payment-delivery-title">
                            {isEn ? 'Billing address' : 'Adresse de facturation'}
                          </h4>
                          <article className="dashboard-user-card client-compte-payment-address-card">
                            <p style={{ margin: 0 }}>
                              {stripePaymentMethods[0].billing?.name ? (
                                <>
                                  {stripePaymentMethods[0].billing.name}
                                  <br />
                                </>
                              ) : null}
                              {formatStripeBillingLines(stripePaymentMethods[0].billing).map((line) => (
                                <span key={line}>
                                  {line}
                                  <br />
                                </span>
                              ))}
                            </p>
                          </article>
                        </>
                      ) : null}
                      {!stripeOn && savedPaymentMethods[0] ? (
                        <>
                          <h4 className="client-compte-payment-delivery-title">
                            {isEn ? 'Billing address' : 'Adresse de facturation'}
                          </h4>
                          <article className="dashboard-user-card client-compte-payment-address-card">
                            <p style={{ margin: 0 }}>
                              {savedPaymentMethods[0].billing.addressLine1}
                              <br />
                              {savedPaymentMethods[0].billing.postalCode} {savedPaymentMethods[0].billing.city}
                              <br />
                              {savedPaymentMethods[0].billing.country}
                            </p>
                          </article>
                        </>
                      ) : null}
                    </section>
                  ) : (
                  <section className="client-compte-manage-grid">
                    <article
                      className="dashboard-user-card client-compte-bento-card client-compte-account-tile"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const value = accountManageSection === 'personal'
                          ? `${profile.prenom} ${profile.nom}`
                          : accountManageSection === 'security'
                            ? `${'•'.repeat(10)} · ${formatSecurityDate(security.passwordLastChangedAt)}`
                            : accountManageSection === 'payment'
                              ? (isEn ? 'Default card' : 'Carte par defaut')
                            : accountManageSection === 'privacy'
                              ? 'Controle de vos donnees personnelles.'
                              : 'Consultez les sujets les plus frequents.';
                        const key = `${accountManageSection}-card-1`;
                        openAccountEditModal(
                          key,
                          accountManageSection === 'security'
                            ? (isEn ? 'Change password' : 'Modifier le mot de passe')
                            : (isEn ? 'Edit' : 'Modifier'),
                          accountCardOverrides[key] ?? value
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          const value = accountManageSection === 'personal'
                            ? `${profile.prenom} ${profile.nom}`
                            : accountManageSection === 'security'
                              ? `${'•'.repeat(10)} · ${formatSecurityDate(security.passwordLastChangedAt)}`
                              : accountManageSection === 'privacy'
                                ? 'Controle de vos donnees personnelles.'
                                : 'Consultez les sujets les plus frequents.';
                          const key = `${accountManageSection}-card-1`;
                          openAccountEditModal(
                            key,
                            accountManageSection === 'security'
                              ? (isEn ? 'Change password' : 'Modifier le mot de passe')
                              : (isEn ? 'Edit' : 'Modifier'),
                            accountCardOverrides[key] ?? value
                          );
                        }
                      }}
                    >
                      <h4 className="client-compte-section-title">
                        {accountManageSection === 'personal'
                          ? 'Nom'
                          : accountManageSection === 'security'
                            ? (isEn ? 'Password' : 'Mot de passe')
                            : accountManageSection === 'payment'
                              ? (isEn ? 'Default payment' : 'Paiement par defaut')
                            : accountManageSection === 'privacy'
                              ? (isEn ? 'Privacy' : 'Confidentialite')
                              : (isEn ? 'Help' : 'Aide')}
                      </h4>
                      <p className="dashboard-field-hint">
                        {accountCardOverrides[`${accountManageSection}-card-1`] ?? (accountManageSection === 'personal'
                          ? `${profile.prenom} ${profile.nom}`
                          : accountManageSection === 'security'
                            ? `${'•'.repeat(10)} · ${formatSecurityDate(security.passwordLastChangedAt)}`
                            : accountManageSection === 'payment'
                              ? (isEn ? 'Visa •••• 4242' : 'Visa •••• 4242')
                            : accountManageSection === 'privacy'
                              ? (isEn ? 'Control your personal data.' : 'Controle de vos donnees personnelles.')
                              : (isEn ? 'Browse frequent topics.' : 'Consultez les sujets les plus frequents.'))}
                      </p>
                      <span className="client-compte-account-tile-icon" aria-hidden>
                        {accountManageSection === 'personal' ? (
                          <IdCard size={16} />
                        ) : accountManageSection === 'security' ? (
                          <Shield size={16} />
                        ) : accountManageSection === 'payment' ? (
                          <Wallet size={16} />
                        ) : accountManageSection === 'privacy' ? (
                          <FileLock size={16} />
                        ) : (
                          <CircleHelp size={16} />
                        )}
                      </span>
                    </article>
                    <article
                      className="dashboard-user-card client-compte-bento-card client-compte-account-tile"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const value = accountManageSection === 'personal'
                          ? profile.telephone
                          : accountManageSection === 'security'
                            ? (isEn ? 'Two-step verification and sign-in alerts.' : 'Double verification et alertes de connexion.')
                            : accountManageSection === 'payment'
                              ? (isEn ? 'Edit your card details.' : 'Modifiez les informations de votre carte.')
                            : accountManageSection === 'privacy'
                              ? t('clientAccount.sectionPlaceholder')
                              : t('clientAccount.helpLead');
                        const key = `${accountManageSection}-card-2`;
                        openAccountEditModal(key, isEn ? 'Edit' : 'Modifier', accountCardOverrides[key] ?? value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          const value = accountManageSection === 'personal'
                            ? profile.telephone
                            : accountManageSection === 'security'
                              ? (isEn ? 'Two-step verification and sign-in alerts.' : 'Double verification et alertes de connexion.')
                              : accountManageSection === 'payment'
                                ? (isEn ? 'Edit your card details.' : 'Modifiez les informations de votre carte.')
                              : accountManageSection === 'privacy'
                                ? t('clientAccount.sectionPlaceholder')
                                : t('clientAccount.helpLead');
                          const key = `${accountManageSection}-card-2`;
                          openAccountEditModal(key, isEn ? 'Edit' : 'Modifier', accountCardOverrides[key] ?? value);
                        }
                      }}
                    >
                      <h4 className="client-compte-section-title">
                        {accountManageSection === 'personal'
                          ? 'Telephone'
                          : accountManageSection === 'security'
                            ? 'Mot de passe'
                            : accountManageSection === 'payment'
                              ? (isEn ? 'Card details' : 'Infos carte')
                            : accountManageSection === 'privacy'
                              ? 'Partage des donnees'
                              : 'Support'}
                      </h4>
                      <p className="dashboard-field-hint">
                        {accountCardOverrides[`${accountManageSection}-card-2`] ?? (accountManageSection === 'personal'
                          ? profile.telephone
                          : accountManageSection === 'security'
                            ? (isEn ? 'Two-step verification and sign-in alerts.' : 'Double verification et alertes de connexion.')
                            : accountManageSection === 'payment'
                              ? (isEn ? 'Expires 07/29 · John Doe' : 'Expire 07/29 · John Doe')
                            : accountManageSection === 'privacy'
                              ? t('clientAccount.sectionPlaceholder')
                              : t('clientAccount.helpLead'))}
                      </p>
                      <span className="client-compte-account-tile-icon" aria-hidden>
                        {accountManageSection === 'personal' ? (
                          <Phone size={16} />
                        ) : accountManageSection === 'security' ? (
                          <Shield size={16} />
                        ) : accountManageSection === 'payment' ? (
                          <Wallet size={16} />
                        ) : accountManageSection === 'privacy' ? (
                          <FileLock size={16} />
                        ) : (
                          <CircleHelp size={16} />
                        )}
                      </span>
                    </article>
                    <article
                      className="dashboard-user-card client-compte-bento-card client-compte-account-tile"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const value = accountManageSection === 'personal'
                          ? profile.email
                          : accountManageSection === 'security'
                            ? 'Sessions actives et appareils connectes.'
                            : accountManageSection === 'payment'
                              ? (isEn ? 'Billing history and invoices.' : 'Historique des paiements et factures.')
                            : accountManageSection === 'privacy'
                              ? t('clientAccount.sectionPlaceholder')
                              : t('clientAccount.helpLead');
                        const key = `${accountManageSection}-card-3`;
                        openAccountEditModal(key, isEn ? 'Edit' : 'Modifier', accountCardOverrides[key] ?? value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          const value = accountManageSection === 'personal'
                            ? profile.email
                            : accountManageSection === 'security'
                              ? 'Sessions actives et appareils connectes.'
                              : accountManageSection === 'payment'
                                ? (isEn ? 'Billing history and invoices.' : 'Historique des paiements et factures.')
                              : accountManageSection === 'privacy'
                                ? t('clientAccount.sectionPlaceholder')
                                : t('clientAccount.helpLead');
                          const key = `${accountManageSection}-card-3`;
                          openAccountEditModal(key, isEn ? 'Edit' : 'Modifier', accountCardOverrides[key] ?? value);
                        }
                      }}
                    >
                      <h4 className="client-compte-section-title">
                        {accountManageSection === 'personal'
                          ? 'Email'
                          : accountManageSection === 'security'
                            ? 'Appareils'
                            : accountManageSection === 'payment'
                              ? (isEn ? 'History' : 'Historique')
                            : accountManageSection === 'privacy'
                              ? 'Export de donnees'
                              : 'FAQ'}
                      </h4>
                      <p className="dashboard-field-hint">
                        {accountCardOverrides[`${accountManageSection}-card-3`] ?? (accountManageSection === 'personal'
                          ? profile.email
                          : accountManageSection === 'security'
                            ? 'Sessions actives et appareils connectes.'
                            : accountManageSection === 'payment'
                              ? (isEn ? 'Last payment: €24.00 · 04/05/2026' : 'Dernier paiement : 24 € · 05/04/2026')
                            : accountManageSection === 'privacy'
                              ? t('clientAccount.sectionPlaceholder')
                              : t('clientAccount.helpLead'))}
                      </p>
                      <span className="client-compte-account-tile-icon" aria-hidden>
                        {accountManageSection === 'personal' ? (
                          <Mail size={16} />
                        ) : accountManageSection === 'security' ? (
                          <Shield size={16} />
                        ) : accountManageSection === 'payment' ? (
                          <Wallet size={16} />
                        ) : accountManageSection === 'privacy' ? (
                          <FileLock size={16} />
                        ) : (
                          <CircleHelp size={16} />
                        )}
                      </span>
                    </article>
                    <article
                      className="dashboard-user-card client-compte-bento-card client-compte-account-tile"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const value = accountManageSection === 'personal'
                          ? (language === 'en' ? 'English' : 'Francais')
                          : accountManageSection === 'security'
                            ? 'Protection des connexions et alertes.'
                            : accountManageSection === 'payment'
                              ? (isEn ? 'Enable payment alerts.' : 'Activer les alertes de paiement.')
                            : accountManageSection === 'privacy'
                              ? 'Gerer la conservation des informations.'
                              : (isEn ? 'Contact the Palto team.' : 'Contacter l equipe Palto.');
                        const key = `${accountManageSection}-card-4`;
                        openAccountEditModal(key, isEn ? 'Edit' : 'Modifier', accountCardOverrides[key] ?? value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          const value = accountManageSection === 'personal'
                            ? (language === 'en' ? 'English' : 'Francais')
                            : accountManageSection === 'security'
                              ? 'Protection des connexions et alertes.'
                              : accountManageSection === 'payment'
                                ? (isEn ? 'Enable payment alerts.' : 'Activer les alertes de paiement.')
                              : accountManageSection === 'privacy'
                                ? 'Gerer la conservation des informations.'
                                : (isEn ? 'Contact the Palto team.' : 'Contacter l equipe Palto.');
                          const key = `${accountManageSection}-card-4`;
                          openAccountEditModal(key, isEn ? 'Edit' : 'Modifier', accountCardOverrides[key] ?? value);
                        }
                      }}
                    >
                      <h4 className="client-compte-section-title">
                        {accountManageSection === 'personal'
                          ? 'Langue'
                          : accountManageSection === 'security'
                            ? 'Verification'
                            : accountManageSection === 'payment'
                              ? (isEn ? 'Alerts' : 'Alertes')
                            : accountManageSection === 'privacy'
                              ? 'Suppression'
                              : 'Contact'}
                      </h4>
                      <p className="dashboard-field-hint">
                        {accountCardOverrides[`${accountManageSection}-card-4`] ?? (accountManageSection === 'personal'
                          ? (language === 'en' ? 'English' : 'Francais')
                          : accountManageSection === 'security'
                            ? 'Protection des connexions et alertes.'
                            : accountManageSection === 'payment'
                              ? (isEn ? 'Email and push notifications enabled.' : 'Notifications email et push activees.')
                            : accountManageSection === 'privacy'
                              ? 'Gerer la conservation des informations.'
                              : (isEn ? 'Contact the Palto team.' : 'Contacter l equipe Palto.'))}
                      </p>
                      <span className="client-compte-account-tile-icon" aria-hidden>
                        {accountManageSection === 'personal' ? (
                          <Settings size={16} />
                        ) : accountManageSection === 'security' ? (
                          <Shield size={16} />
                        ) : accountManageSection === 'payment' ? (
                          <Wallet size={16} />
                        ) : accountManageSection === 'privacy' ? (
                          <FileLock size={16} />
                        ) : (
                          <CircleHelp size={16} />
                        )}
                      </span>
                    </article>
                  </section>
                  )}
                </div>
              </section>
            </div>
            )}
            {accountEditModal.open ? (
              <div className="client-compte-account-edit-modal-backdrop" role="presentation" onClick={closeAccountEditModal}>
                <div
                  className="client-compte-account-edit-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label={isEn ? 'Edit card' : 'Modifier la carte'}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="client-compte-account-edit-modal-head">
                    <h4>{accountEditModal.title}</h4>
                  </div>
                  <div className="client-compte-account-edit-modal-grid">
                    {accountEditModal.fields.map((field) => (
                      <label key={field.id} className="client-compte-account-edit-modal-row">
                        <span>{field.label}</span>
                        {field.type === 'select' ? (
                          <select
                            className={`client-compte-account-edit-modal-input${accountEditErrors[field.id] ? ' is-invalid' : ''}`}
                            value={field.value}
                            onChange={(e) => {
                              const nextValue = e.target.value;
                              setAccountEditModal((prev) => ({
                                ...prev,
                                fields: prev.fields.map((f) => (f.id === field.id ? { ...f, value: nextValue } : f)),
                              }));
                              setAccountEditErrors((prev) => {
                                if (!prev[field.id]) return prev;
                                const next = { ...prev };
                                delete next[field.id];
                                return next;
                              });
                            }}
                          >
                            {(field.options ?? []).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type === 'password' ? 'password' : 'text'}
                            className={`client-compte-account-edit-modal-input${accountEditErrors[field.id] ? ' is-invalid' : ''}`}
                            value={field.value}
                            onChange={(e) =>
                              {
                                const nextValue = e.target.value;
                                setAccountEditModal((prev) => ({
                                  ...prev,
                                  fields: prev.fields.map((f) => (f.id === field.id ? { ...f, value: nextValue } : f)),
                                }));
                                setAccountEditErrors((prev) => {
                                  if (!prev[field.id]) return prev;
                                  const next = { ...prev };
                                  delete next[field.id];
                                  return next;
                                });
                              }
                            }
                          />
                        )}
                        {accountEditErrors[field.id] ? (
                          <small className="client-compte-account-edit-modal-error">{accountEditErrors[field.id]}</small>
                        ) : null}
                      </label>
                    ))}
                  </div>
                  <div className="client-compte-account-edit-modal-actions">
                    <button type="button" className="dashboard-user-edit-btn dashboard-user-edit-btn--secondary" onClick={closeAccountEditModal}>
                      {isEn ? 'Cancel' : 'Annuler'}
                    </button>
                    <button type="button" className="dashboard-user-edit-btn" onClick={saveAccountEditModal}>
                      {isEn ? 'Save' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {paymentViewPm ? (
              <div className="client-compte-account-edit-modal-backdrop" role="presentation" onClick={closePaymentMethodView}>
                <div
                  className="client-compte-account-edit-modal client-compte-payment-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label={isEn ? 'Card details' : 'Details de la carte'}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="client-compte-account-edit-modal-head">
                    <h4>{isEn ? 'Card details' : 'Details de la carte'}</h4>
                  </div>
                  <div className="client-compte-account-edit-modal-body">
                    <p style={{ margin: '0 0 8px' }}>
                      <strong>{formatStripeCardBrand(paymentViewPm.brand)}</strong> •••• {paymentViewPm.last4}
                    </p>
                    <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
                      {String(paymentViewPm.expMonth).padStart(2, '0')}/{String(paymentViewPm.expYear).slice(-2)}
                    </p>
                    <h5 className="client-compte-payment-delivery-title" style={{ marginTop: 0 }}>
                      {isEn ? 'Billing address' : 'Adresse de facturation'}
                    </h5>
                    {paymentViewPm.billing?.line1 ? (
                      <p style={{ margin: 0 }}>
                        {paymentViewPm.billing.name ? (
                          <>
                            {paymentViewPm.billing.name}
                            <br />
                          </>
                        ) : null}
                        {formatStripeBillingLines(paymentViewPm.billing).map((line) => (
                          <span key={line}>
                            {line}
                            <br />
                          </span>
                        ))}
                      </p>
                    ) : (
                      <p className="dashboard-field-hint" style={{ margin: 0 }}>
                        {isEn ? 'No billing address on file.' : 'Aucune adresse de facturation enregistree.'}
                      </p>
                    )}
                  </div>
                  <div className="client-compte-account-edit-modal-actions">
                    <button type="button" className="dashboard-user-edit-btn" onClick={closePaymentMethodView}>
                      {isEn ? 'Close' : 'Fermer'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {paymentEditPm ? (
              <div className="client-compte-account-edit-modal-backdrop" role="presentation" onClick={closePaymentMethodEdit}>
                <div
                  className="client-compte-account-edit-modal client-compte-payment-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label={isEn ? 'Edit billing address' : 'Modifier adresse de facturation'}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="client-compte-account-edit-modal-head">
                    <h4>{isEn ? 'Edit billing address' : 'Modifier adresse de facturation'}</h4>
                    <p className="dashboard-field-hint" style={{ margin: '8px 0 0' }}>
                      {formatStripeCardBrand(paymentEditPm.brand)} •••• {paymentEditPm.last4}
                    </p>
                  </div>
                  <div className="client-compte-account-edit-modal-grid">
                    <label className="client-compte-account-edit-modal-row">
                      <span>{isEn ? 'Name' : 'Nom'}</span>
                      <input
                        className="client-compte-account-edit-modal-input"
                        value={paymentEditForm.name}
                        onChange={(e) => setPaymentEditForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    </label>
                    <label className="client-compte-account-edit-modal-row">
                      <span>{isEn ? 'Address' : 'Adresse'}</span>
                      <input
                        className="client-compte-account-edit-modal-input"
                        value={paymentEditForm.line1}
                        onChange={(e) => setPaymentEditForm((p) => ({ ...p, line1: e.target.value }))}
                      />
                    </label>
                    <label className="client-compte-account-edit-modal-row">
                      <span>{isEn ? 'Address line 2' : 'Complement'}</span>
                      <input
                        className="client-compte-account-edit-modal-input"
                        value={paymentEditForm.line2}
                        onChange={(e) => setPaymentEditForm((p) => ({ ...p, line2: e.target.value }))}
                      />
                    </label>
                    <div className="client-compte-payment-modal-row-2">
                      <label className="client-compte-account-edit-modal-row">
                        <span>{isEn ? 'City' : 'Ville'}</span>
                        <input
                          className="client-compte-account-edit-modal-input"
                          value={paymentEditForm.city}
                          onChange={(e) => setPaymentEditForm((p) => ({ ...p, city: e.target.value }))}
                        />
                      </label>
                      <label className="client-compte-account-edit-modal-row">
                        <span>{isEn ? 'Postal code' : 'Code postal'}</span>
                        <input
                          className="client-compte-account-edit-modal-input"
                          value={paymentEditForm.postalCode}
                          onChange={(e) => setPaymentEditForm((p) => ({ ...p, postalCode: e.target.value }))}
                        />
                      </label>
                    </div>
                    <label className="client-compte-account-edit-modal-row">
                      <span>{isEn ? 'Country' : 'Pays'}</span>
                      <select
                        className="client-compte-account-edit-modal-input"
                        value={paymentEditForm.country}
                        onChange={(e) => setPaymentEditForm((p) => ({ ...p, country: e.target.value }))}
                      >
                        <option value="FR">France</option>
                        <option value="RE">La Reunion</option>
                        <option value="MU">Maurice</option>
                      </select>
                    </label>
                  </div>
                  <div className="client-compte-account-edit-modal-actions">
                    <button
                      type="button"
                      className="dashboard-user-edit-btn dashboard-user-edit-btn--secondary"
                      onClick={closePaymentMethodEdit}
                    >
                      {isEn ? 'Cancel' : 'Annuler'}
                    </button>
                    <button
                      type="button"
                      className="dashboard-user-edit-btn"
                      disabled={paymentEditSaving}
                      onClick={() => void savePaymentMethodEdit()}
                    >
                      {paymentEditSaving ? (isEn ? 'Saving…' : 'Enregistrement…') : isEn ? 'Save' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {paymentModalOpen ? (
              <div className="client-compte-account-edit-modal-backdrop" role="presentation" onClick={closePaymentModal}>
                <div
                  className="client-compte-account-edit-modal client-compte-payment-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label={isEn ? 'Add payment method' : 'Ajouter un mode de paiement'}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="client-compte-account-edit-modal-head">
                    <h4>{isEn ? 'Add payment method' : 'Ajouter un mode de paiement'}</h4>
                  </div>
                  <div className="client-compte-account-edit-modal-body">
                  {stripeOn && stripePk ? (
                    <>
                      <p className="dashboard-field-hint" style={{ margin: '0 0 8px' }}>
                        {isEn
                          ? 'Card number, expiry, CVC and full billing address are required.'
                          : 'Numero de carte, expiration, CVC et adresse de facturation complets sont requis.'}
                      </p>
                      <PaltoStripeTestCardHint className="client-compte-payment-test-hint" />
                      {paymentModalLoading || !setupClientSecret ? (
                        <p className="dashboard-field-hint" style={{ margin: '12px 0' }}>
                          {isEn ? 'Loading secure form…' : 'Chargement du formulaire securise…'}
                        </p>
                      ) : (
                        <PaltoStripeSetupForm
                          publishableKey={stripePk}
                          clientSecret={setupClientSecret}
                          customerEmail={activeClientEmail || profile.email.trim()}
                          onSuccess={handleSetupCardSuccess}
                          onError={(msg) => toast.error(msg)}
                          submitLabel={isEn ? 'Save card' : 'Enregistrer la carte'}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <div className="client-compte-account-edit-modal-grid client-compte-account-edit-modal-grid--nested">
                        <label className="client-compte-account-edit-modal-row">
                          <span>{isEn ? 'Card number' : 'Numero de carte'}</span>
                          <input className={`client-compte-account-edit-modal-input${paymentErrors.cardNumber ? ' is-invalid' : ''}`} value={paymentForm.cardNumber} onChange={(e) => setPaymentForm((p) => ({ ...p, cardNumber: e.target.value }))} />
                          {paymentErrors.cardNumber ? <small className="client-compte-account-edit-modal-error">{paymentErrors.cardNumber}</small> : null}
                        </label>
                        <label className="client-compte-account-edit-modal-row">
                          <span>{isEn ? 'Cardholder name' : 'Nom du titulaire'}</span>
                          <input className={`client-compte-account-edit-modal-input${paymentErrors.cardholderName ? ' is-invalid' : ''}`} value={paymentForm.cardholderName} onChange={(e) => setPaymentForm((p) => ({ ...p, cardholderName: e.target.value }))} />
                          {paymentErrors.cardholderName ? <small className="client-compte-account-edit-modal-error">{paymentErrors.cardholderName}</small> : null}
                        </label>
                        <div className="client-compte-payment-modal-row-3">
                          <label className="client-compte-account-edit-modal-row">
                            <span>MM</span>
                            <input className={`client-compte-account-edit-modal-input${paymentErrors.expiryMonth ? ' is-invalid' : ''}`} value={paymentForm.expiryMonth} onChange={(e) => setPaymentForm((p) => ({ ...p, expiryMonth: e.target.value }))} />
                          </label>
                          <label className="client-compte-account-edit-modal-row">
                            <span>{isEn ? 'YY' : 'AA'}</span>
                            <input className={`client-compte-account-edit-modal-input${paymentErrors.expiryYear ? ' is-invalid' : ''}`} value={paymentForm.expiryYear} onChange={(e) => setPaymentForm((p) => ({ ...p, expiryYear: e.target.value }))} />
                          </label>
                          <label className="client-compte-account-edit-modal-row">
                            <span>CVC</span>
                            <input className={`client-compte-account-edit-modal-input${paymentErrors.cvc ? ' is-invalid' : ''}`} value={paymentForm.cvc} onChange={(e) => setPaymentForm((p) => ({ ...p, cvc: e.target.value }))} />
                          </label>
                        </div>
                        <label className="client-compte-account-edit-modal-row">
                          <span>{isEn ? 'Country' : 'Pays'}</span>
                          <select className="client-compte-account-edit-modal-input" value={paymentForm.country} onChange={(e) => setPaymentForm((p) => ({ ...p, country: e.target.value }))}>
                            <option value="FR">France</option>
                            <option value="RE">La Reunion</option>
                            <option value="MU">Maurice</option>
                          </select>
                        </label>
                        <label className="client-compte-account-edit-modal-row">
                          <span>{isEn ? 'Address' : 'Adresse'}</span>
                          <input className={`client-compte-account-edit-modal-input${paymentErrors.addressLine1 ? ' is-invalid' : ''}`} value={paymentForm.addressLine1} onChange={(e) => setPaymentForm((p) => ({ ...p, addressLine1: e.target.value }))} />
                          {paymentErrors.addressLine1 ? <small className="client-compte-account-edit-modal-error">{paymentErrors.addressLine1}</small> : null}
                        </label>
                        <div className="client-compte-payment-modal-row-2">
                          <label className="client-compte-account-edit-modal-row">
                            <span>{isEn ? 'City' : 'Ville'}</span>
                            <input className={`client-compte-account-edit-modal-input${paymentErrors.city ? ' is-invalid' : ''}`} value={paymentForm.city} onChange={(e) => setPaymentForm((p) => ({ ...p, city: e.target.value }))} />
                            {paymentErrors.city ? <small className="client-compte-account-edit-modal-error">{paymentErrors.city}</small> : null}
                          </label>
                          <label className="client-compte-account-edit-modal-row">
                            <span>{isEn ? 'Postal code' : 'Code postal'}</span>
                            <input className={`client-compte-account-edit-modal-input${paymentErrors.postalCode ? ' is-invalid' : ''}`} value={paymentForm.postalCode} onChange={(e) => setPaymentForm((p) => ({ ...p, postalCode: e.target.value }))} />
                            {paymentErrors.postalCode ? <small className="client-compte-account-edit-modal-error">{paymentErrors.postalCode}</small> : null}
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                  </div>
                  <div className="client-compte-account-edit-modal-actions">
                    <button type="button" className="dashboard-user-edit-btn dashboard-user-edit-btn--secondary" onClick={closePaymentModal}>
                      {isEn ? 'Cancel' : 'Annuler'}
                    </button>
                    {!stripeOn ? (
                      <button type="button" className="dashboard-user-edit-btn" onClick={submitPaymentMethod}>
                        {isEn ? 'Save card' : 'Enregistrer la carte'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {activeNav === 'courses' && (
            <div className="dashboard-content">
              <ClientAccountBackToOverviewButton
                onClick={() => goNav('overview')}
                label={t('clientAccount.navBackOverview')}
                ariaLabel={t('clientAccount.navBackOverviewAria')}
              />
              <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                {t('clientAccount.coursesRecapLead')}
              </p>
              <section className="dashboard-table-section">
                <div className="dashboard-section-title dashboard-user-title-row">
                  <h3 style={{ margin: 0 }}>{t('clientAccount.coursesRecapTitle')}</h3>
                </div>
                <article className="dashboard-user-card">
                  <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
                    {t('clientAccount.recentRidesCaption')}
                  </p>
                  <ul className="client-compte-ride-list">
                    {ridesForUi.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className={`client-compte-ride-row${selectedRideId === r.id ? ' client-compte-ride-row--selected' : ''}`}
                          onClick={() => setSelectedRideId(r.id)}
                          aria-pressed={selectedRideId === r.id}
                        >
                          <strong>{r.route}</strong>
                          <span className="client-compte-ride-row-meta">
                            {rideRowDateLabel(r, language)} ·{' '}
                            <span className={`ride-status-badge ride-status-badge--${rideStatusTone(rideRowStatusLabel(r, language))}`}>
                              {rideRowStatusLabel(r, language)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {selectedRide ? (
                    <section className="client-compte-ride-detail" aria-live="polite">
                      <div className="client-compte-ride-detail-head">
                        <h4 className="client-compte-ride-detail-title">{t('clientAccount.rideDetailTitle')}</h4>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {canCancelSelectedRide ? (
                            <button
                              type="button"
                              className="dashboard-user-cancel-btn"
                              onClick={() => {
                                void handleCancelSelectedRide();
                              }}
                            >
                              {isEn ? 'Cancel ride' : 'Annuler la course'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="dashboard-user-edit-btn"
                            onClick={() => setSelectedRideId(null)}
                          >
                            {t('clientAccount.rideDetailClose')}
                          </button>
                        </div>
                      </div>
                      {selectedRide.flow === 'meet_driver' ? (
                        <button
                          type="button"
                          className="dashboard-user-edit-btn"
                          style={{ marginBottom: 12 }}
                          onClick={() => {
                            const row = clientRides.find((r) => r.id === selectedRide.id);
                            if (!row) return;
                            const model = buildClientLiveMeetRideFromRideItem(row);
                            if (!model || !onOpenClientLiveMeet) return;
                            saveClientLiveMeetRideModel(model);
                            onOpenClientLiveMeet();
                          }}
                        >
                          {t('clientAccount.rideTrackOpenMap')}
                        </button>
                      ) : null}
                      {selectedRide.flow === 'meet_driver' ? (
                        <ClientCompteRideMeetDriver
                          key={`meet-${selectedRide.id}`}
                          courseId={selectedRide.id}
                          pickupLabel={selectedRide.pickupLabel}
                          driverName={selectedRide.driverName}
                          driverPhone={selectedRide.driverPhone}
                          driverProfilePhotoUrl={selectedRide.driverProfilePhotoUrl}
                          vehicleLabel={selectedRide.vehicleLabel}
                          vehicleColor={selectedRide.vehicleColor}
                          licensePlate={selectedRide.licensePlate}
                          route={selectedRide.route}
                          departTime={selectedRide.departTime}
                          meetPickupCoords={selectedRide.meetPickupCoords}
                          meetDriverCoordsInitial={selectedRide.meetDriverCoordsInitial}
                          t={t}
                        />
                      ) : null}
                      {selectedRide.flow === 'end_cash' ? (
                        <ClientCompteRideEndCash
                          key={`end-${selectedRide.id}`}
                          priceEur={selectedRide.priceEur}
                          distanceKm={selectedRide.distanceKm}
                          durationMin={selectedRide.durationMin}
                          driverName={selectedRide.driverName}
                          route={selectedRide.route}
                          t={t}
                        />
                      ) : null}
                      <dl className="client-compte-ride-detail-grid">
                        <dt>{t('clientAccount.rideReference')}</dt>
                        <dd>{selectedRide.reference}</dd>
                        <dt>{t('clientAccount.rideStatus')}</dt>
                        <dd>
                          <span
                            className={`ride-status-badge ride-status-badge--${rideStatusTone(
                              rideRowStatusLabel(selectedRide, language)
                            )}`}
                          >
                            {rideRowStatusLabel(selectedRide, language)}
                          </span>
                        </dd>
                        <dt>{t('clientAccount.rideDate')}</dt>
                        <dd>{rideRowDateLabel(selectedRide, language)}</dd>
                        <dt>{t('clientAccount.rideDepart')}</dt>
                        <dd>{selectedRide.pickupLabel}</dd>
                        <dt>{t('clientAccount.rideArrive')}</dt>
                        <dd>{selectedRide.dropoffLabel}</dd>
                        <dt>{t('clientAccount.rideDepartTime')}</dt>
                        <dd>{selectedRide.departTime}</dd>
                        <dt>{t('clientAccount.rideArriveTime')}</dt>
                        <dd>{selectedRide.arriveTime}</dd>
                        <dt>{t('clientAccount.rideDuration')}</dt>
                        <dd>
                          {selectedRide.durationMin > 0
                            ? t('clientAccount.rideDurationMinutes', { n: String(selectedRide.durationMin) })
                            : '—'}
                        </dd>
                        <dt>{t('clientAccount.rideDistance')}</dt>
                        <dd>
                          {selectedRide.distanceKm > 0
                            ? t('clientAccount.rideDistanceKm', { n: String(selectedRide.distanceKm) })
                            : '—'}
                        </dd>
                        <dt>{t('clientAccount.ridePrice')}</dt>
                        <dd>
                          {selectedRide.priceEur > 0
                            ? t('clientAccount.ridePriceEur', { n: String(selectedRide.priceEur) })
                            : '—'}
                        </dd>
                        <dt>{t('clientAccount.rideDriver')}</dt>
                        <dd>{selectedRide.driverName}</dd>
                        {selectedRide.driverPhone ? (
                          <>
                            <dt>{t('clientAccount.rideMeetDriverPhone')}</dt>
                            <dd>
                              <a href={`tel:${selectedRide.driverPhone.replace(/\s/g, '')}`}>
                                {selectedRide.driverPhone}
                              </a>
                            </dd>
                          </>
                        ) : null}
                        <dt>{t('clientAccount.rideVehicle')}</dt>
                        <dd>{selectedRide.vehicleLabel}</dd>
                        {selectedRide.licensePlate ? (
                          <>
                            <dt>{t('clientAccount.rideVehiclePlate')}</dt>
                            <dd>{selectedRide.licensePlate}</dd>
                          </>
                        ) : null}
                        <dt>{t('clientAccount.ridePayment')}</dt>
                        <dd>{rideRowPaymentLabel(selectedRide, language)}</dd>
                      </dl>
                    </section>
                  ) : null}
                </article>
              </section>
            </div>
            )}

            {activeNav === 'places' && (
            <div className="dashboard-content">
              <ClientAccountBackToOverviewButton
                onClick={() => goNav('overview')}
                label={t('clientAccount.navBackOverview')}
                ariaLabel={t('clientAccount.navBackOverviewAria')}
              />
              <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                {t('clientAccount.placesLead')}
              </p>
              <section className="dashboard-table-section">
                <form className="dashboard-user-card client-compte-places-form" onSubmit={savePlaces}>
                  <div className="client-compte-place-block">
                    <h3 className="client-compte-section-title">{t('clientAccount.placesHome')}</h3>
                    <ClientComptePlaceAddressField
                      inputId="client-place-domicile"
                      value={placesDraft.domicile}
                      coords={placesDraft.domicileCoords}
                      language={language}
                      t={t}
                      onUserInput={(v) =>
                        setPlacesDraft((p) => ({ ...p, domicile: v, domicileCoords: null }))
                      }
                      onResolvedPlace={(address, c) =>
                        setPlacesDraft((p) => ({ ...p, domicile: address, domicileCoords: c }))
                      }
                      onMarkOnMap={() => setMapPickTarget({ kind: 'domicile' })}
                    />
                  </div>
                  <div className="client-compte-place-block">
                    <h3 className="client-compte-section-title">{t('clientAccount.placesWork')}</h3>
                    <ClientComptePlaceAddressField
                      inputId="client-place-travail"
                      value={placesDraft.travail}
                      coords={placesDraft.travailCoords}
                      language={language}
                      t={t}
                      onUserInput={(v) =>
                        setPlacesDraft((p) => ({ ...p, travail: v, travailCoords: null }))
                      }
                      onResolvedPlace={(address, c) =>
                        setPlacesDraft((p) => ({ ...p, travail: address, travailCoords: c }))
                      }
                      onMarkOnMap={() => setMapPickTarget({ kind: 'travail' })}
                    />
                  </div>
                  <div className="client-compte-place-block">
                    <div className="client-compte-place-extras-head">
                      <h3 className="client-compte-section-title" style={{ margin: 0 }}>
                        {t('clientAccount.placesExtrasTitle')}
                      </h3>
                      <button
                        type="button"
                        className="dashboard-user-edit-btn client-compte-place-add-btn"
                        onClick={() =>
                          setPlacesDraft((p) => ({
                            ...p,
                            extras: [...p.extras, createEmptySavedPlaceExtra()],
                          }))
                        }
                      >
                        <Plus size={16} aria-hidden />
                        <span>{t('clientAccount.placesAddExtra')}</span>
                      </button>
                    </div>
                    {placesDraft.extras.length === 0 ? (
                      <p className="dashboard-field-hint" style={{ margin: 0 }}>
                        {t('clientAccount.placesNoExtras')}
                      </p>
                    ) : (
                      <ul className="client-compte-place-extras-list">
                        {placesDraft.extras.map((row, index) => (
                          <li key={row.id} className="client-compte-place-extra-card">
                            <div className="client-compte-place-extra-card-head">
                              <span className="dashboard-field-hint">
                                {t('clientAccount.placesExtraLabel')} {index + 1}
                              </span>
                              <button
                                type="button"
                                className="client-compte-place-remove-btn"
                                aria-label={t('clientAccount.placesRemoveExtra')}
                                onClick={() =>
                                  setPlacesDraft((p) => ({
                                    ...p,
                                    extras: p.extras.filter((x) => x.id !== row.id),
                                  }))
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <label className="client-compte-place-field">
                              <span>{t('clientAccount.placesExtraLabel')}</span>
                              <input
                                type="text"
                                value={row.label}
                                onChange={(e) =>
                                  setPlacesDraft((p) => ({
                                    ...p,
                                    extras: p.extras.map((x) =>
                                      x.id === row.id ? { ...x, label: e.target.value } : x
                                    ),
                                  }))
                                }
                                placeholder={t('clientAccount.placesExtraLabel')}
                              />
                            </label>
                            <ClientComptePlaceAddressField
                              inputId={`client-place-extra-${row.id}`}
                              value={row.address}
                              coords={row.coords}
                              language={language}
                              t={t}
                              onUserInput={(v) =>
                                setPlacesDraft((p) => ({
                                  ...p,
                                  extras: p.extras.map((x) =>
                                    x.id === row.id ? { ...x, address: v, coords: null } : x
                                  ),
                                }))
                              }
                              onResolvedPlace={(address, c) =>
                                setPlacesDraft((p) => ({
                                  ...p,
                                  extras: p.extras.map((x) =>
                                    x.id === row.id ? { ...x, address, coords: c } : x
                                  ),
                                }))
                              }
                              onMarkOnMap={() => setMapPickTarget({ kind: 'extra', id: row.id })}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="dashboard-user-edit-actions" style={{ marginTop: 8 }}>
                    <button type="submit" className="dashboard-user-save-btn">
                      {t('clientAccount.placesSave')}
                    </button>
                  </div>
                </form>
              </section>
            </div>
            )}

            {activeNav === 'wallet' && (
            <div className="dashboard-content">
              <ClientAccountBackToOverviewButton
                onClick={() => goNav('overview')}
                label={t('clientAccount.navBackOverview')}
                ariaLabel={t('clientAccount.navBackOverviewAria')}
              />
              <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                {t('clientAccount.walletLead')}
              </p>
              <section className="dashboard-table-section">
                <article className="dashboard-user-card">
                  <h3 className="client-compte-section-title">{t('clientAccount.walletBalanceTitle')}</h3>
                  <p className="client-compte-wallet-balance" aria-live="polite">
                    {formatWalletEUR(wallet.balanceCents, language)}
                  </p>
                  {stripeOn ? (
                    <div className="client-compte-wallet-topup" style={{ marginTop: 12 }}>
                      <p className="dashboard-field-hint" style={{ margin: '0 0 8px' }}>
                        {isEn
                          ? 'Choose an amount, then complete payment in Account → Payment (card + billing address).'
                          : 'Choisissez un montant, puis finalisez dans Gerer le compte → Paiement (carte + adresse de facturation).'}
                      </p>
                      <div className="client-compte-wallet-topup-amounts" role="group" aria-label={isEn ? 'Top-up amount' : 'Montant de recharge'}>
                        {[5, 10, 20].map((eur) => (
                          <button
                            key={eur}
                            type="button"
                            className={`dashboard-user-edit-btn${walletTopupAmountEur === eur ? '' : ' dashboard-user-edit-btn--secondary'}`}
                            onClick={() => setWalletTopupAmountEur(eur)}
                          >
                            {formatWalletEUR(eur * 100, language)}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="dashboard-user-edit-btn"
                        style={{ marginTop: 8 }}
                        disabled={!isClientAuthenticated()}
                        onClick={goToPaymentForWalletTopUp}
                      >
                        {isEn ? 'Continue to payment' : 'Continuer vers le paiement'}
                      </button>
                    </div>
                  ) : (
                    <div className="dashboard-payment-actions" style={{ marginTop: 8 }}>
                      <button type="button" className="dashboard-user-edit-btn" onClick={handleWalletSimulateTopup}>
                        {t('clientAccount.walletSimulateTopup')}
                      </button>
                    </div>
                  )}
                  <p className="dashboard-field-hint" style={{ marginTop: 16 }}>
                    {stripeOn
                      ? isEn
                        ? 'Wallet balance syncs from the server after each successful card payment.'
                        : 'Le solde se met a jour sur le serveur apres chaque paiement carte reussi.'
                      : t('clientAccount.walletActivityNote')}
                  </p>
                </article>
                <article className="dashboard-user-card" style={{ marginTop: 20 }}>
                  <h3 className="client-compte-section-title">{t('clientAccount.walletMovementsTitle')}</h3>
                  {walletRideMovements.length === 0 ? (
                    <p className="dashboard-field-hint" style={{ margin: 0 }}>
                      {isEn
                        ? 'No ride payments yet. Your trips will appear here.'
                        : 'Aucun paiement de course pour le moment. Vos trajets apparaîtront ici.'}
                    </p>
                  ) : (
                    <ul className="client-compte-wallet-movements">
                      {walletRideMovements.slice(0, 10).map((ride) => (
                        <li key={ride.id} className="client-compte-wallet-movement-row">
                          <div>
                            <strong>{ride.route}</strong>
                            <p className="dashboard-field-hint" style={{ margin: '4px 0 0' }}>
                              {language === 'en' ? ride.dateEn : ride.date} ·{' '}
                              <span
                                className={`ride-status-badge ride-status-badge--${rideStatusTone(
                                  language === 'en' ? ride.statusEn : ride.status
                                )}`}
                              >
                                {language === 'en' ? ride.statusEn : ride.status}
                              </span>
                            </p>
                          </div>
                          <span className="client-compte-wallet-amount client-compte-wallet-amount--debit">
                            {formatWalletEUR(-Math.round(ride.priceEur * 100), language)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </section>
            </div>
            )}

            {activeNav === 'personal' && (
            <div className="dashboard-content">
              <ClientAccountBackToOverviewButton
                onClick={() => goNav('overview')}
                label={t('clientAccount.navBackOverview')}
                ariaLabel={t('clientAccount.navBackOverviewAria')}
              />
              <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                {t('clientAccount.personalHint')}
              </p>
              <section className="dashboard-table-section">
                <div className="dashboard-section-title dashboard-user-title-row">
                  <h3 style={{ margin: 0 }}>{t('clientAccount.navPersonalInfo')}</h3>
                  {!isEditing ? (
                    <button type="button" className="dashboard-user-edit-btn" onClick={startEdit}>
                      {t('clientAccount.edit')}
                    </button>
                  ) : null}
                </div>

                <article className="dashboard-user-card">
                  <div className="dashboard-user-card-head">
                    <div
                      className={`dashboard-user-avatar-lg ${isEditing ? 'dashboard-user-avatar-lg--editable' : ''}`}
                    >
                      {(isEditing ? photoDraftUrl : profile.profilePhotoUrl) ? (
                        <img
                          src={(isEditing ? photoDraftUrl : profile.profilePhotoUrl) ?? undefined}
                          alt={t('clientAccount.photoAlt')}
                        />
                      ) : (
                        <User size={22} />
                      )}
                      {isEditing ? (
                        <label className="dashboard-user-avatar-edit-btn" aria-label={t('clientAccount.edit')}>
                          <Pencil size={12} />
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            onChange={(e) => void onPhotoPick(e.target.files?.[0])}
                          />
                        </label>
                      ) : null}
                    </div>
                    <div>
                      <h4>
                        {profile.prenom} {profile.nom}
                      </h4>
                    </div>
                  </div>

                  {!isEditing ? (
                    <div className="dashboard-user-grid">
                      <div>
                        <strong>{t('clientAccount.firstName')}</strong>
                        <p>{profile.prenom}</p>
                      </div>
                      <div>
                        <strong>{t('clientAccount.lastName')}</strong>
                        <p>{profile.nom}</p>
                      </div>
                      <div>
                        <strong>{t('clientAccount.email')}</strong>
                        <p>{profile.email}</p>
                      </div>
                      <div>
                        <strong>{t('clientAccount.phone')}</strong>
                        <p>{profile.telephone}</p>
                      </div>
                      <div>
                        <strong>{t('clientAccount.city')}</strong>
                        <p>{profile.ville}</p>
                      </div>
                      <div>
                        <strong>{t('clientAccount.preferenceTitle')}</strong>
                        <p>{paymentLabel(t, profile.preferredPayment)}</p>
                      </div>
                    </div>
                  ) : (
                    <form className="dashboard-user-edit-grid" onSubmit={saveEdit}>
                      <label>
                        {t('clientAccount.firstName')}
                        <input
                          type="text"
                          value={draft.prenom}
                          onChange={(e) => setDraft((p) => ({ ...p, prenom: e.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        {t('clientAccount.lastName')}
                        <input
                          type="text"
                          value={draft.nom}
                          onChange={(e) => setDraft((p) => ({ ...p, nom: e.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        {t('clientAccount.email')}
                        <input
                          type="email"
                          value={draft.email}
                          onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        {t('clientAccount.phone')}
                        <div className="dashboard-phone-input-row">
                          <select
                            value={phoneCountryDraft}
                            onChange={(e) => setPhoneCountryDraft(e.target.value as SupportedPhoneCountry)}
                          >
                            {PHONE_COUNTRIES.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.flag} {country.label} ({country.dialCode})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={phoneNationalDraft}
                            onChange={(e) => {
                              setPhoneNationalDraft(e.target.value);
                              if (phoneError) setPhoneError(null);
                            }}
                            placeholder={phoneCountryDraft === 'FR' ? '612345678' : '692123456'}
                            required
                          />
                        </div>
                        {phoneError ? <small className="dashboard-field-error">{phoneError}</small> : null}
                      </label>
                      <label>
                        {t('clientAccount.city')}
                        <input
                          type="text"
                          value={draft.ville}
                          onChange={(e) => setDraft((p) => ({ ...p, ville: e.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        {t('clientAccount.preferenceTitle')}
                        <select
                          value={draft.preferredPayment}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              preferredPayment: e.target.value as ClientPreferredPayment,
                            }))
                          }
                        >
                          <option value="indifferent">{t('clientAccount.prefIndifferent')}</option>
                          <option value="card">{t('clientAccount.prefCard')}</option>
                          <option value="cash">{t('clientAccount.prefCash')}</option>
                        </select>
                      </label>
                      <div className="dashboard-user-edit-readonly">
                        <strong>{t('clientAccount.status')}</strong>
                        <p>{t('clientAccount.statusActive')}</p>
                      </div>
                      <div className="dashboard-user-edit-actions">
                        <button type="submit" className="dashboard-user-save-btn">
                          {t('clientAccount.save')}
                        </button>
                        <button type="button" className="dashboard-user-cancel-btn" onClick={cancelEdit}>
                          {t('clientAccount.cancel')}
                        </button>
                      </div>
                    </form>
                  )}
                  {!isEditing ? (
                    <p className="dashboard-field-hint" style={{ marginTop: 12 }}>
                      {t('clientAccount.preferenceHint')}
                    </p>
                  ) : null}
                </article>
              </section>
            </div>
            )}

            {activeNav === 'security' && (
            <div className="dashboard-content client-compte-security">
              <ClientAccountBackToOverviewButton
                onClick={() => goNav('overview')}
                label={t('clientAccount.navBackOverview')}
                ariaLabel={t('clientAccount.navBackOverviewAria')}
              />
              <section className="dashboard-user-card" style={{ marginBottom: 20 }}>
                <h3 className="client-compte-section-title">{t('clientAccount.securityPasswordTitle')}</h3>
                <p className="client-compte-masked-pwd" aria-label={t('clientAccount.securityPasswordField')}>
                  ••••••••
                </p>
                <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
                  {t('clientAccount.securityLastChanged', {
                    date: formatSecurityDate(security.passwordLastChangedAt),
                  })}
                </p>
                {!pwdPanelOpen ? (
                  <button
                    type="button"
                    className="dashboard-user-edit-btn"
                    onClick={() => {
                      setPwdPanelOpen(true);
                      setPwdError(null);
                    }}
                  >
                    {t('clientAccount.securityChangePassword')}
                  </button>
                ) : (
                  <form className="dashboard-user-edit-grid client-compte-pwd-form" onSubmit={submitPasswordChange}>
                    <label>
                      {t('clientAccount.securityNewPassword')}
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={newPwd}
                        onChange={(e) => {
                          setNewPwd(e.target.value);
                          if (pwdError) setPwdError(null);
                        }}
                      />
                    </label>
                    <label>
                      {t('clientAccount.securityConfirmPassword')}
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={confirmPwd}
                        onChange={(e) => {
                          setConfirmPwd(e.target.value);
                          if (pwdError) setPwdError(null);
                        }}
                      />
                    </label>
                    {pwdError ? <small className="dashboard-field-error">{pwdError}</small> : null}
                    <div className="dashboard-user-edit-actions">
                      <button type="submit" className="dashboard-user-save-btn">
                        {t('clientAccount.securitySavePassword')}
                      </button>
                      <button
                        type="button"
                        className="dashboard-user-cancel-btn"
                        onClick={() => {
                          setPwdPanelOpen(false);
                          setNewPwd('');
                          setConfirmPwd('');
                          setPwdError(null);
                        }}
                      >
                        {t('clientAccount.securityCancel')}
                      </button>
                    </div>
                  </form>
                )}
              </section>

              <section className="dashboard-user-card">
                <h3 className="client-compte-section-title">{t('clientAccount.securityOAuthTitle')}</h3>
                <ul className="client-compte-oauth-list">
                  <li className="client-compte-oauth-row">
                    <div>
                      <strong>{t('clientAccount.securityOAuthGoogle')}</strong>
                      <p className="dashboard-field-hint" style={{ margin: 0 }}>
                        {security.oauthGoogle
                          ? t('clientAccount.securityOAuthConnected')
                          : t('clientAccount.securityOAuthNotConnected')}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="dashboard-user-edit-btn"
                      onClick={() => toggleOAuth('oauthGoogle')}
                    >
                      {security.oauthGoogle
                        ? t('clientAccount.securityOAuthDisconnect')
                        : t('clientAccount.securityOAuthConnect')}
                    </button>
                  </li>
                  <li className="client-compte-oauth-row">
                    <div>
                      <strong>{t('clientAccount.securityOAuthFacebook')}</strong>
                      <p className="dashboard-field-hint" style={{ margin: 0 }}>
                        {security.oauthFacebook
                          ? t('clientAccount.securityOAuthConnected')
                          : t('clientAccount.securityOAuthNotConnected')}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="dashboard-user-edit-btn"
                      onClick={() => toggleOAuth('oauthFacebook')}
                    >
                      {security.oauthFacebook
                        ? t('clientAccount.securityOAuthDisconnect')
                        : t('clientAccount.securityOAuthConnect')}
                    </button>
                  </li>
                  <li className="client-compte-oauth-row">
                    <div>
                      <strong>{t('clientAccount.securityOAuthApple')}</strong>
                      <p className="dashboard-field-hint" style={{ margin: 0 }}>
                        {security.oauthApple
                          ? t('clientAccount.securityOAuthConnected')
                          : t('clientAccount.securityOAuthNotConnected')}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="dashboard-user-edit-btn"
                      onClick={() => toggleOAuth('oauthApple')}
                    >
                      {security.oauthApple
                        ? t('clientAccount.securityOAuthDisconnect')
                        : t('clientAccount.securityOAuthConnect')}
                    </button>
                  </li>
                </ul>
              </section>
            </div>
            )}

            {activeNav === 'settings' && (
            <div className="dashboard-content">
              <ClientAccountBackToOverviewButton
                onClick={() => goNav('overview')}
                label={t('clientAccount.navBackOverview')}
                ariaLabel={t('clientAccount.navBackOverviewAria')}
              />
              <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                {t('clientAccount.settingsLead')}
              </p>
              <section className="dashboard-table-section">
                <article className="dashboard-user-card">
                  <h3 className="client-compte-section-title">{t('clientAccount.settingsLanguageTitle')}</h3>
                  <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
                    {t('clientAccount.settingsLanguageHint')}
                  </p>
                  <div className="client-compte-settings-lang-row">
                    <LanguageSwitcher />
                  </div>
                </article>

                <article className="dashboard-user-card" style={{ marginTop: 20 }}>
                  <h3 className="client-compte-section-title">{t('clientAccount.settingsAppearanceTitle')}</h3>
                  <p className="dashboard-field-hint" style={{ margin: '0 0 8px' }}>
                    {t('clientAccount.settingsAppearanceHint')}
                  </p>
                  <label className="client-compte-settings-toggle-row">
                    <span>{isEn ? 'Theme' : 'Theme'}</span>
                    <select
                      value={appPrefs.theme}
                      onChange={(e) => setAppTheme(e.target.value as AppTheme)}
                    >
                      <option value="light">{isEn ? 'Light' : 'Clair'}</option>
                      <option value="dark">{isEn ? 'Dark' : 'Sombre'}</option>
                      <option value="contrast">{isEn ? 'High contrast' : 'Contraste eleve'}</option>
                    </select>
                  </label>
                </article>

                <article className="dashboard-user-card" style={{ marginTop: 20 }}>
                  <h3 className="client-compte-section-title">{t('clientAccount.settingsTextSizeTitle')}</h3>
                  <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
                    {t('clientAccount.settingsTextSizeHint')}
                  </p>
                  <div className="client-compte-font-scale-row">
                    <span className="client-compte-font-scale-end" aria-hidden="true">
                      {FONT_SCALE_PERCENT_MIN} %
                    </span>
                    <input
                      type="range"
                      className="client-compte-font-scale-range"
                      min={FONT_SCALE_PERCENT_MIN}
                      max={FONT_SCALE_PERCENT_MAX}
                      step={1}
                      value={appPrefs.fontScalePercent}
                      onChange={(e) => setFontScalePercent(Number(e.target.value))}
                      aria-label={t('clientAccount.settingsTextSizeAria')}
                      aria-valuemin={FONT_SCALE_PERCENT_MIN}
                      aria-valuemax={FONT_SCALE_PERCENT_MAX}
                      aria-valuenow={appPrefs.fontScalePercent}
                      aria-valuetext={t('clientAccount.settingsTextSizeValue', { n: String(appPrefs.fontScalePercent) })}
                    />
                    <span className="client-compte-font-scale-end client-compte-font-scale-end--max" aria-hidden="true">
                      {FONT_SCALE_PERCENT_MAX} %
                    </span>
                  </div>
                  <p className="client-compte-font-scale-value" aria-live="polite">
                    {t('clientAccount.settingsTextSizeValue', { n: String(appPrefs.fontScalePercent) })}
                  </p>
                </article>

                <article className="dashboard-user-card" style={{ marginTop: 20 }}>
                  <h3 className="client-compte-section-title">{t('clientAccount.settingsNotificationsTitle')}</h3>
                  <p className="dashboard-field-hint" style={{ margin: '0 0 8px' }}>
                    {t('clientAccount.settingsNotificationsHint')}
                  </p>
                  <label className="client-compte-settings-toggle-row">
                    <span>{t('clientAccount.settingsNotifyEmail')}</span>
                    <input
                      type="checkbox"
                      checked={appPrefs.notifyEmail}
                      onChange={() => toggleAppNotify('notifyEmail')}
                    />
                  </label>
                  <label className="client-compte-settings-toggle-row">
                    <span>{t('clientAccount.settingsNotifySms')}</span>
                    <input
                      type="checkbox"
                      checked={appPrefs.notifySms}
                      onChange={() => toggleAppNotify('notifySms')}
                    />
                  </label>
                  <label className="client-compte-settings-toggle-row">
                    <span>{t('clientAccount.settingsNotifyPush')}</span>
                    <input
                      type="checkbox"
                      checked={appPrefs.notifyPush}
                      onChange={() => toggleAppNotify('notifyPush')}
                    />
                  </label>
                </article>

                <p className="dashboard-field-hint" style={{ marginTop: 20 }}>
                  {t('clientAccount.settingsMoreHint')}
                </p>
              </section>
            </div>
            )}

            {activeNav === 'help' && (
            <div className="dashboard-content">
              <ClientAccountBackToOverviewButton
                onClick={() => goNav('overview')}
                label={t('clientAccount.navBackOverview')}
                ariaLabel={t('clientAccount.navBackOverviewAria')}
              />
              <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                {t('clientAccount.helpLead')}
              </p>
              <section className="dashboard-table-section">
                <article className="dashboard-user-card">
                  <dl className="client-compte-help-faq">
                    <dt>{t('clientAccount.helpFaq1Q')}</dt>
                    <dd>{t('clientAccount.helpFaq1A')}</dd>
                    <dt>{t('clientAccount.helpFaq2Q')}</dt>
                    <dd>{t('clientAccount.helpFaq2A')}</dd>
                    <dt>{t('clientAccount.helpFaq3Q')}</dt>
                    <dd>{t('clientAccount.helpFaq3A')}</dd>
                  </dl>
                  <p className="dashboard-field-hint" style={{ marginTop: 20 }}>
                    {t('clientAccount.helpContactHint')}
                  </p>
                </article>
              </section>
            </div>
            )}

            {activeNav === 'privacy' && (
            <div className="dashboard-content">
              <ClientAccountBackToOverviewButton
                onClick={() => goNav('overview')}
                label={t('clientAccount.navBackOverview')}
                ariaLabel={t('clientAccount.navBackOverviewAria')}
              />
              <p className="dashboard-field-hint" style={{ margin: 0 }}>
                {t('clientAccount.sectionPlaceholder')}
              </p>
            </div>
            )}

          </div>

          {isMobileViewport && (
            <div
              className="dashboard-mobile-bottombar dashboard-mobile-bottombar--client"
              role="group"
              aria-label={t('clientAccount.mobileActions')}
            >
              <button
                type="button"
                className="dashboard-mobile-menu-btn"
                aria-label={mobileSidebarOpen ? t('clientAccount.closeMenu') : t('clientAccount.openMenu')}
                aria-expanded={mobileSidebarOpen}
                onClick={() => setMobileSidebarOpen((prev) => !prev)}
              >
                <Menu size={18} aria-hidden />
              </button>
            </div>
          )}

          {mapPickTarget ? (
            <ClientComptePlaceMapModal
              open
              onClose={() => setMapPickTarget(null)}
              language={language}
              initialMarker={pickInitialMarkerForMap(mapPickTarget, placesDraft)}
              onConfirm={(r) => {
                applyMapPickResult(r, mapPickTarget);
                setMapPickTarget(null);
              }}
              title={t('clientAccount.placesMapModalTitle')}
              hint={t('clientAccount.placesMapModalHint')}
              confirmLabel={t('clientAccount.placesMapConfirm')}
              cancelLabel={t('clientAccount.placesMapCancel')}
              outsideIslandError={t('clientAccount.placesOutsideReunion')}
              t={t}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
