import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { type ProjectWithMeta } from '../services/projectService';
import {
  getCurrentUser,
  isAuthenticated,
  isChauffeurPrimaryAccountEmail,
  logoutChauffeurToHome,
  PALTO_CHAUFFEUR_SESSION_CHANGED_EVENT,
  PALTO_CLIENT_SESSION_CHANGED_EVENT,
} from '../services/authService';
import ProjectEditor from './ProjectEditor';
import DashboardStats, {
  type ChauffeurActivityStatsForView,
  type ChauffeurHeatmapStatsForView,
} from './DashboardStats';
import {
  normalizeFrenchPlate,
} from '../services/vehiclePlate';
import {
  buildInternationalPhone,
  isValidNationalPhone,
  normalizeNationalPhone,
  parseStoredPhone,
  PHONE_COUNTRIES,
  type SupportedPhoneCountry,
} from '../services/phoneNumber';
import {
  BarChart3,
  Users,
  Car,
  CalendarDays,
  House,
  User,
  IdCard,
  Bell,
  PanelLeft,
  MapPin,
  ArrowRight,
  Search,
  Menu,
  Pencil,
  Settings,
  Wallet,
  CircleHelp,
  MoreVertical,
  LogOut,
  ThumbsUp,
  ThumbsDown,
  Building2,
  Mail,
  Send,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useLanguage, type Language } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import {
  FONT_SCALE_PERCENT_MAX,
  FONT_SCALE_PERCENT_MIN,
  clampFontScalePercent,
  loadClientAppPreferences,
  saveClientAppPreferences,
  type AppTheme,
  type ClientAppPreferencesSnapshot,
} from '../constants/clientAppPreferencesStorage';
import { trackEvent } from '../services/googleAnalyticsTracking';
import { useChauffeurPresenceHeartbeat } from '../hooks/useChauffeurPresenceHeartbeat';
import { ChauffeurPresenceGeoBar } from './ChauffeurPresenceGeoBar';
import ChauffeurPaltoAccountPanel, {
  type ChauffeurPaltoAccountSection,
} from './ChauffeurPaltoAccountPanel';
import ChauffeurRideSettingsForm from './ChauffeurRideSettingsForm';
import { toast } from 'sonner';
import './Dashboard.css';
import './Dashboard.app-theme.css';
import './ClientCompteDashboard.css';
import {
  CHAUFFEUR_NAV_COURSE_STORAGE_KEY,
  CHAUFFEUR_COURSE_COMPLETED_EVENT,
  type ChauffeurNavCourseSnapshot,
} from '../constants/chauffeurNavCourseStorage';
import {
  CHAUFFEUR_ORG_CHANGED_EVENT,
  loadChauffeurOrg,
  saveChauffeurOrg,
  type ChauffeurOrgMember,
  type ChauffeurOrgSnapshot,
} from '../constants/chauffeurOrganizationStorage';
import {
  FLEET_ZONE_IDS,
  type FleetAvailability,
  type FleetZoneId,
  fleetAvailabilityI18nKey,
  fleetZoneI18nKey,
} from '../constants/chauffeurFleetZones';
import { appendChauffeurInboxItem, loadChauffeurInbox } from '../constants/chauffeurInboxStorage';
import type { BookingKindUi, CourseRowState, CourseStatut } from '../types/chauffeurCoursePlanning';
import {
  fetchChauffeurRidesFromApi,
  postChauffeurRideAction,
  ridesPersistenceEnabled,
} from '../services/chauffeurRidesApi';
import { subscribePaltoCoursesRealtime } from '../services/paltoCoursesRealtime';
import {
  fetchChauffeurOrganizationFromApi,
  organizationApiEnabled,
  saveChauffeurOrganizationToApi,
} from '../services/chauffeurOrganizationApi';
import { fetchChauffeurStatsFromApi, statsApiEnabled } from '../services/chauffeurStatsApi';
import { supabaseRealtimeConfigured } from '../constants/featureFlags';
import {
  CHAUFFEUR_COMPLIANCE_KEY,
  CHAUFFEUR_COMPLIANCE_CHANGED_EVENT,
  complianceFullySatisfied,
  loadComplianceSnapshot,
  type ChauffeurComplianceSnapshot,
} from '../constants/chauffeurComplianceStorage';
import {
  isChauffeurInSelfServiceRegistry,
  loadChauffeurRegistry,
  normalizeChauffeurEmail,
} from '../constants/chauffeurRegistrationStorage';
import {
  loadChauffeurRideSettingsSnapshot,
  saveChauffeurRideSettingsSnapshot,
  type ChauffeurRideSettingsSnapshot,
} from '../constants/chauffeurRideSettingsStorage';
import {
  complianceApiEnabled,
  fetchChauffeurComplianceSnapshotFromApi,
} from '../services/chauffeurComplianceApi';
import {
  CHAUFFEUR_VEHICLE_TYPES,
  CHAUFFEUR_VEHICLE_TYPE_LABELS,
  isChauffeurVehicleType,
  normalizeVehicleSlugForSelect,
} from '../constants/chauffeurVehicleType';
import {
  fetchChauffeurRideProfileFromServer,
  syncChauffeurRideProfileToServer,
} from '../services/chauffeurRideProfileApi';
import {
  loadStoredChauffeurProfile,
  persistStoredChauffeurProfile,
  PALTO_CHAUFFEUR_PROFILE_SYNCED_EVENT,
  type ChauffeurProfileSnapshot,
} from '../constants/chauffeurProfileStorage';
import { syncChauffeurProfileWithServer } from '../services/chauffeurProfileSync';
import ChauffeurDocumentsChecklist from './ChauffeurDocumentsChecklist';

interface DashboardProps {
  /** Ouvre la route `/dashboard/navigation/:id` avec carte + itineraire. */
  onOpenActiveCourseNavigation?: (courseId: string) => void;
  /** Retour vers la vitrine grand public Palto. */
  onNavigatePublicHome?: () => void;
  /** Retour vers la vitrine chauffeur Palto. */
  onNavigateDriverHome?: () => void;
}

type DashboardClientRow = {
  id: string;
  nom: string;
  telephone: string;
  courses: number;
  depense: string;
  note: string;
};

/** Client factice pour l’ajout manuel de course (mode sans API) quand aucun client agrégé encore. */
const DASHBOARD_FALLBACK_CLIENT_ROW: DashboardClientRow = {
  id: 'CL-manual',
  nom: 'Client',
  telephone: '—',
  courses: 0,
  depense: '0,00 EUR',
  note: '—',
};

function buildDashboardClientRowsFromCourses(courses: CourseRowState[]): DashboardClientRow[] {
  const map = new Map<
    string,
    { nom: string; telephone: string; courseCount: number; spentTermineeEur: number }
  >();
  for (const c of courses) {
    const key = c.clientId.trim() || `anon:${(c.client.trim() || 'Client').toLowerCase()}`;
    const nom = c.client.trim() || 'Client';
    const phone = (c.clientPhone ?? '').trim();
    const agg = map.get(key);
    if (!agg) {
      map.set(key, {
        nom,
        telephone: phone,
        courseCount: 1,
        spentTermineeEur: c.statut === 'Terminee' ? c.montant : 0,
      });
    } else {
      agg.courseCount += 1;
      if (phone && !agg.telephone) agg.telephone = phone;
      if (c.statut === 'Terminee') agg.spentTermineeEur += c.montant;
    }
  }
  return Array.from(map.entries())
    .map(([id, v]) => ({
      id,
      nom: v.nom,
      telephone: v.telephone || '—',
      courses: v.courseCount,
      depense: `${v.spentTermineeEur.toFixed(2).replace('.', ',')} EUR`,
      note: '—',
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
}

type DashboardView =
  | 'overview'
  | 'courses'
  | 'ride-settings'
  | 'stats'
  | 'clients'
  | 'planning'
  | 'organization'
  | 'user'
  | 'settings'
  | 'help';

type OrganizationSubView = 'profile' | 'team' | 'fleet' | 'invites' | 'settings';
type UserSubView =
  | 'palto-account'
  | 'profile'
  | 'documents'
  | 'payment'
  | 'ride-settings'
  | 'organization'
  | 'preferences'
  | 'help';

type ChauffeurProfile = ChauffeurProfileSnapshot;

type ChauffeurPayment = {
  ibanMasked: string;
  payoutFrequency: 'Hebdomadaire' | 'Quotidienne' | 'Mensuelle';
  modePrincipal: 'Carte + espèces' | 'Carte uniquement' | 'Espèces uniquement';
};

type ChauffeurRideSettings = ChauffeurRideSettingsSnapshot;

type ChauffeurDocument = {
  key: 'permis' | 'assurance' | 'carte-grise' | 'controle-technique';
  label: string;
  expiry: string;
  status: 'ok' | 'soon' | 'pending';
  uploadedFileName?: string;
};

/** Évite `e.target` null (autocomplete iOS / inspecteur) lors de la saisie profil. */
function readFormControlValue(
  e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
): string {
  return e.currentTarget?.value ?? '';
}

const REUNION_CITY_SUGGESTIONS = [
  'Saint-Denis',
  'Sainte-Marie',
  'Sainte-Suzanne',
  'Saint-Andre',
  'Bras-Panon',
  'Saint-Benoit',
  'La Plaine-des-Palmistes',
  'Sainte-Rose',
  'Salazie',
  'La Possession',
  'Le Port',
  'Saint-Paul',
  'Trois-Bassins',
  'Saint-Leu',
  'Les Avirons',
  "L'Etang-Sale",
  'Saint-Louis',
  'Entre-Deux',
  'Le Tampon',
  'Saint-Pierre',
  'Petite-Ile',
  'Saint-Joseph',
  'Saint-Philippe',
  'Cilaos',
] as const;

type DashboardAlertItem = {
  id: string;
  kind: 'org_invite' | 'demand' | 'upcoming' | 'system';
  title: string;
  description: string;
  courseId?: string;
};

function inferProfileFromEmail(emailRaw: string): Pick<ChauffeurProfile, 'prenom' | 'nom'> {
  const localPart = emailRaw.split('@')[0] ?? '';
  const chunks = localPart
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const pretty = (value: string) => value.slice(0, 1).toUpperCase() + value.slice(1).toLowerCase();
  if (chunks.length === 0) return { prenom: '', nom: '' };
  if (chunks.length === 1) return { prenom: pretty(chunks[0]), nom: '' };
  return { prenom: pretty(chunks[0]), nom: pretty(chunks.slice(1).join(' ')) };
}

function getChauffeurSessionEmail(): string {
  return getCurrentUser()?.email?.trim() ?? '';
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Lecture fichier impossible'));
    reader.readAsDataURL(file);
  });
}

function rideStatusTone(status: string): 'pending' | 'active' | 'completed' | 'cancelled' {
  if (status === 'Annulee') return 'cancelled';
  if (status === 'Terminee') return 'completed';
  if (status === 'Acceptee' || status === 'En cours') return 'active';
  return 'pending';
}

function ElapsedSince({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  const sec = Math.max(0, Math.floor((now - startedAt) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return (
    <span>
      {m} min {String(s).padStart(2, '0')} s
    </span>
  );
}

/** Mobile : défilement horizontal lent (ping-pong) pour lire trajet + client dans la topbar. */
function TopbarRideStripAutoScroll({ children, scrollKey }: { children: ReactNode; scrollKey: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const mq = window.matchMedia('(max-width: 768px)');
    let raf = 0;
    let cancelled = false;
    let direction = 1;
    let pauseUntil = 0;
    const speed = 0.45;
    const pauseAtEndMs = 2400;
    const pauseAtStartMs = 1600;

    const stopRaf = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const tick = (t: number) => {
      if (cancelled) return;
      if (!mq.matches) {
        el.scrollLeft = 0;
        return;
      }
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 2) {
        el.scrollLeft = 0;
        return;
      }
      if (t < pauseUntil) {
        raf = requestAnimationFrame(tick);
        return;
      }
      el.scrollLeft += speed * direction;
      if (direction === 1 && el.scrollLeft >= maxScroll - 0.75) {
        el.scrollLeft = maxScroll;
        direction = -1;
        pauseUntil = t + pauseAtEndMs;
      } else if (direction === -1 && el.scrollLeft <= 0.75) {
        el.scrollLeft = 0;
        direction = 1;
        pauseUntil = t + pauseAtStartMs;
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      stopRaf();
      el.scrollLeft = 0;
      direction = 1;
      pauseUntil = 0;
      if (!mq.matches) return;
      /* Attendre le layout (flex + police) pour que scrollWidth soit fiable */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          raf = requestAnimationFrame(tick);
        });
      });
    };

    const pauseForInteraction = () => {
      pauseUntil = Math.max(pauseUntil, performance.now() + 6500);
    };

    const ro = new ResizeObserver(() => {
      start();
    });
    ro.observe(el);

    const onMq = () => {
      start();
    };
    mq.addEventListener('change', onMq);
    el.addEventListener('touchstart', pauseForInteraction, { passive: true });
    el.addEventListener('wheel', pauseForInteraction, { passive: true });
    start();
    const lateLayoutTimer = window.setTimeout(() => start(), 400);

    return () => {
      window.clearTimeout(lateLayoutTimer);
      cancelled = true;
      stopRaf();
      ro.disconnect();
      mq.removeEventListener('change', onMq);
      el.removeEventListener('touchstart', pauseForInteraction);
      el.removeEventListener('wheel', pauseForInteraction);
    };
  }, [scrollKey]);

  return (
    <div className="topbar-ride-strip-scroll" ref={ref}>
      {children}
    </div>
  );
}

function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatEurAmount(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShortId(value: string): string {
  const v = value.trim();
  if (v.length <= 14) return v;
  return `${v.slice(0, 8)}…${v.slice(-4)}`;
}

type OrgProfileSampleReview = {
  id: string
  authorKey: string
  bodyKey: string
  rating: number
  isoDate: string
};

function OrgProfileReviewsCarousel({
  reviews,
  t,
  language,
}: {
  reviews: OrgProfileSampleReview[]
  t: (key: string, params?: Record<string, string | number>) => string
  language: Language
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: reviews.length > 1,
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('reInit', onSelect);
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const locale = language === 'en' ? 'en-US' : 'fr-FR';

  return (
    <div className="dashboard-org-profile-reviews-carousel-wrap">
      <div className="dashboard-org-profile-reviews-carousel" ref={emblaRef}>
        <div className="dashboard-org-profile-reviews-carousel__container">
          {reviews.map((rev) => (
            <div className="dashboard-org-profile-reviews-carousel__slide" key={rev.id}>
              <article className="dashboard-org-profile-review-card">
                <div className="dashboard-org-profile-review-head">
                  <span className="dashboard-org-profile-review-author">{t(rev.authorKey)}</span>
                  <span className="dashboard-org-profile-stars" aria-hidden>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < rev.rating
                            ? 'dashboard-org-profile-star--on'
                            : 'dashboard-org-profile-star--off'
                        }
                        fill={i < rev.rating ? 'currentColor' : 'none'}
                      />
                    ))}
                  </span>
                  <time className="dashboard-org-profile-review-date" dateTime={rev.isoDate}>
                    {new Date(rev.isoDate).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </time>
                </div>
                <p className="dashboard-org-profile-review-body">{t(rev.bodyKey)}</p>
              </article>
            </div>
          ))}
        </div>
      </div>
      <div className="dashboard-org-profile-reviews-carousel__toolbar">
        <button
          type="button"
          className="topbar-icon-btn dashboard-org-profile-reviews-carousel__btn"
          onClick={scrollPrev}
          aria-label={t('driverDashboard.orgReviewsPrev')}
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <div
          className="dashboard-org-profile-reviews-carousel__dots"
          role="group"
          aria-label={t('driverDashboard.orgReviewsDots')}
        >
          {reviews.map((rev, i) => (
            <button
              key={rev.id}
              type="button"
              aria-current={i === selectedIndex ? 'true' : undefined}
              aria-label={t('driverDashboard.orgReviewsGoTo', { n: String(i + 1) })}
              className={`dashboard-org-profile-reviews-carousel__dot${i === selectedIndex ? ' is-active' : ''}`}
              onClick={() => emblaApi?.scrollTo(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="topbar-icon-btn dashboard-org-profile-reviews-carousel__btn"
          onClick={scrollNext}
          aria-label={t('driverDashboard.orgReviewsNext')}
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

const Dashboard = ({
  onOpenActiveCourseNavigation,
  onNavigatePublicHome,
  onNavigateDriverHome,
}: DashboardProps) => {
  const { t, language } = useLanguage();
  const persistRides = ridesPersistenceEnabled();
  const chauffeurPresence = useChauffeurPresenceHeartbeat(true);
  /** Couverture Picsum (id aléatoire une fois au montage) si l’org n’a pas d’URL. */
  const orgProfileCoverFallbackRef = useRef(
    `https://picsum.photos/id/${Math.floor(Math.random() * 80) + 20}/1200/400`
  );

  const [courseStatusFilter, setCourseStatusFilter] = useState('all');
  const [clientRatingFilter, setClientRatingFilter] = useState('all');
  const [planningStatusFilter, setPlanningStatusFilter] = useState('all');
  const [editingProject, setEditingProject] = useState<ProjectWithMeta | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [appPrefs, setAppPrefs] = useState<ClientAppPreferencesSnapshot>(() => loadClientAppPreferences());
  const [planningMonth, setPlanningMonth] = useState(() => new Date());
  const [planningModalDate, setPlanningModalDate] = useState<string | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [topbarAccountMenuOpen, setTopbarAccountMenuOpen] = useState(false);
  const [paltoMenuOpen, setPaltoMenuOpen] = useState(false);
  const [bugReportModalOpen, setBugReportModalOpen] = useState(false);
  const [bugSentiment, setBugSentiment] = useState<'up' | 'down' | null>(null);
  const [bugMessage, setBugMessage] = useState('');
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [inboxTick, setInboxTick] = useState(0);
  const [complianceUiTick, setComplianceUiTick] = useState(0);
  const [orgSubView, setOrgSubView] = useState<OrganizationSubView>('profile');
  const [userSubView, setUserSubView] = useState<UserSubView>('profile');
  const [paltoAccountSection, setPaltoAccountSection] = useState<ChauffeurPaltoAccountSection>('personal');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const paltoMenuRef = useRef<HTMLDivElement | null>(null);
  const topbarAccountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('dashboardView');
    if (requestedView === 'user') {
      setActiveView('user');
      setUserSubView('profile');
    }
  }, []);

  const [newCourseForm, setNewCourseForm] = useState({
    clientId: DASHBOARD_FALLBACK_CLIENT_ROW.id,
    date: new Date().toISOString().slice(0, 10),
    heure: '08:00',
    depart: '',
    arrivee: '',
    km: '',
    montant: '',
    modePaiement: 'carte' as 'carte' | 'especes',
    statut: 'En attente',
  });
  const [courseRows, setCourseRows] = useState<CourseRowState[]>(() => {
    return [];
  });

  const clientRows = useMemo(() => buildDashboardClientRowsFromCourses(courseRows), [courseRows]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedClientId((prev) => {
      if (prev && clientRows.some((c) => c.id === prev)) return prev;
      return clientRows[0]?.id ?? null;
    });
  }, [clientRows]);

  useEffect(() => {
    if (clientRows.length === 0) return;
    setNewCourseForm((prev) =>
      clientRows.some((c) => c.id === prev.clientId) ? prev : { ...prev, clientId: clientRows[0].id }
    );
  }, [clientRows]);

  const refreshRides = useCallback(async () => {
    if (!persistRides) return;
    try {
      const rows = await fetchChauffeurRidesFromApi();
      setCourseRows(rows);
    } catch (e) {
      console.error('[Dashboard] refresh rides', e);
    }
  }, [persistRides]);

  useEffect(() => {
    if (!persistRides || !isAuthenticated() || !supabaseRealtimeConfigured()) return;
    return subscribePaltoCoursesRealtime(() => {
      if (!isAuthenticated()) return;
      void refreshRides();
    });
  }, [persistRides, refreshRides]);

  const [chauffeurProfile, setChauffeurProfile] = useState<ChauffeurProfile>(() => {
    const currentUserEmail = getChauffeurSessionEmail();
    const emailNorm = normalizeChauffeurEmail(currentUserEmail);
    const storedProfile = loadStoredChauffeurProfile(emailNorm);
    if (storedProfile) return storedProfile;

    const inferred = inferProfileFromEmail(emailNorm);
    const registryPhone = loadChauffeurRegistry()[emailNorm]?.phoneInternational ?? '';
    return {
      nom: inferred.nom,
      prenom: inferred.prenom,
      email: currentUserEmail,
      telephone: registryPhone,
      ville: '',
      vehicule: '',
      plaque: '',
      profilePhotoUrl: null,
      organizationPhotoUrl: null,
      vehiclePhotoUrl: null,
      profilePhotoName: '',
      organizationPhotoName: '',
      vehiclePhotoName: '',
    };
  });
  const [userProfileDraft, setUserProfileDraft] = useState<ChauffeurProfile>(chauffeurProfile);
  const [chauffeurPayment, setChauffeurPayment] = useState<ChauffeurPayment>({
    ibanMasked: '',
    payoutFrequency: 'Hebdomadaire',
    modePrincipal: 'Carte + espèces',
  });
  const [paymentDraft, setPaymentDraft] = useState<ChauffeurPayment>(chauffeurPayment);
  const [chauffeurRideSettings, setChauffeurRideSettings] = useState<ChauffeurRideSettings>(() =>
    loadChauffeurRideSettingsSnapshot()
  );
  const [rideSettingsDraft, setRideSettingsDraft] = useState<ChauffeurRideSettings>(chauffeurRideSettings);
  const [chauffeurDocuments, setChauffeurDocuments] = useState<ChauffeurDocument[]>([
    { key: 'permis', label: 'Permis', expiry: '', status: 'pending' },
    { key: 'assurance', label: 'Assurance', expiry: '', status: 'pending' },
    { key: 'carte-grise', label: 'Carte grise', expiry: '', status: 'pending' },
    { key: 'controle-technique', label: 'Contrôle technique', expiry: '', status: 'pending' },
  ]);
  const [documentUploadDraft, setDocumentUploadDraft] = useState<Record<ChauffeurDocument['key'], string>>({
    permis: '',
    assurance: '',
    'carte-grise': '',
    'controle-technique': '',
  });
  const [chauffeurOrg, setChauffeurOrg] = useState<ChauffeurOrgSnapshot | null>(() => loadChauffeurOrg());
  const [orgInviteEmail, setOrgInviteEmail] = useState('');
  const [orgFleetZoneFilter, setOrgFleetZoneFilter] = useState<FleetZoneId | 'all'>('all');
  const [orgInviteError, setOrgInviteError] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(chauffeurProfile.profilePhotoUrl ?? null);
  const [organizationPhotoUrl, setOrganizationPhotoUrl] = useState<string | null>(chauffeurProfile.organizationPhotoUrl ?? null);
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(chauffeurProfile.vehiclePhotoUrl ?? null);
  const [profilePhotoName, setProfilePhotoName] = useState(chauffeurProfile.profilePhotoName ?? '');
  const [organizationPhotoName, setOrganizationPhotoName] = useState(chauffeurProfile.organizationPhotoName ?? '');
  const [vehiclePhotoName, setVehiclePhotoName] = useState(chauffeurProfile.vehiclePhotoName ?? '');
  const [profilePhotoDraftUrl, setProfilePhotoDraftUrl] = useState<string | null>(null);
  const [organizationPhotoDraftUrl, setOrganizationPhotoDraftUrl] = useState<string | null>(null);
  const [vehiclePhotoDraftUrl, setVehiclePhotoDraftUrl] = useState<string | null>(null);
  const [profilePhotoDraftName, setProfilePhotoDraftName] = useState('');
  const [organizationPhotoDraftName, setOrganizationPhotoDraftName] = useState('');
  const [vehiclePhotoDraftName, setVehiclePhotoDraftName] = useState('');
  const [plateError, setPlateError] = useState<string | null>(null);
  const [plateLookupHint, setPlateLookupHint] = useState<string | null>(null);
  const [isPlateLookupLoading, setIsPlateLookupLoading] = useState(false);
  const [phoneCountryDraft, setPhoneCountryDraft] = useState<SupportedPhoneCountry>('RE');
  const [phoneNationalDraft, setPhoneNationalDraft] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [authSessionTick, setAuthSessionTick] = useState(0);
  /** true pendant édition profil chauffeur — bloque l’écrasement du brouillon par la sync serveur. */
  const profileFormDirtyRef = useRef(false);
  const profileHydratedEmailRef = useRef<string | null>(null);
  const [complianceApiSnapshot, setComplianceApiSnapshot] = useState<ChauffeurComplianceSnapshot | null>(null);
  const [apiChauffeurStats, setApiChauffeurStats] = useState<ChauffeurActivityStatsForView | null>(null);
  const [apiHeatmapStats, setApiHeatmapStats] = useState<ChauffeurHeatmapStatsForView | null>(null);
  const useOrgApi = organizationApiEnabled();
  const useComplianceApi = complianceApiEnabled();
  const useStatsApi = statsApiEnabled();
  const paltoIdentity = useMemo(() => {
    const sessionEmail = getChauffeurSessionEmail().trim().toLowerCase();
    const inferred = inferProfileFromEmail(sessionEmail);
    const inferredName = `${inferred.prenom} ${inferred.nom}`.trim();
    const driverName = `${chauffeurProfile.prenom} ${chauffeurProfile.nom}`.trim();
    const photo =
      typeof chauffeurProfile.profilePhotoUrl === 'string' && chauffeurProfile.profilePhotoUrl.trim()
        ? chauffeurProfile.profilePhotoUrl
        : null;
    return {
      email: sessionEmail || chauffeurProfile.email,
      fullName: driverName || inferredName || 'Compte Palto',
      photoUrl: photo,
    };
  }, [
    authSessionTick,
    chauffeurProfile.email,
    chauffeurProfile.nom,
    chauffeurProfile.prenom,
    chauffeurProfile.profilePhotoUrl,
  ]);
  useEffect(() => {
    const bump = () => setAuthSessionTick((n) => n + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key == null) return;
      if (e.key === 'dashboard_token' || e.key === 'dashboard_auth' || e.key === 'palto:client_token' || e.key === 'palto:client_auth') {
        bump();
      }
    };
    window.addEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, bump as EventListener);
    window.addEventListener(PALTO_CHAUFFEUR_SESSION_CHANGED_EVENT, bump as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PALTO_CLIENT_SESSION_CHANGED_EVENT, bump as EventListener);
      window.removeEventListener(PALTO_CHAUFFEUR_SESSION_CHANGED_EVENT, bump as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const applyChauffeurProfileToUi = useCallback(
    (profile: ChauffeurProfile, options?: { overwriteDraft?: boolean }) => {
      const vehiculeSlug = normalizeVehicleSlugForSelect(profile.vehicule);
      const normalized: ChauffeurProfile = {
        ...profile,
        ville: profile.ville ?? '',
        vehicule: vehiculeSlug || (profile.vehicule ?? '').trim(),
        plaque: profile.plaque ?? '',
        prenom: profile.prenom ?? '',
        nom: profile.nom ?? '',
        email: profile.email ?? '',
        telephone: profile.telephone ?? '',
      };
      setChauffeurProfile(normalized);
      const mayTouchDraft =
        options?.overwriteDraft !== false && !profileFormDirtyRef.current;
      if (mayTouchDraft) {
        setUserProfileDraft(normalized);
        const parsedStoredPhone = parseStoredPhone(normalized.telephone);
        if (normalized.telephone.trim()) {
          setPhoneCountryDraft(parsedStoredPhone.country);
          setPhoneNationalDraft(parsedStoredPhone.nationalNumber);
        }
      }
      setProfilePhotoUrl(profile.profilePhotoUrl ?? null);
      setOrganizationPhotoUrl(profile.organizationPhotoUrl ?? null);
      setVehiclePhotoUrl(profile.vehiclePhotoUrl ?? null);
      setProfilePhotoName(profile.profilePhotoName ?? '');
      setOrganizationPhotoName(profile.organizationPhotoName ?? '');
      setVehiclePhotoName(profile.vehiclePhotoName ?? '');
    },
    []
  );

  useEffect(() => {
    const onProfileSynced = () => {
      if (profileFormDirtyRef.current) return;
      const sessionEmail = getChauffeurSessionEmail().toLowerCase();
      if (!sessionEmail) return;
      const merged = loadStoredChauffeurProfile(normalizeChauffeurEmail(sessionEmail));
      if (merged) applyChauffeurProfileToUi(merged, { overwriteDraft: true });
    };
    window.addEventListener(PALTO_CHAUFFEUR_PROFILE_SYNCED_EVENT, onProfileSynced);
    return () => {
      window.removeEventListener(PALTO_CHAUFFEUR_PROFILE_SYNCED_EVENT, onProfileSynced);
    };
  }, [applyChauffeurProfileToUi]);

  useEffect(() => {
    const sessionEmail = getChauffeurSessionEmail().toLowerCase();
    if (!sessionEmail) return;
    const emailNorm = normalizeChauffeurEmail(sessionEmail);
    let cancelled = false;

    const isNewSession = profileHydratedEmailRef.current !== emailNorm;
    if (isNewSession) {
      profileHydratedEmailRef.current = emailNorm;
      profileFormDirtyRef.current = false;

      const storedProfile = loadStoredChauffeurProfile(emailNorm);
      if (storedProfile) {
        applyChauffeurProfileToUi(storedProfile, { overwriteDraft: true });
      }

      const inferred = inferProfileFromEmail(sessionEmail);
      const registryPhone = loadChauffeurRegistry()[emailNorm]?.phoneInternational ?? '';
      const parsedRegistryPhone = parseStoredPhone(registryPhone);

      setChauffeurProfile((prev) => ({
        ...prev,
        email: prev.email.trim() ? prev.email : sessionEmail,
        prenom: prev.prenom.trim() ? prev.prenom : inferred.prenom,
        nom: prev.nom.trim() ? prev.nom : inferred.nom,
        telephone: prev.telephone.trim() ? prev.telephone : registryPhone,
      }));
      setUserProfileDraft((prev) => ({
        ...prev,
        email: prev.email.trim() ? prev.email : sessionEmail,
        prenom: prev.prenom.trim() ? prev.prenom : inferred.prenom,
        nom: prev.nom.trim() ? prev.nom : inferred.nom,
        telephone: prev.telephone.trim() ? prev.telephone : registryPhone,
      }));
      if (registryPhone.trim() && !storedProfile?.telephone.trim()) {
        setPhoneCountryDraft(parsedRegistryPhone.country);
        setPhoneNationalDraft(parsedRegistryPhone.nationalNumber);
      }

      void syncChauffeurProfileWithServer(sessionEmail).then(() => {
        if (cancelled || profileFormDirtyRef.current) return;
        const merged = loadStoredChauffeurProfile(emailNorm);
        if (merged) applyChauffeurProfileToUi(merged, { overwriteDraft: true });
      });
    }

    return () => {
      cancelled = true;
    };
  }, [applyChauffeurProfileToUi, authSessionTick]);

  useEffect(() => {
    saveChauffeurOrg(chauffeurOrg);
  }, [chauffeurOrg]);

  const persistOrganizationSnapshot = useCallback(
    async (next: ChauffeurOrgSnapshot | null) => {
      setChauffeurOrg(next);
      if (!useOrgApi) return;
      try {
        await saveChauffeurOrganizationToApi(next);
      } catch (e) {
        console.error('[Dashboard] save organization api', e);
      }
    },
    [useOrgApi]
  );

  useEffect(() => {
    if (!useOrgApi) return;
    let cancelled = false;
    void fetchChauffeurOrganizationFromApi()
      .then((org) => {
        if (cancelled) return;
        if (org) {
          setChauffeurOrg(org);
          saveChauffeurOrg(org);
        }
      })
      .catch((e) => {
        console.warn('[Dashboard] org api unavailable, fallback local', e);
      });
    return () => {
      cancelled = true;
    };
  }, [useOrgApi]);

  useEffect(() => {
    const onComplianceChanged = () => setComplianceUiTick((n) => n + 1);
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CHAUFFEUR_COMPLIANCE_KEY) {
        setComplianceUiTick((n) => n + 1);
      }
    };
    window.addEventListener(CHAUFFEUR_COMPLIANCE_CHANGED_EVENT, onComplianceChanged as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHAUFFEUR_COMPLIANCE_CHANGED_EVENT, onComplianceChanged as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (!useComplianceApi) {
      setComplianceApiSnapshot(null);
      return;
    }
    const email = getChauffeurSessionEmail();
    const norm = normalizeChauffeurEmail(email);
    if (!norm || !isChauffeurInSelfServiceRegistry(norm)) {
      setComplianceApiSnapshot(null);
      return;
    }
    let cancelled = false;
    void fetchChauffeurComplianceSnapshotFromApi(norm)
      .then((snapshot) => {
        if (!cancelled) setComplianceApiSnapshot(snapshot);
      })
      .catch(() => {
        if (!cancelled) setComplianceApiSnapshot(null);
      });
    return () => {
      cancelled = true;
    };
  }, [useComplianceApi, complianceUiTick]);

  useEffect(() => {
    const onOrgChanged = () => {
      const latest = loadChauffeurOrg();
      setChauffeurOrg((prev) => {
        if (prev === null && latest === null) return prev;
        if (prev && latest && JSON.stringify(prev) === JSON.stringify(latest)) return prev;
        return latest;
      });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'palto_chauffeur_organization_v1') onOrgChanged();
    };
    window.addEventListener(CHAUFFEUR_ORG_CHANGED_EVENT, onOrgChanged as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHAUFFEUR_ORG_CHANGED_EVENT, onOrgChanged as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (!chauffeurOrg && activeView === 'organization') {
      setActiveView('overview');
    }
  }, [chauffeurOrg, activeView]);

  const isChauffeurOrgAdmin = useMemo(() => {
    if (!chauffeurOrg) return false;
    return chauffeurOrg.members.some(
      (m) =>
        m.role === 'admin' &&
        m.status === 'active' &&
        m.email.toLowerCase() === chauffeurProfile.email.trim().toLowerCase()
    );
  }, [chauffeurOrg, chauffeurProfile.email]);

  /** Avis d’exemple sur la page « profil » flotte (à remplacer par des données API). */
  const orgProfileSampleReviews = useMemo((): OrgProfileSampleReview[] => {
    return [
      {
        id: 'sample-review-1',
        authorKey: 'driverDashboard.orgProfileReview1Author',
        bodyKey: 'driverDashboard.orgProfileReview1Body',
        rating: 5,
        isoDate: '2026-04-18',
      },
      {
        id: 'sample-review-2',
        authorKey: 'driverDashboard.orgProfileReview2Author',
        bodyKey: 'driverDashboard.orgProfileReview2Body',
        rating: 5,
        isoDate: '2026-04-02',
      },
      {
        id: 'sample-review-3',
        authorKey: 'driverDashboard.orgProfileReview3Author',
        bodyKey: 'driverDashboard.orgProfileReview3Body',
        rating: 4,
        isoDate: '2026-03-20',
      },
    ];
  }, []);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobileViewport(mobile);
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!paltoMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!paltoMenuRef.current) return;
      if (!paltoMenuRef.current.contains(event.target as Node)) {
        setPaltoMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [paltoMenuOpen]);

  useEffect(() => {
    if (!topbarAccountMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!topbarAccountMenuRef.current) return;
      if (!topbarAccountMenuRef.current.contains(event.target as Node)) {
        setTopbarAccountMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [topbarAccountMenuOpen]);

  useEffect(() => {
    if (planningModalDate === null || !isMobileViewport) return;
    const html = document.documentElement;
    const body = document.body;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
    };
  }, [planningModalDate, isMobileViewport]);

  const openChauffeurPaltoAccount = useCallback(
    (section: ChauffeurPaltoAccountSection = 'personal') => {
      setPaltoAccountSection(section);
      setUserSubView('palto-account');
      setActiveView('user');
      setTopbarAccountMenuOpen(false);
      if (isMobileViewport) {
        setMobileSidebarOpen(false);
      }
    },
    [isMobileViewport]
  );

  const handleNavSelect = useCallback(
    (view: DashboardView) => {
      setPaltoMenuOpen(false);
      if (view === 'organization') {
        setOrgSubView('profile');
      }
      if (view === 'user' && userSubView !== 'palto-account') {
        setUserSubView('profile');
      }
      setActiveView(view);
      if (isMobileViewport) {
        setMobileSidebarOpen(false);
      }
    },
    [isMobileViewport, userSubView]
  );

  const handleTopbarLogout = useCallback(() => {
    setTopbarAccountMenuOpen(false);
    logoutChauffeurToHome();
  }, []);

  const ORG_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  const handleInviteDriver = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!chauffeurOrg || !isChauffeurOrgAdmin) return;
      const email = orgInviteEmail.trim().toLowerCase();
      if (!ORG_EMAIL_RE.test(email)) {
        setOrgInviteError(t('driverDashboard.orgInviteInvalid'));
        return;
      }
      if (email === chauffeurProfile.email.trim().toLowerCase()) {
        setOrgInviteError(t('driverDashboard.orgInviteSelf'));
        return;
      }
      if (chauffeurOrg.members.some((m) => m.email.toLowerCase() === email)) {
        setOrgInviteError(t('driverDashboard.orgInviteDuplicate'));
        return;
      }
      setOrgInviteError(null);
      const member: ChauffeurOrgMember = {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        email,
        role: 'driver',
        status: 'pending',
        invitedAt: new Date().toISOString(),
        vehiclePlate: '',
        vehicleModel: '',
        zoneId: 'unset',
        availability: 'off',
      };
      appendChauffeurInboxItem({
        type: 'org_invite',
        targetEmail: email,
        orgName: chauffeurOrg.name,
        fleetCode: chauffeurOrg.fleetCode,
        inviterEmail: chauffeurProfile.email.trim(),
      });
      void persistOrganizationSnapshot(chauffeurOrg ? { ...chauffeurOrg, members: [...chauffeurOrg.members, member] } : null);
      setOrgInviteEmail('');
      setInboxTick((x) => x + 1);
    },
    [chauffeurOrg, isChauffeurOrgAdmin, orgInviteEmail, chauffeurProfile.email, t, persistOrganizationSnapshot]
  );

  const handleRemoveOrgMember = useCallback((member: ChauffeurOrgMember) => {
    if (member.role === 'admin') return;
    if (!chauffeurOrg) return;
    void persistOrganizationSnapshot({
      ...chauffeurOrg,
      members: chauffeurOrg.members.filter((m) => m.id !== member.id),
    });
  }, [chauffeurOrg, persistOrganizationSnapshot]);

  const handleUpdateMemberFleet = useCallback(
    (
      memberId: string,
      patch: Partial<Pick<ChauffeurOrgMember, 'zoneId' | 'vehiclePlate' | 'vehicleModel' | 'availability'>>
    ) => {
      if (!chauffeurOrg) return;
      void persistOrganizationSnapshot({
        ...chauffeurOrg,
        members: chauffeurOrg.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)),
      });
    },
    [chauffeurOrg, persistOrganizationSnapshot]
  );

  const fleetDuplicateMemberIds = useMemo(() => {
    if (!chauffeurOrg) return new Set<string>();
    const byPlate = new Map<string, string[]>();
    for (const m of chauffeurOrg.members) {
      if (m.status !== 'active') continue;
      const raw = (m.vehiclePlate ?? '').trim();
      if (!raw) continue;
      const key = normalizeFrenchPlate(raw) || raw.replace(/\s/g, '').toUpperCase();
      if (!byPlate.has(key)) byPlate.set(key, []);
      byPlate.get(key)!.push(m.id);
    }
    const dup = new Set<string>();
    for (const ids of byPlate.values()) {
      if (ids.length > 1) ids.forEach((id) => dup.add(id));
    }
    return dup;
  }, [chauffeurOrg]);

  const fleetZoneCounts = useMemo(() => {
    const counts = {} as Record<FleetZoneId, number>;
    for (const id of FLEET_ZONE_IDS) counts[id] = 0;
    if (!chauffeurOrg) return counts;
    for (const m of chauffeurOrg.members) {
      if (m.status !== 'active') continue;
      const z = m.zoneId ?? 'unset';
      if (z in counts) counts[z as FleetZoneId] += 1;
    }
    return counts;
  }, [chauffeurOrg]);

  const tFleetZone = useCallback((z: FleetZoneId) => t(`driverDashboard.${fleetZoneI18nKey(z)}`), [t]);
  const tFleetAvail = useCallback((a: FleetAvailability) => t(`driverDashboard.${fleetAvailabilityI18nKey(a)}`), [t]);

  const handleDeleteOrganization = useCallback(() => {
    if (!chauffeurOrg || !isChauffeurOrgAdmin) return;
    if (!window.confirm(t('driverDashboard.orgDeleteConfirm'))) return;
    void persistOrganizationSnapshot(null);
    handleNavSelect('overview');
  }, [chauffeurOrg, isChauffeurOrgAdmin, t, handleNavSelect, persistOrganizationSnapshot]);

  useEffect(() => {
    if (activeView === 'settings') {
      setAppPrefs(loadClientAppPreferences());
    }
  }, [activeView]);

  useEffect(() => {
    if (
      activeView === 'organization' &&
      !isChauffeurOrgAdmin &&
      (orgSubView === 'invites' || orgSubView === 'settings' || orgSubView === 'fleet')
    ) {
      setOrgSubView('profile');
    }
  }, [activeView, isChauffeurOrgAdmin, orgSubView]);

  const dashboardTopTitle = useMemo(() => {
    switch (activeView) {
      case 'overview':
        return t('driverDashboard.titleOverview');
      case 'courses':
        return t('driverDashboard.titleCourses');
      case 'ride-settings':
        return 'Paramètres de course';
      case 'stats':
        return t('driverDashboard.titleStats');
      case 'clients':
        return t('driverDashboard.titleClients');
      case 'planning':
        return t('driverDashboard.titlePlanning');
      case 'organization':
        return t('driverDashboard.titleOrganization');
      case 'user':
        return t('driverDashboard.titleUser');
      case 'settings':
        return t('driverDashboard.titleSettings');
      case 'help':
        return t('driverDashboard.titleHelp');
      default:
        return 'Palto';
    }
  }, [activeView, t]);

  const dashboardTopSubtitle = useMemo(
    () =>
      activeView === 'stats'
        ? t('driverDashboard.statsSubtitle')
        : t('driverDashboard.mainSubtitle'),
    [activeView, t]
  );

  useEffect(() => {
    if (!bugReportModalOpen) return;
    setBugMessage('');
    setBugSentiment(null);
  }, [bugReportModalOpen]);

  const submitBugReport = useCallback(async () => {
    const trimmed = bugMessage.trim();
    if (!trimmed) {
      toast.error(t('driverDashboard.bugValidation'));
      return;
    }
    const email = chauffeurProfile.email.trim();
    if (!email) {
      toast.error(t('driverDashboard.bugEmailMissing'));
      return;
    }
    const name =
      `${chauffeurProfile.prenom} ${chauffeurProfile.nom}`.trim() ||
      (language === 'en' ? 'Palto driver' : 'Chauffeur Palto');
    const sentimentFr =
      bugSentiment === 'up'
        ? 'Pouce en haut — RAS ou positif'
        : bugSentiment === 'down'
          ? 'Pouce en bas — bloquant'
          : 'Sans vote';
    const sentimentEn =
      bugSentiment === 'up'
        ? 'Thumbs up — OK / positive'
        : bugSentiment === 'down'
          ? 'Thumbs down — blocking'
          : 'No vote';
    const sentimentLine = language === 'en' ? sentimentEn : sentimentFr;
    const header =
      language === 'en'
        ? `[BUG — driver dashboard]\nActive view: ${activeView}\nFeeling: ${sentimentLine}`
        : `[BUG — tableau de bord chauffeur]\nVue active : ${activeView}\nRessenti : ${sentimentLine}`;
    const composed = `${header}\n\n${trimmed}`;
    setBugSubmitting(true);
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message: composed }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'send_failed');
      }
      trackEvent('click', 'chauffeur_dashboard', `bug_report_sent_${bugSentiment ?? 'none'}`);
      toast.success(t('driverDashboard.bugToastOk'));
      setBugReportModalOpen(false);
    } catch {
      toast.error(t('driverDashboard.bugToastErr'));
    } finally {
      setBugSubmitting(false);
    }
  }, [
    activeView,
    bugMessage,
    bugSentiment,
    chauffeurProfile.email,
    chauffeurProfile.nom,
    chauffeurProfile.prenom,
    language,
    t,
  ]);

  const setAppTheme = useCallback((theme: AppTheme) => {
    setAppPrefs((prev) => {
      const next = { ...prev, theme };
      saveClientAppPreferences(next);
      trackEvent('click', 'chauffeur_dashboard', `theme_${theme}`);
      return next;
    });
  }, []);

  const setFontScalePercent = useCallback((raw: number) => {
    const fontScalePercent = clampFontScalePercent(raw);
    setAppPrefs((prev) => {
      const next = { ...prev, fontScalePercent };
      saveClientAppPreferences(next);
      trackEvent('click', 'chauffeur_dashboard', `font_scale_${fontScalePercent}`);
      return next;
    });
  }, []);

  const toggleAppNotify = useCallback((key: 'notifyEmail' | 'notifySms' | 'notifyPush') => {
    setAppPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveClientAppPreferences(next);
      trackEvent('click', 'chauffeur_dashboard', `notify_${key}_${next[key] ? 'on' : 'off'}`);
      return next;
    });
  }, []);

  useEffect(() => {
    const onCompleted = (ev: Event) => {
      const ce = ev as CustomEvent<{ id?: string }>;
      const id = ce.detail?.id;
      if (!id) return;
      if (persistRides) {
        // La clôture API est faite dans DriverNavigationView (Dashboard souvent absent sur /navigation).
        void refreshRides();
        return;
      }
      setCourseRows((prev) =>
        prev.map((course) =>
          course.id === id && course.statut === 'En cours' ? { ...course, statut: 'Terminee' } : course
        )
      );
    };
    window.addEventListener(CHAUFFEUR_COURSE_COMPLETED_EVENT, onCompleted as EventListener);
    return () => window.removeEventListener(CHAUFFEUR_COURSE_COMPLETED_EVENT, onCompleted as EventListener);
  }, [persistRides, refreshRides]);

  useEffect(() => {
    if (!persistRides || !isAuthenticated()) return;
    void refreshRides();
  }, [persistRides, refreshRides]);

  useEffect(() => {
    if (!persistRides || !isAuthenticated()) return;
    const intervalMs = supabaseRealtimeConfigured() ? 60000 : 25000;
    const t = window.setInterval(() => {
      void refreshRides();
    }, intervalMs);
    return () => clearInterval(t);
  }, [persistRides, refreshRides]);

  useEffect(() => {
    if (!useStatsApi || !isAuthenticated()) {
      setApiChauffeurStats(null);
      setApiHeatmapStats(null);
      return;
    }
    let cancelled = false;
    const pull = () =>
      fetchChauffeurStatsFromApi()
        .then((payload) => {
          if (!cancelled) {
            setApiChauffeurStats(payload.stats);
            setApiHeatmapStats(payload.heatmap ?? null);
          }
        })
        .catch((e) => {
          console.warn('[Dashboard] stats api unavailable, fallback local', e);
          if (!cancelled) {
            setApiChauffeurStats(null);
            setApiHeatmapStats(null);
          }
        });
    void pull();
    const timer = window.setInterval(() => {
      void pull();
    }, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [useStatsApi, activeView, courseRows.length]);
  const selectedNewCourseClient =
    clientRows.find((client) => client.id === newCourseForm.clientId) ??
    clientRows[0] ??
    DASHBOARD_FALLBACK_CLIENT_ROW;
  const displayedCourseRows = courseRows.filter((course) => {
    if (courseStatusFilter !== 'all' && course.statut !== courseStatusFilter) return false;
    return true;
  });
  const displayedClientRows = clientRows.filter((client) => {
    if (clientRatingFilter === 'all') return true;
    if (clientRatingFilter === 'high') return Number(client.note) >= 4.8;
    if (clientRatingFilter === 'medium') return Number(client.note) >= 4.6 && Number(client.note) < 4.8;
    return Number(client.note) < 4.6;
  });
  const alertItems = useMemo<DashboardAlertItem[]>(() => {
    const me = chauffeurProfile.email.trim().toLowerCase();
    const inboxRows = loadChauffeurInbox()
      .filter((n) => n.targetEmail.trim().toLowerCase() === me)
      .map((n) => ({
        id: n.id,
        kind: 'org_invite',
        title: t('driverDashboard.orgInviteNotifTitle', { org: n.orgName }),
        description: t('driverDashboard.orgInviteNotifDesc', {
          code: n.fleetCode,
          from: n.inviterEmail,
        }),
      }));

    const now = new Date();
    const pendingDemands = courseRows
      .filter((c) => c.statut === 'En attente')
      .slice(0, 2)
      .map((c) => ({
        id: `demand-${c.id}`,
        kind: 'demand' as const,
        title: 'Nouvelle demande client',
        description: `${c.depart} -> ${c.arrivee} · ${c.heure}`,
        courseId: c.id,
      }));

    const systemHint = {
      id: 'system-hint-1',
      kind: 'system' as const,
      title: 'Mise a jour proximite',
      description:
        `Derniere synchro a ${now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })} · classement par distance active`,
    };

    return [...inboxRows, ...pendingDemands, systemHint];
  }, [courseRows, chauffeurProfile.email, inboxTick, t]);

  const planningYear = planningMonth.getFullYear();
  const planningMonthIndex = planningMonth.getMonth();
  const planningMonthPrefix = `${planningYear}-${String(planningMonthIndex + 1).padStart(2, '0')}-`;
  const easter = getEasterDate(planningYear);
  const reunionHolidays = [
    { label: "Jour de l'an", date: new Date(planningYear, 0, 1) },
    { label: 'Lundi de Paques', date: addDays(easter, 1) },
    { label: 'Fete du Travail', date: new Date(planningYear, 4, 1) },
    { label: 'Victoire 1945', date: new Date(planningYear, 4, 8) },
    { label: 'Ascension', date: addDays(easter, 39) },
    { label: 'Lundi de Pentecote', date: addDays(easter, 50) },
    { label: 'Fete nationale', date: new Date(planningYear, 6, 14) },
    { label: 'Assomption', date: new Date(planningYear, 7, 15) },
    { label: 'Toussaint', date: new Date(planningYear, 10, 1) },
    { label: 'Armistice', date: new Date(planningYear, 10, 11) },
    { label: 'Noel', date: new Date(planningYear, 11, 25) },
    { label: "Abolition de l'esclavage (La Reunion)", date: new Date(planningYear, 11, 20) },
  ];
  const holidayKeyToLabel = new Map(
    reunionHolidays.map((h) => [h.date.toISOString().slice(0, 10), h.label])
  );
  const planningCoursesByDay = useMemo(() => {
    const grouped: Record<
      number,
      Array<{ id: string; heure: string; statut: string; bookingKind?: BookingKindUi }>
    > = {};
    for (const course of courseRows) {
      if (!course.date.startsWith(planningMonthPrefix)) continue;
      if (planningStatusFilter !== 'all' && course.statut !== planningStatusFilter) continue;
      if (course.statut === 'Annulee') continue;
      const day = Number(course.date.slice(-2));
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push({
        id: course.id,
        heure: course.heure,
        statut: course.statut,
        bookingKind: course.bookingKind,
      });
    }
    Object.keys(grouped).forEach((key) => {
      grouped[Number(key)].sort((a, b) => a.heure.localeCompare(b.heure));
    });
    return grouped;
  }, [courseRows, planningMonthPrefix, planningStatusFilter]);

  const monthStart = new Date(planningYear, planningMonthIndex, 1);
  const monthDays = new Date(planningYear, planningMonthIndex + 1, 0).getDate();
  const monthStartWeekday = (monthStart.getDay() + 6) % 7; // Lundi=0
  const monthCells: Array<{
    day?: number;
    holiday?: string;
    slots?: Array<{ id: string; heure: string; statut: string; bookingKind?: BookingKindUi }>;
    isToday?: boolean;
  }> = [];
  for (let i = 0; i < monthStartWeekday; i += 1) monthCells.push({});
  const today = new Date();
  for (let day = 1; day <= monthDays; day += 1) {
    const date = new Date(planningYear, planningMonthIndex, day);
    const key = date.toISOString().slice(0, 10);
    monthCells.push({
      day,
      holiday: holidayKeyToLabel.get(key),
      slots: planningCoursesByDay[day] ?? [],
      isToday:
        day === today.getDate() &&
        planningMonthIndex === today.getMonth() &&
        planningYear === today.getFullYear(),
    });
  }
  while (monthCells.length % 7 !== 0) monthCells.push({});

  const planningSlotsForModal = useMemo(() => {
    if (!planningModalDate) return [];
    return courseRows
      .filter((course) => course.date === planningModalDate && course.statut !== 'Annulee')
      .filter((course) => planningStatusFilter === 'all' || course.statut === planningStatusFilter)
      .sort((a, b) => a.heure.localeCompare(b.heure))
      .map((c) => ({ id: c.id, heure: c.heure, statut: c.statut, bookingKind: c.bookingKind }));
  }, [planningModalDate, courseRows, planningStatusFilter]);

  const coursesBlockedByCompliance = useMemo(() => {
    void complianceUiTick;
    const email = getChauffeurSessionEmail();
    if (!email?.trim()) return false;
    if (isChauffeurPrimaryAccountEmail(email)) return false;
    const norm = normalizeChauffeurEmail(email);
    if (!isChauffeurInSelfServiceRegistry(norm)) return false;
    if (useComplianceApi && complianceApiSnapshot) {
      return !complianceFullySatisfied(complianceApiSnapshot);
    }
    return !complianceFullySatisfied(loadComplianceSnapshot(norm));
  }, [complianceUiTick, useComplianceApi, complianceApiSnapshot]);

  const handleDemandAlertAction = useCallback(
    async (courseId: string, action: 'accept' | 'decline') => {
      if (coursesBlockedByCompliance) return;
      const target = courseRows.find((c) => c.id === courseId);
      if (!target || target.statut !== 'En attente') return;

      if (persistRides) {
        try {
          await postChauffeurRideAction(courseId, action === 'accept' ? 'accept' : 'cancel');
          await refreshRides();
        } catch (err) {
          console.error(err);
        }
        return;
      }

      setCourseRows((prev) =>
        prev.map((course) =>
          course.id === courseId ? { ...course, statut: action === 'accept' ? 'Acceptee' : 'Annulee' } : course
        )
      );
    },
    [courseRows, coursesBlockedByCompliance, persistRides, refreshRides]
  );

  const launchCourseById = useCallback(
    async (courseId: string) => {
      if (coursesBlockedByCompliance) return;
      if (persistRides) {
        try {
          await postChauffeurRideAction(courseId, 'start');
          const rows = await fetchChauffeurRidesFromApi();
          const routeSnapDeviationKm = Math.round((0.06 + Math.random() * 0.38) * 100) / 100;
          const rowsWithDev = rows.map((c) =>
            c.id === courseId && c.statut === 'En cours' ? { ...c, routeSnapDeviationKm } : c
          );
          setCourseRows(rowsWithDev);
          const current = rowsWithDev.find((c) => c.id === courseId && c.statut === 'En cours');
          if (!current) return;
          const startedAt = current.startedAt ?? Date.now();
          const snap: ChauffeurNavCourseSnapshot = {
            id: current.id,
            depart: current.depart,
            arrivee: current.arrivee,
            client: current.client,
            km: current.km,
            date: current.date,
            heure: current.heure,
            montantPrevuEuros: current.montant,
            modePaiement: current.modePaiement ?? 'carte',
            startedAt,
            pickupLng: current.pickupLng,
            pickupLat: current.pickupLat,
            dropoffLng: current.dropoffLng,
            dropoffLat: current.dropoffLat,
          };
          try {
            sessionStorage.setItem(CHAUFFEUR_NAV_COURSE_STORAGE_KEY, JSON.stringify(snap));
          } catch {
            /* ignore quota / private mode */
          }
          queueMicrotask(() => {
            onOpenActiveCourseNavigation?.(courseId);
          });
        } catch (e) {
          console.error('[Dashboard] launch course', e);
        }
        return;
      }
      const startedAt = Date.now();
      const routeSnapDeviationKm = Math.round((0.06 + Math.random() * 0.38) * 100) / 100;
      setCourseRows((prev) => {
        const current = prev.find((c) => c.id === courseId && c.statut === 'Acceptee');
        if (!current) return prev;
        const updated: CourseRowState = {
          ...current,
          statut: 'En cours',
          startedAt,
          routeSnapDeviationKm,
        };
        const snap: ChauffeurNavCourseSnapshot = {
          id: current.id,
          depart: current.depart,
          arrivee: current.arrivee,
          client: current.client,
          km: current.km,
          date: current.date,
          heure: current.heure,
          montantPrevuEuros: current.montant,
          modePaiement: current.modePaiement ?? 'carte',
          startedAt,
          pickupLng: current.pickupLng,
          pickupLat: current.pickupLat,
          dropoffLng: current.dropoffLng,
          dropoffLat: current.dropoffLat,
        };
        try {
          sessionStorage.setItem(CHAUFFEUR_NAV_COURSE_STORAGE_KEY, JSON.stringify(snap));
        } catch {
          /* ignore quota / private mode */
        }
        queueMicrotask(() => {
          onOpenActiveCourseNavigation?.(courseId);
        });
        return prev.map((course) => (course.id === courseId ? updated : course));
      });
    },
    [onOpenActiveCourseNavigation, persistRides, coursesBlockedByCompliance]
  );

  const resumeCourseById = useCallback(
    (courseId: string) => {
      const current = courseRows.find((c) => c.id === courseId && c.statut === 'En cours');
      if (!current) return;
      const startedAt = current.startedAt ?? Date.now();
      const snap: ChauffeurNavCourseSnapshot = {
        id: current.id,
        depart: current.depart,
        arrivee: current.arrivee,
        client: current.client,
        km: current.km,
        date: current.date,
        heure: current.heure,
        montantPrevuEuros: current.montant,
        modePaiement: current.modePaiement ?? 'carte',
        startedAt,
        pickupLng: current.pickupLng,
        pickupLat: current.pickupLat,
        dropoffLng: current.dropoffLng,
        dropoffLat: current.dropoffLat,
      };
      try {
        sessionStorage.setItem(CHAUFFEUR_NAV_COURSE_STORAGE_KEY, JSON.stringify(snap));
      } catch {
        /* ignore quota / private mode */
      }
      queueMicrotask(() => {
        onOpenActiveCourseNavigation?.(courseId);
      });
    },
    [courseRows, onOpenActiveCourseNavigation]
  );

  const completeCourseById = useCallback(
    async (courseId: string) => {
      const current = courseRows.find((c) => c.id === courseId);
      if (!current || current.statut !== 'En cours') return;
      if (persistRides) {
        try {
          await postChauffeurRideAction(courseId, 'complete');
          await refreshRides();
        } catch (err) {
          console.error(err);
        }
        return;
      }
      setCourseRows((prev) =>
        prev.map((course) => (course.id === courseId ? { ...course, statut: 'Terminee' } : course))
      );
    },
    [courseRows, persistRides, refreshRides]
  );

  const topbarLaunchCourse = useMemo(() => {
    const accepted = courseRows.filter((c) => c.statut === 'Acceptee');
    accepted.sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));
    return accepted[0] ?? null;
  }, [courseRows]);

  const handleSave = (_project: ProjectWithMeta) => {
    setEditingProject(null);
    setIsCreating(false);
  };

  const weeklyHeatmap = useMemo(() => {
    const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const course of courseRows) {
      if (course.statut === 'Annulee') continue;
      const date = new Date(`${course.date}T12:00:00`);
      const jsDay = date.getDay(); // 0=dimanche
      const mondayIndex = jsDay === 0 ? 6 : jsDay - 1;
      counts[mondayIndex] += 1;
    }
    const max = Math.max(1, ...counts);
    const total = counts.reduce((acc, n) => acc + n, 0);
    const cells = labels.map((label, idx) => ({
      label,
      count: counts[idx],
      level: counts[idx] / max,
    }));
    return { cells, total };
  }, [courseRows]);

  const localChauffeurActivityStats = useMemo(() => {
    const completed = courseRows.filter((c) => c.statut === 'Terminee').length;
    const cancelled = courseRows.filter((c) => c.statut === 'Annulee').length;
    const inProgress = courseRows.filter((c) => c.statut === 'En cours').length;
    const pending = courseRows.filter((c) => c.statut === 'En attente').length;
    const acceptedOrInProgress = courseRows.filter(
      (c) => c.statut === 'Acceptee' || c.statut === 'En cours'
    ).length;
    const totalIncome = courseRows
      .filter((c) => c.statut !== 'Annulee')
      .reduce((acc, c) => acc + c.montant, 0);
    const acceptanceRate =
      completed + acceptedOrInProgress > 0
        ? Math.round((acceptedOrInProgress / (completed + acceptedOrInProgress)) * 100)
        : 0;
    const cancellationRate =
      courseRows.length > 0 ? Math.round((cancelled / courseRows.length) * 100) : 0;
    return {
      completed,
      cancelled,
      inProgress,
      pending,
      totalCourses: courseRows.length,
      acceptanceRate,
      cancellationRate,
      rating: 0,
      onlineHoursWeek: 0,
      totalIncome,
      lastPayout: '—',
    };
  }, [courseRows]);

  const chauffeurActivityStats = useMemo(
    () => (useStatsApi && apiChauffeurStats ? apiChauffeurStats : localChauffeurActivityStats),
    [useStatsApi, apiChauffeurStats, localChauffeurActivityStats]
  );

  const totalDistanceKm = useMemo(() => {
    return courseRows
      .filter((course) => course.statut !== 'Annulee')
      .reduce((sum, course) => sum + Math.max(0, Number(course.km) || 0), 0);
  }, [courseRows]);

  const overviewFocusCourses = useMemo(() => {
    return [...courseRows]
      .filter((c) => c.statut !== 'Annulee')
      .sort((a, b) => {
        const ta = new Date(`${a.date}T${a.heure}:00`).getTime();
        const tb = new Date(`${b.date}T${b.heure}:00`).getTime();
        return tb - ta;
      })
      .slice(0, 2);
  }, [courseRows]);

  const overviewNextCourse = useMemo(() => {
    const now = Date.now();
    return [...courseRows]
      .filter((course) => course.statut !== 'Annulee' && course.statut !== 'Terminee')
      .map((course) => ({
        course,
        ts: new Date(`${course.date}T${course.heure}:00`).getTime(),
      }))
      .filter((entry) => Number.isFinite(entry.ts) && entry.ts >= now)
      .sort((a, b) => a.ts - b.ts)[0]?.course;
  }, [courseRows]);

  const markProfileFormDirty = useCallback(() => {
    profileFormDirtyRef.current = true;
  }, []);

  const isChauffeurProfileFormDirty = useMemo(() => {
    const savedPhone = parseStoredPhone(chauffeurProfile.telephone);
    const draftVehicle = normalizeVehicleSlugForSelect(userProfileDraft.vehicule);
    const savedVehicle = normalizeVehicleSlugForSelect(chauffeurProfile.vehicule);
    return (
      userProfileDraft.ville.trim() !== chauffeurProfile.ville.trim() ||
      draftVehicle !== savedVehicle ||
      normalizeFrenchPlate(userProfileDraft.plaque) !== normalizeFrenchPlate(chauffeurProfile.plaque) ||
      phoneNationalDraft !== savedPhone.nationalNumber ||
      phoneCountryDraft !== savedPhone.country ||
      (profilePhotoDraftUrl ?? '') !== (profilePhotoUrl ?? '') ||
      (organizationPhotoDraftUrl ?? '') !== (organizationPhotoUrl ?? '') ||
      (vehiclePhotoDraftUrl ?? '') !== (vehiclePhotoUrl ?? '') ||
      (profilePhotoDraftName ?? '') !== (profilePhotoName ?? '') ||
      (organizationPhotoDraftName ?? '') !== (organizationPhotoName ?? '') ||
      (vehiclePhotoDraftName ?? '') !== (vehiclePhotoName ?? '')
    );
  }, [
    chauffeurProfile.plaque,
    chauffeurProfile.telephone,
    chauffeurProfile.vehicule,
    chauffeurProfile.ville,
    organizationPhotoDraftName,
    organizationPhotoDraftUrl,
    organizationPhotoName,
    organizationPhotoUrl,
    phoneCountryDraft,
    phoneNationalDraft,
    profilePhotoDraftName,
    profilePhotoDraftUrl,
    profilePhotoName,
    profilePhotoUrl,
    userProfileDraft.plaque,
    userProfileDraft.vehicule,
    userProfileDraft.ville,
    vehiclePhotoDraftName,
    vehiclePhotoDraftUrl,
    vehiclePhotoName,
    vehiclePhotoUrl,
  ]);

  const cancelUserProfileEdit = useCallback(() => {
    profileFormDirtyRef.current = false;
    const parsedPhone = parseStoredPhone(chauffeurProfile.telephone);
    setUserProfileDraft(chauffeurProfile);
    setPhoneCountryDraft(parsedPhone.country);
    setPhoneNationalDraft(parsedPhone.nationalNumber);
    setProfilePhotoDraftUrl(profilePhotoUrl);
    setOrganizationPhotoDraftUrl(organizationPhotoUrl);
    setVehiclePhotoDraftUrl(vehiclePhotoUrl);
    setProfilePhotoDraftName(profilePhotoName);
    setOrganizationPhotoDraftName(organizationPhotoName);
    setVehiclePhotoDraftName(vehiclePhotoName);
    setPlateError(null);
    setPlateLookupHint(null);
    setPhoneError(null);
  }, [
    chauffeurProfile,
    organizationPhotoName,
    organizationPhotoUrl,
    profilePhotoName,
    profilePhotoUrl,
    vehiclePhotoName,
    vehiclePhotoUrl,
  ]);

  const saveUserProfileEdit = useCallback(() => {
    const normalizedPlate = normalizeFrenchPlate(userProfileDraft.plaque);

    const normalizedNationalPhone = normalizeNationalPhone(phoneCountryDraft, phoneNationalDraft);
    if (!isValidNationalPhone(phoneCountryDraft, normalizedNationalPhone)) {
      setPhoneError(
        phoneCountryDraft === 'FR'
          ? 'Numéro invalide (France): 9 chiffres attendus après +33.'
          : 'Numéro invalide (Réunion): format attendu type 69xxxxxxx ou 26xxxxxxx après +262.'
      );
      toast.error('Numéro invalide', { description: 'Corrige le téléphone avant enregistrement.' });
      return;
    }

    const vehicleSlug = normalizeVehicleSlugForSelect(userProfileDraft.vehicule);
    const nextProfile: ChauffeurProfile = {
      ...userProfileDraft,
      vehicule: vehicleSlug,
      plaque: normalizedPlate,
      telephone: buildInternationalPhone(phoneCountryDraft, normalizedNationalPhone),
      profilePhotoUrl: profilePhotoDraftUrl,
      organizationPhotoUrl: organizationPhotoDraftUrl,
      vehiclePhotoUrl: vehiclePhotoDraftUrl,
      profilePhotoName: profilePhotoDraftName,
      organizationPhotoName: organizationPhotoDraftName,
      vehiclePhotoName: vehiclePhotoDraftName,
    };

    setPlateError(null);
    setPhoneError(null);
    profileFormDirtyRef.current = false;
    setChauffeurProfile(nextProfile);
    setUserProfileDraft(nextProfile);
    persistStoredChauffeurProfile(nextProfile);
    void syncChauffeurProfileWithServer(nextProfile.email).then(() => {
      const merged = loadStoredChauffeurProfile(normalizeChauffeurEmail(nextProfile.email));
      if (merged) applyChauffeurProfileToUi(merged, { overwriteDraft: true });
    });
    const vehicleSlugForApi = vehicleSlug || null;
    void syncChauffeurRideProfileToServer({
      petFriendly: chauffeurRideSettings.petFriendly,
      luggageAssistance: chauffeurRideSettings.luggageAssistance,
      insulatedBag: chauffeurRideSettings.insulatedBag,
      vehicleType: vehicleSlugForApi,
    });
    setProfilePhotoUrl(profilePhotoDraftUrl);
    setOrganizationPhotoUrl(organizationPhotoDraftUrl);
    setVehiclePhotoUrl(vehiclePhotoDraftUrl);
    setProfilePhotoName(profilePhotoDraftName);
    setOrganizationPhotoName(organizationPhotoDraftName);
    setVehiclePhotoName(vehiclePhotoDraftName);
    toast.success('Profil chauffeur enregistré', {
      description: 'Synchronisation multi-appareils en cours…',
    });
  }, [
    organizationPhotoDraftName,
    organizationPhotoDraftUrl,
    profilePhotoDraftName,
    profilePhotoDraftUrl,
    phoneCountryDraft,
    phoneNationalDraft,
    chauffeurRideSettings.insulatedBag,
    chauffeurRideSettings.luggageAssistance,
    chauffeurRideSettings.petFriendly,
    userProfileDraft,
    vehiclePhotoDraftName,
    vehiclePhotoDraftUrl,
    applyChauffeurProfileToUi,
  ]);

  const handlePlateBlurLookup = useCallback(() => {
    const normalizedPlate = normalizeFrenchPlate(userProfileDraft.plaque);
    if (normalizedPlate !== userProfileDraft.plaque.trim()) {
      markProfileFormDirty();
    }
    setUserProfileDraft((prev) => ({ ...prev, plaque: normalizedPlate }));
    setPlateError(null);
    setPlateLookupHint(null);
    setIsPlateLookupLoading(false);
  }, [markProfileFormDirty, userProfileDraft.plaque]);

  const cancelPaymentEdit = useCallback(() => {
    setPaymentDraft(chauffeurPayment);
  }, [chauffeurPayment]);

  const savePaymentEdit = useCallback(() => {
    setChauffeurPayment(paymentDraft);
  }, [paymentDraft]);

  const computeAppliedPrice = useCallback((raw: string, multiplierPercent: number): string => {
    const normalized = raw.replace(',', '.').trim();
    const base = Number.parseFloat(normalized);
    if (!Number.isFinite(base)) return '—';
    return (base * (multiplierPercent / 100)).toFixed(2).replace('.', ',');
  }, []);

  const cancelRideSettingsEdit = useCallback(() => {
    setRideSettingsDraft(chauffeurRideSettings);
  }, [chauffeurRideSettings]);

  const saveRideSettingsEdit = useCallback(() => {
    setChauffeurRideSettings(rideSettingsDraft);
    saveChauffeurRideSettingsSnapshot(rideSettingsDraft);
    const vehicleSlug = isChauffeurVehicleType(chauffeurProfile.vehicule) ? chauffeurProfile.vehicule : null;
    void syncChauffeurRideProfileToServer({
      petFriendly: rideSettingsDraft.petFriendly,
      luggageAssistance: rideSettingsDraft.luggageAssistance,
      insulatedBag: rideSettingsDraft.insulatedBag,
      vehicleType: vehicleSlug,
    });
  }, [chauffeurProfile.vehicule, rideSettingsDraft]);

  /** Au chargement : lire Supabase (vérité pour la page Go), pas écraser la base avec le localStorage. */
  useEffect(() => {
    void fetchChauffeurRideProfileFromServer().then((profile) => {
      if (!profile) return
      setChauffeurRideSettings((prev) => {
        const next = {
          ...prev,
          petFriendly: profile.petFriendly,
          luggageAssistance: profile.luggageAssistance,
          insulatedBag: profile.insulatedBag,
        }
        saveChauffeurRideSettingsSnapshot(next)
        return next
      })
      setRideSettingsDraft((prev) => ({
        ...prev,
        petFriendly: profile.petFriendly,
        luggageAssistance: profile.luggageAssistance,
        insulatedBag: profile.insulatedBag,
      }))
      const vehicleSlug = normalizeVehicleSlugForSelect(profile.vehicleType) || (profile.vehicleType ?? '').trim();
      setChauffeurProfile((prev) => {
        if (profileFormDirtyRef.current || prev.vehicule.trim()) return prev;
        const next = { ...prev, vehicule: vehicleSlug };
        persistStoredChauffeurProfile(next);
        return next;
      });
      setUserProfileDraft((prev) => {
        if (profileFormDirtyRef.current || prev.vehicule.trim()) return prev;
        return { ...prev, vehicule: vehicleSlug };
      });
    })
  }, [])

  const isRideSettingsDirty = useMemo(
    () =>
      rideSettingsDraft.pricingMultiplierPercent !== chauffeurRideSettings.pricingMultiplierPercent ||
      rideSettingsDraft.maxPickupKm !== chauffeurRideSettings.maxPickupKm ||
      rideSettingsDraft.petFriendly !== chauffeurRideSettings.petFriendly ||
      rideSettingsDraft.luggageAssistance !== chauffeurRideSettings.luggageAssistance ||
      rideSettingsDraft.insulatedBag !== chauffeurRideSettings.insulatedBag,
    [rideSettingsDraft, chauffeurRideSettings]
  );

  const handleDocumentFilePick = useCallback((docKey: ChauffeurDocument['key'], fileName: string) => {
    setDocumentUploadDraft((prev) => ({ ...prev, [docKey]: fileName }));
  }, []);

  const submitDocumentRenewal = useCallback((docKey: ChauffeurDocument['key']) => {
    const selectedName = documentUploadDraft[docKey];
    if (!selectedName) return;

    setChauffeurDocuments((prev) =>
      prev.map((doc) =>
        doc.key === docKey
          ? { ...doc, status: 'pending', uploadedFileName: selectedName }
          : doc
      )
    );
    setDocumentUploadDraft((prev) => ({ ...prev, [docKey]: '' }));

    // Simulation de validation backend.
    window.setTimeout(() => {
      setChauffeurDocuments((prev) =>
        prev.map((doc) =>
          doc.key === docKey
            ? { ...doc, status: 'ok', expiry: 'Renouvelé · validé' }
            : doc
        )
      );
    }, 1600);
  }, [documentUploadDraft]);

  const handleImageUpload = useCallback(
    async (
      file: File | null | undefined,
      setDraftUrl: (value: string | null) => void,
      setDraftName: (value: string) => void
    ) => {
      if (!file) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setDraftUrl(dataUrl);
        setDraftName(file.name);
      } catch {
        // Ignore lecture error en mock UI.
      }
    },
    []
  );

  return (
    <div className="page active">
      <div className="main-accueil">
        <div
          className={`dashboard-container dashboard-container--chauffeur${activeView === 'user' ? ' dashboard-container--chauffeur-account' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}
        >
          {isMobileViewport && mobileSidebarOpen && (
            <button
              type="button"
              className="dashboard-mobile-backdrop"
              aria-label="Fermer le menu"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}
          {/* Sidebar */}
          <aside className="dashboard-sidebar">
            <div className="dashboard-sidebar-rail">
              <div className="dashboard-logo" ref={paltoMenuRef}>
              <button
                type="button"
                className="dashboard-logo-brand"
                onClick={() => setPaltoMenuOpen((prev) => !prev)}
                aria-label="Palto"
                aria-expanded={paltoMenuOpen}
              >
                <span className="dashboard-logo-dot" aria-hidden />
                <span className="dashboard-logo-title">Palto</span>
                <span className="dashboard-logo-chevron" aria-hidden>
                  {paltoMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>
              {paltoMenuOpen ? (
                <div className="dashboard-logo-menu" role="menu" aria-label="Navigation Palto">
                  <button
                    type="button"
                    className="dashboard-logo-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setPaltoMenuOpen(false);
                      if (onNavigatePublicHome) onNavigatePublicHome();
                    }}
                  >
                    Site Palto (grand public)
                  </button>
                  <button
                    type="button"
                    className="dashboard-logo-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setPaltoMenuOpen(false);
                      if (onNavigateDriverHome) onNavigateDriverHome();
                    }}
                  >
                    Site chauffeur
                  </button>
                </div>
              ) : null}
              <button
                className="topbar-icon-btn sidebar-toggle-btn"
                type="button"
                aria-label={sidebarCollapsed ? 'Etendre la navigation' : 'Reduire la navigation'}
                onClick={() => setSidebarCollapsed((prev) => !prev)}
              >
                <PanelLeft size={16} />
              </button>
              </div>
              <nav className="dashboard-nav">
              <button
                type="button"
                className={`dashboard-nav-item ${activeView === 'overview' ? 'active' : ''}`}
                onClick={() => handleNavSelect('overview')}
                aria-pressed={activeView === 'overview'}
              >
                <span className="nav-icon"><House size={18} /></span>
                <span className="nav-label">{t('driverDashboard.navOverview')}</span>
              </button>
              <button
                type="button"
                className={`dashboard-nav-item ${activeView === 'planning' ? 'active' : ''}`}
                onClick={() => handleNavSelect('planning')}
                aria-pressed={activeView === 'planning'}
              >
                <span className="nav-icon"><CalendarDays size={18} /></span>
                <span className="nav-label">{t('driverDashboard.navPlanning')}</span>
              </button>
              <button
                type="button"
                className={`dashboard-nav-item ${activeView === 'courses' ? 'active' : ''}`}
                onClick={() => handleNavSelect('courses')}
                aria-pressed={activeView === 'courses'}
              >
                <span className="nav-icon"><Car size={18} /></span>
                <span className="nav-label">{t('driverDashboard.navCourses')}</span>
              </button>
              <button
                type="button"
                className={`dashboard-nav-item ${activeView === 'stats' ? 'active' : ''}`}
                onClick={() => handleNavSelect('stats')}
                aria-pressed={activeView === 'stats'}
              >
                <span className="nav-icon"><BarChart3 size={18} /></span>
                <span className="nav-label">{t('driverDashboard.navStats')}</span>
              </button>
              <button
                type="button"
                className={`dashboard-nav-item ${activeView === 'clients' ? 'active' : ''}`}
                onClick={() => handleNavSelect('clients')}
                aria-pressed={activeView === 'clients'}
              >
                <span className="nav-icon"><Users size={18} /></span>
                <span className="nav-label">{t('driverDashboard.navClients')}</span>
              </button>
              {isMobileViewport ? (
                <button
                  type="button"
                  className={`dashboard-nav-item dashboard-nav-item-account ${activeView === 'user' ? 'active' : ''}`}
                  onClick={() => handleNavSelect('user')}
                  aria-pressed={activeView === 'user'}
                >
                  <span className="nav-icon"><User size={18} /></span>
                  <span className="nav-label">{t('driverDashboard.navUser')}</span>
                </button>
              ) : null}
              </nav>

              <div className="dashboard-sidebar-bottom">
                <div className="dashboard-topbar-icon-cluster">
                <div className="topbar-alerts-wrap">
                  <button
                    className="topbar-icon-btn topbar-icon-btn--danger"
                    type="button"
                    aria-label="Se déconnecter"
                    onClick={() => {
                      setAlertsOpen(false);
                      setMoreMenuOpen(false);
                      logoutChauffeurToHome();
                    }}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
                <div className="topbar-alerts-wrap">
                  <button
                    className="topbar-icon-btn"
                    type="button"
                    aria-label="Notifications"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setAlertsOpen((prev) => !prev);
                    }}
                  >
                    <Bell size={16} />
                  </button>
                </div>
                <div className="topbar-alerts-wrap">
                  <button
                    className="topbar-icon-btn"
                    type="button"
                    aria-label={t('driverDashboard.moreMenuAria')}
                    aria-expanded={moreMenuOpen}
                    onClick={() => {
                      setAlertsOpen(false);
                      setMoreMenuOpen((prev) => !prev);
                    }}
                  >
                    <MoreVertical size={16} aria-hidden />
                  </button>
                </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content — gap supprimé sous la topbar en vue Organisation (2e sidebar alignée) */}
          <div
            className={`dashboard-main${
              activeView === 'organization' ? ' dashboard-main--org-flush' : ''
            }${
              isMobileViewport && !topbarLaunchCourse ? ' dashboard-main--chauffeur-mobile-floating-account' : ''
            }`}
          >
            <header
              className={`dashboard-topbar${
                topbarLaunchCourse || isMobileViewport ? '' : ' dashboard-topbar--with-main-subtitle'
              }${
                isMobileViewport && !topbarLaunchCourse
                  ? ' dashboard-topbar--chauffeur-mobile-toolbar'
                  : ''
              }`}
            >
              {topbarLaunchCourse ? (
                <div className="topbar-ride-wrap" aria-label="Prochaine course acceptee">
                  <div className="topbar-ride-strip">
                    <TopbarRideStripAutoScroll scrollKey={topbarLaunchCourse.id}>
                      <MapPin size={14} className="topbar-ride-ico" aria-hidden />
                      <span className="topbar-ride-dep" title={topbarLaunchCourse.depart}>
                        {topbarLaunchCourse.depart}
                      </span>
                      <ArrowRight size={14} className="topbar-ride-ico" aria-hidden />
                      <span className="topbar-ride-arr" title={topbarLaunchCourse.arrivee}>
                        {topbarLaunchCourse.arrivee}
                      </span>
                      <span className="topbar-ride-meta">
                        {topbarLaunchCourse.client} · {topbarLaunchCourse.km.toFixed(1)} km
                      </span>
                    </TopbarRideStripAutoScroll>
                    <button
                      type="button"
                      className="topbar-launch-ride-btn"
                      disabled={coursesBlockedByCompliance}
                      title={
                        coursesBlockedByCompliance
                          ? t('chauffeurCompliance.bannerTitle')
                          : undefined
                      }
                      onClick={() => void launchCourseById(topbarLaunchCourse.id)}
                    >
                      Lancer la course
                    </button>
                  </div>
                </div>
              ) : isMobileViewport ? null : (
                <div className="dashboard-topbar-title-stack">
                  <h2 className="dashboard-chauffeur-main-title">{dashboardTopTitle}</h2>
                  <p className="dashboard-chauffeur-main-subtitle">{dashboardTopSubtitle}</p>
                </div>
              )}
              <div className="dashboard-topbar-right">
                <div className="client-compte-topbar-menu-anchor" ref={topbarAccountMenuRef}>
                  <button
                    type="button"
                    className="client-compte-topbar-user-btn"
                    onClick={() => {
                      setAlertsOpen(false);
                      setMoreMenuOpen(false);
                      setTopbarAccountMenuOpen((prev) => !prev);
                    }}
                    aria-label="Gerer le compte"
                  >
                    {paltoIdentity.photoUrl ? (
                      <img
                        src={paltoIdentity.photoUrl}
                        alt={t('clientAccount.photoAlt')}
                        className="client-compte-topbar-user-btn__avatar"
                      />
                    ) : (
                      <User size={16} aria-hidden />
                    )}
                    <span>{paltoIdentity.fullName}</span>
                  </button>
                  {topbarAccountMenuOpen ? (
                    <div className="client-compte-account-menu" role="menu" aria-label="Menu compte">
                      <div className="client-compte-account-menu__head">
                        <strong>{paltoIdentity.fullName}</strong>
                        <span>{paltoIdentity.email}</span>
                      </div>
                      <div className="client-compte-account-menu__actions">
                        <button
                          type="button"
                          className="client-compte-account-menu__item"
                          onClick={() => openChauffeurPaltoAccount('personal')}
                        >
                          {language === 'en' ? 'Manage Palto account' : 'Gerer le compte Palto'}
                        </button>
                        <button
                          type="button"
                          className="client-compte-account-menu__item client-compte-account-menu__item--danger"
                          onClick={handleTopbarLogout}
                        >
                          {language === 'en' ? 'Sign out' : 'Se deconnecter'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </header>

            <ChauffeurPresenceGeoBar
              onActivate={chauffeurPresence.startTracking}
              onRefresh={chauffeurPresence.refreshLocation}
              error={chauffeurPresence.geoError}
              tracking={chauffeurPresence.tracking}
            />

            {activeView === 'stats' ? (
              <div className="dashboard-content">
                {isMobileViewport && !topbarLaunchCourse ? (
                  <div className="dashboard-topbar-title-stack dashboard-topbar-title-stack--in-content">
                    <h2 className="dashboard-chauffeur-main-title">{dashboardTopTitle}</h2>
                    <p className="dashboard-chauffeur-main-subtitle">{dashboardTopSubtitle}</p>
                  </div>
                ) : null}
                <DashboardStats activity={chauffeurActivityStats} heatmap={apiHeatmapStats} />
              </div>
            ) : (
              <>
                {/* Content Container — plein cadre sous la topbar pour la sous-app Organisation */}
                <div
                  className={`dashboard-content${
                    activeView === 'organization' ? ' dashboard-content--org-fullbleed' : ''
                  }`}
                >
                  {isMobileViewport && !topbarLaunchCourse ? (
                    <div className="dashboard-topbar-title-stack dashboard-topbar-title-stack--in-content">
                      <h2 className="dashboard-chauffeur-main-title">{dashboardTopTitle}</h2>
                      <p className="dashboard-chauffeur-main-subtitle">{dashboardTopSubtitle}</p>
                    </div>
                  ) : null}
                  {coursesBlockedByCompliance ? (
                    <section
                      className="dashboard-compliance-block"
                      id="chauffeur-compliance-panel"
                      aria-labelledby="chauffeur-compliance-heading"
                    >
                      <h3 id="chauffeur-compliance-heading" className="dashboard-compliance-title">
                        {t('chauffeurCompliance.bannerTitle')}
                      </h3>
                      <p className="dashboard-compliance-lead">{t('chauffeurCompliance.bannerLead')}</p>
                      <ChauffeurDocumentsChecklist
                        emailNorm={normalizeChauffeurEmail(getChauffeurSessionEmail())}
                        onComplianceChange={() => setComplianceUiTick((n) => n + 1)}
                      />
                    </section>
                  ) : null}
                  {activeView === 'overview' && (
                  <section className="dashboard-favorites">
                    <div className="dashboard-section-title">
                      <h3>Planning</h3>
                    </div>
                    <button
                      type="button"
                      className="dashboard-heatmap-card dashboard-heatmap-card--action"
                      onClick={() => handleNavSelect('planning')}
                    >
                      <div className="dashboard-heatmap-grid" role="img" aria-label="Heatmap des courses par jour de semaine">
                        {weeklyHeatmap.cells.map((cell) => (
                          <div key={cell.label} className="dashboard-heatmap-col">
                            <div
                              className="dashboard-heatmap-cell"
                              style={{
                                backgroundColor:
                                  cell.count === 0
                                    ? '#e5e7eb'
                                    : `rgba(14, 165, 233, ${0.28 + cell.level * 0.65})`,
                              }}
                              title={`${cell.label} : ${cell.count} course${cell.count > 1 ? 's' : ''}`}
                            >
                              <span>{cell.count}</span>
                            </div>
                            <span className="dashboard-heatmap-label">{cell.label}</span>
                          </div>
                        ))}
                      </div>
                      <p className="dashboard-heatmap-footnote">
                        {weeklyHeatmap.total} course{weeklyHeatmap.total > 1 ? 's' : ''} sur la semaine type (hors annulées).
                      </p>
                    </button>
                  </section>
                  )}
                  {activeView === 'overview' && (
                  <section className="dashboard-overview-grid">
                    <div className="dashboard-panel-block">
                      <div className="dashboard-section-title">
                        <h3>Prochaine course</h3>
                      </div>
                      {overviewNextCourse ? (
                        <>
                          <div className="dashboard-overview-stack">
                          <div className="dashboard-overview-mini-grid">
                            <button
                              type="button"
                              className="dashboard-overview-mini-card"
                              onClick={() => handleNavSelect('courses')}
                            >
                              <strong>{overviewNextCourse.km.toFixed(1)} km</strong>
                              <span>Distance</span>
                              <small>{overviewNextCourse.statut}</small>
                            </button>
                            <button
                              type="button"
                              className="dashboard-overview-mini-card"
                              onClick={() => handleNavSelect('courses')}
                            >
                              <strong>{formatEurAmount(overviewNextCourse.montant)}</strong>
                              <span>Prix total</span>
                              <small>{overviewNextCourse.client}</small>
                            </button>
                          </div>
                          <article className="dashboard-panel">
                            <div className="dashboard-metric-list">
                              <div className="dashboard-metric-row">
                                <span>Date</span>
                                <strong>
                                  {new Date(`${overviewNextCourse.date}T${overviewNextCourse.heure}:00`).toLocaleDateString(
                                    language === 'en' ? 'en-GB' : 'fr-FR',
                                    { day: '2-digit', month: '2-digit', year: 'numeric' }
                                  )}{' '}
                                  · {overviewNextCourse.heure}
                                </strong>
                              </div>
                              <div className="dashboard-metric-row">
                                <span>Client</span>
                                <strong>{overviewNextCourse.client}</strong>
                              </div>
                              <div className="dashboard-metric-row">
                                <span>Trajet</span>
                                <strong>{overviewNextCourse.depart} → {overviewNextCourse.arrivee}</strong>
                              </div>
                              {overviewNextCourse.clientComment ? (
                                <div className="dashboard-metric-row">
                                  <span>Commentaire client</span>
                                  <strong>{overviewNextCourse.clientComment}</strong>
                                </div>
                              ) : null}
                            </div>
                          </article>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="dashboard-panel dashboard-panel--overview-empty"
                          onClick={() => handleNavSelect('courses')}
                        >
                          <p style={{ margin: 0 }}>
                            Aucune course a venir pour le moment.
                          </p>
                        </button>
                      )}
                    </div>
                  </section>
                  )}

                  {activeView === 'overview' && (
                  <section className="dashboard-overview-grid">
                    <div className="dashboard-panel-block">
                      <div className="dashboard-section-title dashboard-section-title-inline">
                        <h3>Usage</h3>
                        <span>30 derniers jours</span>
                      </div>
                      <div className="dashboard-overview-stack">
                      <div className="dashboard-overview-mini-grid">
                        <button
                          type="button"
                          className="dashboard-overview-mini-card"
                          onClick={() => handleNavSelect('stats')}
                        >
                          <strong>{chauffeurActivityStats.completed}</strong>
                          <span>Courses terminées</span>
                          <small>Voir la page Stats</small>
                        </button>
                        <button
                          type="button"
                          className="dashboard-overview-mini-card"
                          onClick={() => handleNavSelect('stats')}
                        >
                          <strong>{Math.round(chauffeurActivityStats.totalIncome)} EUR</strong>
                          <span>Revenus estimés</span>
                          <small>Taux d'acceptation: {chauffeurActivityStats.acceptanceRate}%</small>
                        </button>
                      </div>
                      <article className="dashboard-panel">
                        <div className="dashboard-metric-list">
                          <div className="dashboard-metric-row">
                            <span>Courses terminees</span>
                            <strong>{chauffeurActivityStats.completed}</strong>
                          </div>
                          <div className="dashboard-metric-row">
                            <span>Kilometres parcourus</span>
                            <strong>{totalDistanceKm.toFixed(1)} km</strong>
                          </div>
                          <div className="dashboard-metric-row">
                            <span>Revenus estimes</span>
                            <strong>{Math.round(chauffeurActivityStats.totalIncome)} EUR</strong>
                          </div>
                        </div>
                      </article>
                      </div>
                    </div>

                    <div className="dashboard-panel-block">
                      <div className="dashboard-section-title dashboard-section-title-inline">
                        <h3>Alertes</h3>
                        <span>Prioritaires</span>
                      </div>
                      <article className="dashboard-panel">
                        <div className="dashboard-alert-list">
                          {alertItems.slice(0, 5).map((alert) => (
                            <div
                              key={alert.id}
                              className="dashboard-alert-item"
                              role={alert.kind === 'demand' ? 'button' : undefined}
                              tabIndex={alert.kind === 'demand' ? 0 : undefined}
                              onClick={
                                alert.kind === 'demand'
                                  ? () => {
                                      setAlertsOpen(true);
                                    }
                                  : undefined
                              }
                              onKeyDown={
                                alert.kind === 'demand'
                                  ? (e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setAlertsOpen(true);
                                      }
                                    }
                                  : undefined
                              }
                            >
                              <span
                                className={`alert-dot ${
                                  alert.kind === 'org_invite'
                                    ? 'info'
                                    : alert.kind === 'demand'
                                      ? 'warning'
                                      : alert.kind === 'upcoming'
                                        ? 'warning'
                                        : 'success'
                                }`}
                              />
                              <div>
                                <strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                                  {alert.title}
                                </strong>
                                <p style={{ margin: 0 }}>{alert.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    </div>
                  </section>
                  )}

                  {activeView === 'overview' && (
                  <section className="dashboard-recent">
                    <div className="dashboard-section-title">
                      <h3>Courses récentes</h3>
                    </div>
                    <div className="dashboard-recent-list">
                      {overviewFocusCourses.map((course) => (
                        <button
                          key={course.id}
                          type="button"
                          className="dashboard-recent-item dashboard-recent-item--action"
                          onClick={() => handleNavSelect('courses')}
                        >
                          <strong>{course.client} · {course.depart}</strong>
                          <p>
                            {course.heure} · {course.arrivee} ·{' '}
                            <span className={`ride-status-badge ride-status-badge--${rideStatusTone(course.statut)}`}>
                              {course.statut}
                            </span>
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                  )}

                  {activeView === 'courses' && (
                    <section className="dashboard-table-section">
                      <div className="dashboard-section-title">
                        <h3>Toutes les courses</h3>
                      </div>
                      <div className="dashboard-filters-bar">
                        <select
                          value={courseStatusFilter}
                          onChange={(e) => setCourseStatusFilter(e.target.value)}
                        >
                          <option value="all">Toutes les courses</option>
                          <option value="En attente">En attente</option>
                          <option value="Acceptee">Acceptees</option>
                          <option value="En cours">En cours</option>
                          <option value="Terminee">Terminees</option>
                          <option value="Annulee">Annulees</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setCourseStatusFilter('all')}
                        >
                          Reinitialiser
                        </button>
                      </div>
                      <div className="dashboard-table-shell">
                        <table className="dashboard-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Date</th>
                              <th>Heure</th>
                              <th>Client</th>
                              <th>Depart</th>
                              <th>Arrivee</th>
                              <th>Statut</th>
                              <th>Montant</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedCourseRows.map((course) => (
                              <tr key={course.id}>
                                <td title={course.id}>{formatShortId(course.id)}</td>
                                <td>{course.date}</td>
                                <td>{course.heure}</td>
                                <td>{course.client}</td>
                                <td>{course.depart}</td>
                                <td>{course.arrivee}</td>
                                <td>
                                  <span className={`ride-status-badge ride-status-badge--${rideStatusTone(course.statut)}`}>
                                    {course.statut}
                                  </span>
                                </td>
                                <td>{formatEurAmount(course.montant)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {activeView === 'ride-settings' && (
                    <section className="dashboard-table-section">
                      <div className="dashboard-section-title dashboard-section-title-inline">
                        <h3>Paramètres de course</h3>
                        <button
                          type="button"
                          className="dashboard-overview-link-inline"
                          onClick={cancelRideSettingsEdit}
                          disabled={!isRideSettingsDirty}
                        >
                          Réinitialiser
                        </button>
                      </div>

                      <form
                        className="dashboard-ride-settings-edit-layout"
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveRideSettingsEdit();
                        }}
                      >
                        <ChauffeurRideSettingsForm
                          language={language}
                          rideSettingsDraft={rideSettingsDraft}
                          setRideSettingsDraft={setRideSettingsDraft}
                          computeAppliedPrice={computeAppliedPrice}
                        />

                        <div className="dashboard-payment-edit-actions">
                          <button type="submit" className="dashboard-user-save-btn" disabled={!isRideSettingsDirty}>
                            Enregistrer
                          </button>
                        </div>
                      </form>
                    </section>
                  )}

                  {activeView === 'clients' && (
                    <section className="dashboard-table-section">
                      <div className="dashboard-section-title">
                        <h3>Table des clients</h3>
                      </div>
                      <div className="dashboard-filters-bar">
                        <select
                          value={clientRatingFilter}
                          onChange={(e) => setClientRatingFilter(e.target.value)}
                        >
                          <option value="all">Toutes les notes</option>
                          <option value="high">4.8 et +</option>
                          <option value="medium">4.6 a 4.79</option>
                          <option value="low">Moins de 4.6</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setClientRatingFilter('all')}
                        >
                          Reinitialiser
                        </button>
                      </div>
                      <div className="dashboard-table-shell">
                        <table className="dashboard-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Nom</th>
                              <th>Telephone</th>
                              <th>Courses</th>
                              <th>Depense</th>
                              <th>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedClientRows.map((client) => (
                              <tr
                                key={client.id}
                                className={selectedClientId === client.id ? 'dashboard-row-active' : ''}
                                onClick={() => {
                                  setSelectedClientId(client.id);
                                  setClientModalOpen(true);
                                }}
                              >
                                <td>{client.id}</td>
                                <td>{client.nom}</td>
                                <td>{client.telephone}</td>
                                <td>{client.courses}</td>
                                <td>{client.depense}</td>
                                <td>{client.note}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {activeView === 'planning' && (
                    <section className="dashboard-table-section">
                      <div className="dashboard-section-title dashboard-section-title-inline">
                        <h3>Planning des courses</h3>
                        <div className="planning-month-nav">
                          <button
                            type="button"
                            onClick={() => {
                              setPlanningModalDate(null);
                              setPlanningMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                            }}
                          >
                            {'<'}
                          </button>
                          <span>
                            {planningMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPlanningModalDate(null);
                              setPlanningMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                            }}
                          >
                            {'>'}
                          </button>
                        </div>
                      </div>
                      <div className="dashboard-filters-bar">
                        <select
                          value={planningStatusFilter}
                          onChange={(e) => setPlanningStatusFilter(e.target.value)}
                        >
                          <option value="all">Tous les statuts</option>
                          <option value="En attente">En attente</option>
                          <option value="Acceptee">Acceptees</option>
                          <option value="En cours">En cours</option>
                          <option value="Terminee">Terminees</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setPlanningStatusFilter('all')}
                        >
                          Reinitialiser
                        </button>
                      </div>
                      <div className="planning-calendar-shell">
                        <div className="planning-weekdays">
                          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                            <div key={d}>{d}</div>
                          ))}
                        </div>
                        <div className="planning-grid">
                          {monthCells.map((cell, idx) => (
                            <div
                              key={`cell-${idx}`}
                              className={`planning-cell ${cell.day ? 'filled' : ''} ${cell.holiday ? 'holiday' : ''} ${cell.isToday ? 'today' : ''}`}
                              onClick={() => {
                                if (!cell.day) return;
                                const iso = `${planningYear}-${String(planningMonthIndex + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
                                setPlanningModalDate(iso);
                                setNewCourseForm((prev) => ({ ...prev, date: iso }));
                              }}
                            >
                              {cell.day && <span className="planning-day-number">{cell.day}</span>}
                              {cell.holiday && <span className="planning-holiday-label">{cell.holiday}</span>}
                              {cell.day && !!cell.slots?.length && (
                                <div className="planning-slot-list">
                                  {cell.slots.slice(0, 3).map((slot) => (
                                    <span
                                      key={slot.id}
                                      className={`planning-slot-chip ${
                                        slot.statut === 'En attente'
                                          ? 'pending'
                                          : slot.statut === 'Acceptee' || slot.statut === 'En cours'
                                            ? 'accepted'
                                            : slot.statut === 'Terminee'
                                              ? 'completed'
                                              : ''
                                      }`}
                                    >
                                      {slot.heure}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {activeView === 'organization' && chauffeurOrg && (
                    <div className="dashboard-org-layout">
                      <aside className="dashboard-org-sidebar" aria-label={t('driverDashboard.navOrganization')}>
                        <button
                          type="button"
                          className="dashboard-org-sidebar-brand dashboard-org-sidebar-brand--home"
                          onClick={() => setOrgSubView('profile')}
                          aria-current={orgSubView === 'profile' ? 'page' : undefined}
                        >
                          <span className="dashboard-org-sidebar-icon" aria-hidden>
                            <Building2 size={18} />
                          </span>
                          <span className="dashboard-org-sidebar-title">{chauffeurOrg.name}</span>
                        </button>
                        <nav className="dashboard-org-nav">
                          <button
                            type="button"
                            className={`dashboard-org-nav-item${orgSubView === 'team' ? ' active' : ''}`}
                            onClick={() => setOrgSubView('team')}
                          >
                            <Users size={16} aria-hidden />
                            <span>{t('driverDashboard.orgNavTeam')}</span>
                          </button>
                          {isChauffeurOrgAdmin ? (
                            <>
                              <button
                                type="button"
                                className={`dashboard-org-nav-item${orgSubView === 'fleet' ? ' active' : ''}`}
                                onClick={() => setOrgSubView('fleet')}
                              >
                                <Car size={16} aria-hidden />
                                <span>{t('driverDashboard.orgNavFleet')}</span>
                              </button>
                              <button
                                type="button"
                                className={`dashboard-org-nav-item${orgSubView === 'invites' ? ' active' : ''}`}
                                onClick={() => setOrgSubView('invites')}
                              >
                                <Send size={16} aria-hidden />
                                <span>{t('driverDashboard.orgNavInvites')}</span>
                              </button>
                              <button
                                type="button"
                                className={`dashboard-org-nav-item${orgSubView === 'settings' ? ' active' : ''}`}
                                onClick={() => setOrgSubView('settings')}
                              >
                                <Settings size={16} aria-hidden />
                                <span>{t('driverDashboard.orgNavSettings')}</span>
                              </button>
                            </>
                          ) : null}
                        </nav>
                      </aside>
                      <div className="dashboard-org-main">
                        {orgSubView !== 'profile' ? (
                          <p className="dashboard-field-hint dashboard-org-main-lead">
                            {t('driverDashboard.orgPageLead')}
                          </p>
                        ) : null}

                        {orgSubView === 'profile' && (
                          <div className="dashboard-org-profile">
                            <div className="dashboard-org-profile-hero-bleed">
                              <div className="dashboard-org-profile-hero">
                                <div className="dashboard-org-profile-cover-wrap">
                                  <img
                                    className="dashboard-org-profile-cover"
                                    src={
                                      (chauffeurOrg.coverImageUrl && chauffeurOrg.coverImageUrl.trim()) ||
                                      orgProfileCoverFallbackRef.current
                                    }
                                    alt={t('driverDashboard.orgProfileCoverAlt')}
                                    decoding="async"
                                  />
                                  <div className="dashboard-org-profile-cover-scrim" aria-hidden />
                                  <div className="dashboard-org-profile-hero-bar">
                                    <img
                                      className="dashboard-org-profile-logo"
                                      src={
                                        (chauffeurOrg.logoUrl && chauffeurOrg.logoUrl.trim()) ||
                                        '/images/placeholder-app-icon.svg'
                                      }
                                      alt={t('driverDashboard.orgProfileLogoAlt')}
                                      width={88}
                                      height={88}
                                      decoding="async"
                                    />
                                    <div className="dashboard-org-profile-hero-text">
                                      <h3 className="client-compte-section-title dashboard-org-profile-name">
                                        {chauffeurOrg.name}
                                      </h3>
                                      <p className="dashboard-field-hint dashboard-org-profile-base">
                                        {chauffeurOrg.base}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <section
                              className="dashboard-table-section dashboard-org-panel dashboard-org-profile-facts"
                              aria-labelledby="org-profile-facts-title"
                            >
                              <h3 id="org-profile-facts-title" className="client-compte-section-title">
                                {t('driverDashboard.orgProfileImportantTitle')}
                              </h3>
                              <div className="dashboard-user-kpis" style={{ marginTop: 12 }}>
                                <div>
                                  <strong>{t('driverDashboard.orgFleetCode')}</strong>
                                  <p>{chauffeurOrg.fleetCode}</p>
                                </div>
                                <div>
                                  <strong>{t('driverDashboard.orgProfileDriversLabel')}</strong>
                                  <p>
                                    {Math.max(
                                      0,
                                      chauffeurOrg.members.filter((m) => m.status === 'active').length
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <strong>{t('driverDashboard.orgProfileRatingLabel')}</strong>
                                  <p>
                                    4,9 · 128 {t('driverDashboard.orgProfileRatingSuffix')}
                                  </p>
                                </div>
                              </div>
                              <p className="dashboard-field-hint" style={{ margin: '14px 0 0' }}>
                                <strong>{t('driverDashboard.orgAdminEmail')}</strong>
                                {' · '}
                                {chauffeurOrg.adminEmail}
                              </p>
                              <p className="dashboard-field-hint" style={{ margin: '6px 0 0' }}>
                                <strong>{t('driverDashboard.orgCreated')}</strong>
                                {' · '}
                                {new Date(chauffeurOrg.createdAt).toLocaleDateString(
                                  language === 'en' ? 'en-US' : 'fr-FR',
                                  { day: 'numeric', month: 'long', year: 'numeric' }
                                )}
                              </p>
                            </section>

                            <section
                              className="dashboard-table-section dashboard-org-panel dashboard-org-profile-reviews"
                              aria-labelledby="org-profile-reviews-title"
                            >
                              <h3 id="org-profile-reviews-title" className="client-compte-section-title">
                                {t('driverDashboard.orgProfileReviewsTitle')}
                              </h3>
                              <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                                {t('driverDashboard.orgProfileReviewsLead')}
                              </p>
                              <OrgProfileReviewsCarousel
                                reviews={orgProfileSampleReviews}
                                t={t}
                                language={language}
                              />
                            </section>
                          </div>
                        )}

                        {orgSubView === 'team' && (
                          <section className="dashboard-table-section dashboard-org-panel">
                            <h3 className="client-compte-section-title">{t('driverDashboard.orgMembersTitle')}</h3>
                            <ul className="dashboard-org-member-list">
                              {chauffeurOrg.members.map((m) => (
                                <li key={m.id} className="dashboard-org-member-row">
                                  <div className="dashboard-org-member-main">
                                    <span className="dashboard-org-member-email">
                                      <Mail size={14} aria-hidden />
                                      {m.email}
                                    </span>
                                    <span className="dashboard-org-member-meta">
                                      {m.role === 'admin'
                                        ? t('driverDashboard.orgRoleAdmin')
                                        : t('driverDashboard.orgRoleDriver')}
                                      {' · '}
                                      {m.status === 'pending'
                                        ? t('driverDashboard.orgStatusPending')
                                        : t('driverDashboard.orgStatusActive')}
                                    </span>
                                    <div className="dashboard-org-member-fleet-line">
                                      <span className="dashboard-org-member-chip">
                                        {tFleetZone(m.zoneId ?? 'unset')}
                                      </span>
                                      {(m.vehiclePlate ?? '').trim() ? (
                                        <span className="dashboard-org-member-chip">
                                          {normalizeFrenchPlate((m.vehiclePlate ?? '').trim()) ||
                                            (m.vehiclePlate ?? '').trim()}
                                        </span>
                                      ) : (
                                        <span className="dashboard-org-member-chip">—</span>
                                      )}
                                      {m.status === 'active' ? (
                                        <span className="dashboard-org-member-chip">
                                          {tFleetAvail(m.availability ?? 'available')}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  {isChauffeurOrgAdmin && m.role !== 'admin' && m.status === 'pending' ? (
                                    <button
                                      type="button"
                                      className="dashboard-user-cancel-btn"
                                      onClick={() => handleRemoveOrgMember(m)}
                                    >
                                      {t('driverDashboard.orgRemoveInvite')}
                                    </button>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {orgSubView === 'fleet' && isChauffeurOrgAdmin && (
                          <section className="dashboard-table-section dashboard-org-panel">
                            <h3 className="client-compte-section-title">{t('driverDashboard.fleetTitle')}</h3>
                            <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                              {t('driverDashboard.fleetLead')}
                            </p>
                            <div className="dashboard-org-fleet-filter">
                              <label>
                                {t('driverDashboard.fleetFilterLabel')}
                                <select
                                  value={orgFleetZoneFilter}
                                  onChange={(e) =>
                                    setOrgFleetZoneFilter(e.target.value as FleetZoneId | 'all')
                                  }
                                >
                                  <option value="all">{t('driverDashboard.fleetFilterAll')}</option>
                                  {FLEET_ZONE_IDS.map((zid) => (
                                    <option key={zid} value={zid}>
                                      {tFleetZone(zid)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <p className="client-compte-section-title" style={{ fontSize: 13, marginBottom: 8 }}>
                              {t('driverDashboard.fleetSummaryTitle')}
                            </p>
                            <div className="dashboard-org-fleet-summary">
                              {FLEET_ZONE_IDS.filter((zid) => fleetZoneCounts[zid] > 0).map((zid) => (
                                <span key={zid} className="dashboard-org-fleet-summary-chip">
                                  {tFleetZone(zid)} · {fleetZoneCounts[zid]}
                                </span>
                              ))}
                            </div>
                            <div className="dashboard-org-fleet-table-wrap">
                              <table className="dashboard-org-fleet-table">
                                <thead>
                                  <tr>
                                    <th>{t('driverDashboard.fleetColMember')}</th>
                                    <th>{t('driverDashboard.fleetColVehicle')}</th>
                                    <th>{t('driverDashboard.fleetColModel')}</th>
                                    <th>{t('driverDashboard.fleetColZone')}</th>
                                    <th>{t('driverDashboard.fleetColAvail')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {chauffeurOrg.members
                                    .filter(
                                      (m) =>
                                        orgFleetZoneFilter === 'all' ||
                                        (m.zoneId ?? 'unset') === orgFleetZoneFilter
                                    )
                                    .map((m) => {
                                      const disabledFleet = m.status === 'pending';
                                      return (
                                        <tr key={m.id}>
                                          <td>
                                            <div className="dashboard-org-member-email" style={{ margin: 0 }}>
                                              <Mail size={14} aria-hidden />
                                              {m.email}
                                            </div>
                                            {m.role === 'admin' ? (
                                              <span className="dashboard-field-hint" style={{ fontSize: 11 }}>
                                                {t('driverDashboard.orgRoleAdmin')}
                                              </span>
                                            ) : null}
                                            {disabledFleet ? (
                                              <p className="dashboard-field-hint" style={{ margin: '6px 0 0' }}>
                                                {t('driverDashboard.fleetHintPending')}
                                              </p>
                                            ) : null}
                                            {fleetDuplicateMemberIds.has(m.id) ? (
                                              <p className="dashboard-org-fleet-warn">
                                                {t('driverDashboard.fleetDuplicatePlate')}
                                              </p>
                                            ) : null}
                                          </td>
                                          <td>
                                            <input
                                              type="text"
                                              value={m.vehiclePlate ?? ''}
                                              disabled={disabledFleet}
                                              placeholder={t('driverDashboard.fleetPlatePlaceholder')}
                                              onChange={(e) =>
                                                handleUpdateMemberFleet(m.id, {
                                                  vehiclePlate: e.target.value,
                                                })
                                              }
                                              onBlur={() => {
                                                const raw = (m.vehiclePlate ?? '').trim();
                                                if (!raw) return;
                                                const n = normalizeFrenchPlate(raw);
                                                if (n && n !== m.vehiclePlate) {
                                                  handleUpdateMemberFleet(m.id, { vehiclePlate: n });
                                                }
                                              }}
                                              aria-label={t('driverDashboard.fleetColVehicle')}
                                            />
                                          </td>
                                          <td>
                                            <input
                                              type="text"
                                              value={m.vehicleModel ?? ''}
                                              disabled={disabledFleet}
                                              placeholder={t('driverDashboard.fleetModelPlaceholder')}
                                              onChange={(e) =>
                                                handleUpdateMemberFleet(m.id, {
                                                  vehicleModel: e.target.value,
                                                })
                                              }
                                              aria-label={t('driverDashboard.fleetColModel')}
                                            />
                                          </td>
                                          <td>
                                            <select
                                              value={m.zoneId ?? 'unset'}
                                              disabled={disabledFleet}
                                              onChange={(e) =>
                                                handleUpdateMemberFleet(m.id, {
                                                  zoneId: e.target.value as FleetZoneId,
                                                })
                                              }
                                              aria-label={t('driverDashboard.fleetColZone')}
                                            >
                                              {FLEET_ZONE_IDS.map((zid) => (
                                                <option key={zid} value={zid}>
                                                  {tFleetZone(zid)}
                                                </option>
                                              ))}
                                            </select>
                                          </td>
                                          <td>
                                            <select
                                              value={m.availability ?? 'available'}
                                              disabled={disabledFleet}
                                              onChange={(e) =>
                                                handleUpdateMemberFleet(m.id, {
                                                  availability: e.target.value as FleetAvailability,
                                                })
                                              }
                                              aria-label={t('driverDashboard.fleetColAvail')}
                                            >
                                              {(['available', 'on_course', 'pause', 'off'] as const).map((aid) => (
                                                <option key={aid} value={aid}>
                                                  {tFleetAvail(aid)}
                                                </option>
                                              ))}
                                            </select>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </section>
                        )}

                        {orgSubView === 'invites' && isChauffeurOrgAdmin && (
                          <section className="dashboard-table-section dashboard-org-panel">
                            <h3 className="client-compte-section-title">{t('driverDashboard.orgNavInvites')}</h3>
                            <form className="dashboard-org-invite-form" onSubmit={handleInviteDriver}>
                              <label className="dashboard-org-create-label">
                                {t('driverDashboard.orgInviteLabel')}
                                <input
                                  type="email"
                                  value={orgInviteEmail}
                                  onChange={(e) => {
                                    setOrgInviteEmail(e.target.value);
                                    setOrgInviteError(null);
                                  }}
                                  placeholder={t('driverDashboard.orgInvitePlaceholder')}
                                  autoComplete="email"
                                />
                              </label>
                              {orgInviteError ? (
                                <p className="dashboard-field-hint" style={{ margin: '0 0 8px', color: '#b91c1c' }}>
                                  {orgInviteError}
                                </p>
                              ) : null}
                              <button type="submit" className="dashboard-user-save-btn">
                                {t('driverDashboard.orgInviteButton')}
                              </button>
                            </form>
                            <h4 className="client-compte-section-title" style={{ marginTop: 24 }}>
                              {t('driverDashboard.orgStatusPending')}
                            </h4>
                            <ul className="dashboard-org-member-list">
                              {chauffeurOrg.members
                                .filter((m) => m.status === 'pending')
                                .map((m) => (
                                  <li key={m.id} className="dashboard-org-member-row">
                                    <div className="dashboard-org-member-main">
                                      <span className="dashboard-org-member-email">
                                        <Mail size={14} aria-hidden />
                                        {m.email}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      className="dashboard-user-cancel-btn"
                                      onClick={() => handleRemoveOrgMember(m)}
                                    >
                                      {t('driverDashboard.orgRemoveInvite')}
                                    </button>
                                  </li>
                                ))}
                            </ul>
                          </section>
                        )}

                        {orgSubView === 'settings' && isChauffeurOrgAdmin && (
                          <section className="dashboard-table-section dashboard-org-panel">
                            <h3 className="client-compte-section-title">{t('driverDashboard.orgNavSettings')}</h3>
                            <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                              {t('driverDashboard.orgSettingsDangerLead')}
                            </p>
                            <button
                              type="button"
                              className="dashboard-user-logout-btn"
                              onClick={handleDeleteOrganization}
                            >
                              {t('driverDashboard.orgDeleteOrg')}
                            </button>
                          </section>
                        )}
                      </div>
                    </div>
                  )}

                  {activeView === 'user' && (
                    <div className="dashboard-org-layout">
                      <aside className="dashboard-org-sidebar" aria-label={t('driverDashboard.titleUser')}>
                        <nav className="dashboard-org-nav">
                          <button
                            type="button"
                            className={`dashboard-org-nav-item${userSubView === 'palto-account' ? ' active' : ''}`}
                            onClick={() => openChauffeurPaltoAccount('personal')}
                          >
                            <IdCard size={16} aria-hidden />
                            <span>{language === 'en' ? 'Palto account' : 'Compte Palto'}</span>
                          </button>
                          <button
                            type="button"
                            className={`dashboard-org-nav-item${userSubView === 'profile' ? ' active' : ''}`}
                            onClick={() => setUserSubView('profile')}
                          >
                            <User size={16} aria-hidden />
                            <span>Profil chauffeur</span>
                          </button>
                          <button
                            type="button"
                            className={`dashboard-org-nav-item${userSubView === 'documents' ? ' active' : ''}`}
                            onClick={() => setUserSubView('documents')}
                          >
                            <Mail size={16} aria-hidden />
                            <span>Documents & conformite</span>
                          </button>
                          <button
                            type="button"
                            className={`dashboard-org-nav-item${userSubView === 'payment' ? ' active' : ''}`}
                            onClick={() => setUserSubView('payment')}
                          >
                            <Wallet size={16} aria-hidden />
                            <span>{language === 'en' ? 'Payouts' : 'Versements'}</span>
                          </button>
                          <button
                            type="button"
                            className={`dashboard-org-nav-item${userSubView === 'ride-settings' ? ' active' : ''}`}
                            onClick={() => setUserSubView('ride-settings')}
                          >
                            <Settings size={16} aria-hidden />
                            <span>Tarifs</span>
                          </button>
                          <button
                            type="button"
                            className={`dashboard-org-nav-item${userSubView === 'organization' ? ' active' : ''}`}
                            onClick={() => {
                              setUserSubView('organization');
                              setOrgSubView('profile');
                            }}
                          >
                            <Building2 size={16} aria-hidden />
                            <span>{t('driverDashboard.orgSectionTitle')}</span>
                          </button>
                          <button
                            type="button"
                            className={`dashboard-org-nav-item${userSubView === 'preferences' ? ' active' : ''}`}
                            onClick={() => setUserSubView('preferences')}
                          >
                            <Settings size={16} aria-hidden />
                            <span>Préférences</span>
                          </button>
                          <button
                            type="button"
                            className={`dashboard-org-nav-item${userSubView === 'help' ? ' active' : ''}`}
                            onClick={() => setUserSubView('help')}
                          >
                            <CircleHelp size={16} aria-hidden />
                            <span>{t('driverDashboard.navHelp')}</span>
                          </button>
                          {userSubView === 'organization' && chauffeurOrg ? (
                            <div className="dashboard-org-nav-sub">
                              <button
                                type="button"
                                className={`dashboard-org-nav-item dashboard-org-nav-item--sub${orgSubView === 'team' ? ' active' : ''}`}
                                onClick={() => {
                                  setUserSubView('organization');
                                  setOrgSubView('team');
                                }}
                              >
                                <Users size={14} aria-hidden />
                                <span>{t('driverDashboard.orgNavTeam')}</span>
                              </button>
                              {isChauffeurOrgAdmin ? (
                                <>
                                  <button
                                    type="button"
                                    className={`dashboard-org-nav-item dashboard-org-nav-item--sub${orgSubView === 'fleet' ? ' active' : ''}`}
                                    onClick={() => {
                                      setUserSubView('organization');
                                      setOrgSubView('fleet');
                                    }}
                                  >
                                    <Car size={14} aria-hidden />
                                    <span>{t('driverDashboard.orgNavFleet')}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={`dashboard-org-nav-item dashboard-org-nav-item--sub${orgSubView === 'invites' ? ' active' : ''}`}
                                    onClick={() => {
                                      setUserSubView('organization');
                                      setOrgSubView('invites');
                                    }}
                                  >
                                    <Send size={14} aria-hidden />
                                    <span>{t('driverDashboard.orgNavInvites')}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={`dashboard-org-nav-item dashboard-org-nav-item--sub${orgSubView === 'settings' ? ' active' : ''}`}
                                    onClick={() => {
                                      setUserSubView('organization');
                                      setOrgSubView('settings');
                                    }}
                                  >
                                    <Settings size={14} aria-hidden />
                                    <span>{t('driverDashboard.orgNavSettings')}</span>
                                  </button>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </nav>
                      </aside>
                      <div className="dashboard-org-main">
                      {userSubView === 'palto-account' ? (
                        <section className="dashboard-table-section dashboard-table-section--palto-account">
                          <ChauffeurPaltoAccountPanel
                            sessionEmail={getChauffeurSessionEmail()}
                            initialSection={paltoAccountSection}
                          />
                        </section>
                      ) : null}
                      {(userSubView === 'profile' ||
                        userSubView === 'documents' ||
                        userSubView === 'payment' ||
                        userSubView === 'ride-settings' ||
                        userSubView === 'organization' ||
                        userSubView === 'preferences' ||
                        userSubView === 'help') && (
                    <section className="dashboard-table-section">
                      <article className="dashboard-user-card">
                        {userSubView === 'profile' ? (
                          <>
                            <div className="dashboard-user-card-head">
                              <div>
                                <h4>
                                  {paltoIdentity.fullName}
                                </h4>
                                <p className="dashboard-field-hint">
                                  Profil chauffeur (véhicule, téléphone, plaque). Nom, email et photo Palto :{' '}
                                  <button
                                    type="button"
                                    className="dashboard-inline-link-btn"
                                    onClick={() => openChauffeurPaltoAccount('personal')}
                                  >
                                    Compte Palto
                                  </button>
                                  .
                                </p>
                              </div>
                            </div>
                            <form
                              className="dashboard-user-edit-grid dashboard-chauffeur-profile-form"
                              onSubmit={(e) => {
                                e.preventDefault();
                                saveUserProfileEdit();
                              }}
                            >
                                <label>
                                  Téléphone
                                  <div className="dashboard-phone-input-row">
                                    <select
                                      value={phoneCountryDraft}
                                      onChange={(e) => {
                                        markProfileFormDirty();
                                        setPhoneCountryDraft(
                                          readFormControlValue(e) as SupportedPhoneCountry
                                        );
                                      }}
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
                                        markProfileFormDirty();
                                        setPhoneNationalDraft(readFormControlValue(e));
                                        if (phoneError) setPhoneError(null);
                                      }}
                                      placeholder={phoneCountryDraft === 'FR' ? '612345678' : '692123456'}
                                      required
                                    />
                                  </div>
                                  {phoneError ? (
                                    <small className="dashboard-field-error">{phoneError}</small>
                                  ) : (
                                    <small className="dashboard-field-hint">
                                      Format: {phoneCountryDraft === 'FR' ? '+33 612345678' : '+262 692123456'}
                                    </small>
                                  )}
                                </label>
                                <label>
                                  Ville
                                  <input
                                    type="text"
                                    name="chauffeur-ville"
                                    autoComplete="address-level2"
                                    enterKeyHint="next"
                                    value={userProfileDraft.ville ?? ''}
                                    onChange={(e) => {
                                      markProfileFormDirty();
                                      const ville = readFormControlValue(e);
                                      setUserProfileDraft((prev) => ({ ...prev, ville }));
                                    }}
                                    required
                                  />
                                  <small className="dashboard-field-hint">
                                    Ex. {REUNION_CITY_SUGGESTIONS.slice(0, 3).join(', ')}…
                                  </small>
                                </label>
                                <label>
                                  Véhicule
                                  <select
                                    name="chauffeur-vehicule"
                                    value={normalizeVehicleSlugForSelect(userProfileDraft.vehicule)}
                                    onChange={(e) => {
                                      markProfileFormDirty();
                                      const slug = normalizeVehicleSlugForSelect(readFormControlValue(e));
                                      setUserProfileDraft((prev) => ({ ...prev, vehicule: slug }));
                                    }}
                                  >
                                    <option value="">Non renseigné</option>
                                    {CHAUFFEUR_VEHICLE_TYPES.map((type) => (
                                      <option key={type} value={type}>
                                        {CHAUFFEUR_VEHICLE_TYPE_LABELS[type]}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  Plaque
                                  <input
                                    type="text"
                                    value={userProfileDraft.plaque ?? ''}
                                    onChange={(e) => {
                                      markProfileFormDirty();
                                      setUserProfileDraft((prev) => ({
                                        ...prev,
                                        plaque: readFormControlValue(e),
                                      }));
                                    }}
                                    onBlur={() => {
                                      void handlePlateBlurLookup();
                                    }}
                                    placeholder="AA-123-BB"
                                    required
                                  />
                                  {isPlateLookupLoading ? (
                                    <small className="dashboard-field-hint">Vérification plaque en cours…</small>
                                  ) : null}
                                  {plateError ? (
                                    <small className="dashboard-field-error">{plateError}</small>
                                  ) : plateLookupHint ? (
                                    <small className="dashboard-field-hint">{plateLookupHint}</small>
                                  ) : null}
                                </label>
                                <div className="dashboard-user-edit-readonly">
                                  <strong>Statut compte</strong>
                                  <p>Actif</p>
                                </div>
                                {isChauffeurProfileFormDirty ? (
                                  <div className="dashboard-user-edit-actions">
                                    <button type="submit" className="dashboard-user-save-btn">
                                      Enregistrer
                                    </button>
                                    <button
                                      type="button"
                                      className="dashboard-user-cancel-btn"
                                      onClick={cancelUserProfileEdit}
                                    >
                                      Annuler
                                    </button>
                                  </div>
                                ) : null}
                              </form>
                          </>
                        ) : null}
                        {userSubView === 'documents' ? (
                          <div className="dashboard-user-sections">
                            <section className="dashboard-user-subcard">
                              <h4>Documents & conformité</h4>
                              <div className="dashboard-doc-list">
                                {chauffeurDocuments.map((doc) => (
                                  <div key={doc.key} className="dashboard-doc-row">
                                    <div>
                                      <strong>{doc.label}</strong>
                                      <p>Expiration: {doc.expiry}</p>
                                      {doc.uploadedFileName ? <p>Dernier upload: {doc.uploadedFileName}</p> : null}
                                    </div>
                                    <div className="dashboard-doc-actions">
                                      <span
                                        className={`dashboard-doc-badge ${
                                          doc.status === 'pending'
                                            ? 'dashboard-doc-badge--pending'
                                            : doc.status === 'soon'
                                              ? 'dashboard-doc-badge--soon'
                                              : 'dashboard-doc-badge--ok'
                                        }`}
                                      >
                                        {doc.status === 'pending'
                                          ? 'Vérification en cours'
                                          : doc.status === 'soon'
                                            ? 'À renouveler'
                                            : 'Validé'}
                                      </span>
                                      <label className="dashboard-doc-upload-btn">
                                        Choisir
                                        <input
                                          type="file"
                                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                                          onChange={(e) =>
                                            handleDocumentFilePick(doc.key, e.target.files?.[0]?.name ?? '')
                                          }
                                        />
                                      </label>
                                      <button
                                        type="button"
                                        className="dashboard-doc-submit-btn"
                                        disabled={!documentUploadDraft[doc.key] || doc.status === 'pending'}
                                        onClick={() => submitDocumentRenewal(doc.key)}
                                      >
                                        Uploader
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          </div>
                        ) : null}

                        {userSubView === 'payment' ? (
                          <div className="dashboard-user-sections">
                            <section className="dashboard-user-subcard">
                              <h4>{language === 'en' ? 'Payouts & collection' : 'Versements & encaissement'}</h4>
                              <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
                                {language === 'en' ? (
                                  <>
                                    Bank payouts for your driver activity. For Stripe test cards (Go as passenger), see{' '}
                                    <button
                                      type="button"
                                      className="dashboard-inline-link-btn"
                                      onClick={() => openChauffeurPaltoAccount('payment')}
                                    >
                                      Palto account → Payment
                                    </button>
                                    .
                                  </>
                                ) : (
                                  <>
                                    Versements bancaires pour votre activité chauffeur. Pour les cartes Stripe (mode test, courses Go en passager), voir{' '}
                                    <button
                                      type="button"
                                      className="dashboard-inline-link-btn"
                                      onClick={() => openChauffeurPaltoAccount('payment')}
                                    >
                                      Compte Palto → Paiement
                                    </button>
                                    .
                                  </>
                                )}
                              </p>
                              <form
                                className="dashboard-payment-edit-grid"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  savePaymentEdit();
                                }}
                              >
                                <label>
                                  IBAN (masqué)
                                  <input
                                    type="text"
                                    value={paymentDraft.ibanMasked}
                                    onChange={(e) =>
                                      setPaymentDraft((prev) => ({ ...prev, ibanMasked: e.target.value }))
                                    }
                                    required
                                  />
                                </label>
                                <label>
                                  Fréquence de versement
                                  <select
                                    value={paymentDraft.payoutFrequency}
                                    onChange={(e) =>
                                      setPaymentDraft((prev) => ({
                                        ...prev,
                                        payoutFrequency: e.target.value as ChauffeurPayment['payoutFrequency'],
                                      }))
                                    }
                                  >
                                    <option value="Hebdomadaire">Hebdomadaire</option>
                                    <option value="Quotidienne">Quotidienne</option>
                                    <option value="Mensuelle">Mensuelle</option>
                                  </select>
                                </label>
                                <label>
                                  Mode principal
                                  <select
                                    value={paymentDraft.modePrincipal}
                                    onChange={(e) =>
                                      setPaymentDraft((prev) => ({
                                        ...prev,
                                        modePrincipal: e.target.value as ChauffeurPayment['modePrincipal'],
                                      }))
                                    }
                                  >
                                    <option value="Carte + espèces">Carte + espèces</option>
                                    <option value="Carte uniquement">Carte uniquement</option>
                                    <option value="Espèces uniquement">Espèces uniquement</option>
                                  </select>
                                </label>
                                {JSON.stringify(paymentDraft) !== JSON.stringify(chauffeurPayment) ? (
                                  <div className="dashboard-payment-edit-actions">
                                    <button type="submit" className="dashboard-user-save-btn">Enregistrer</button>
                                    <button type="button" className="dashboard-user-cancel-btn" onClick={cancelPaymentEdit}>
                                      Annuler
                                    </button>
                                  </div>
                                ) : null}
                              </form>
                            </section>
                          </div>
                        ) : null}
                        {userSubView === 'ride-settings' ? (
                          <div className="dashboard-user-sections">
                            <section className="dashboard-user-subcard">
                              <h4>Paramètres de course</h4>
                              <form
                                className="dashboard-ride-settings-edit-layout"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  saveRideSettingsEdit();
                                }}
                              >
                                <ChauffeurRideSettingsForm
                                  language={language}
                                  rideSettingsDraft={rideSettingsDraft}
                                  setRideSettingsDraft={setRideSettingsDraft}
                                  computeAppliedPrice={computeAppliedPrice}
                                />

                                <div className="dashboard-payment-edit-actions">
                                  <button type="submit" className="dashboard-user-save-btn" disabled={!isRideSettingsDirty}>
                                    Enregistrer
                                  </button>
                                  <button
                                    type="button"
                                    className="dashboard-user-cancel-btn"
                                    onClick={cancelRideSettingsEdit}
                                    disabled={!isRideSettingsDirty}
                                  >
                                    Réinitialiser
                                  </button>
                                </div>
                              </form>
                            </section>
                          </div>
                        ) : null}
                        {userSubView === 'organization' ? (
                          <div className="dashboard-user-sections">
                            <section className="dashboard-user-subcard">
                              {!chauffeurOrg ? (
                                <>
                                  <p className="dashboard-org-no-org-soon" role="status">
                                    {t('driverDashboard.orgNoOrgSoonLabel')}
                                  </p>
                                  <p className="dashboard-field-hint">{t('driverDashboard.orgNoOrgHint')}</p>
                                </>
                              ) : orgSubView === 'profile' ? (
                                <div className="dashboard-org-profile">
                                  <div className="dashboard-org-profile-hero-bleed">
                                    <div className="dashboard-org-profile-hero">
                                      <div className="dashboard-org-profile-cover-wrap">
                                        <img
                                          className="dashboard-org-profile-cover"
                                          src={
                                            (chauffeurOrg.coverImageUrl && chauffeurOrg.coverImageUrl.trim()) ||
                                            orgProfileCoverFallbackRef.current
                                          }
                                          alt={t('driverDashboard.orgProfileCoverAlt')}
                                          decoding="async"
                                        />
                                        <div className="dashboard-org-profile-cover-scrim" aria-hidden />
                                        <div className="dashboard-org-profile-hero-bar">
                                          <img
                                            className="dashboard-org-profile-logo"
                                            src={
                                              (chauffeurOrg.logoUrl && chauffeurOrg.logoUrl.trim()) ||
                                              '/images/placeholder-app-icon.svg'
                                            }
                                            alt={t('driverDashboard.orgProfileLogoAlt')}
                                            width={88}
                                            height={88}
                                            decoding="async"
                                          />
                                          <div className="dashboard-org-profile-hero-text">
                                            <h3 className="client-compte-section-title dashboard-org-profile-name">
                                              {chauffeurOrg.name}
                                            </h3>
                                            <p className="dashboard-field-hint dashboard-org-profile-base">
                                              {chauffeurOrg.base}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="dashboard-user-kpis" style={{ marginTop: 12 }}>
                                    <div><strong>{t('driverDashboard.orgFleetCode')}</strong><p>{chauffeurOrg.fleetCode}</p></div>
                                    <div>
                                      <strong>Rôle</strong>
                                      <p>{isChauffeurOrgAdmin ? t('driverDashboard.orgRoleAdmin') : t('driverDashboard.orgRoleDriver')}</p>
                                    </div>
                                    <div>
                                      <strong>{t('driverDashboard.orgProfileDriversLabel')}</strong>
                                      <p>{Math.max(0, chauffeurOrg.members.filter((m) => m.status === 'active').length)}</p>
                                    </div>
                                    <div>
                                      <strong>{t('driverDashboard.orgCreated')}</strong>
                                      <p>
                                        {new Date(chauffeurOrg.createdAt).toLocaleDateString(
                                          language === 'en' ? 'en-US' : 'fr-FR',
                                          { day: 'numeric', month: 'long', year: 'numeric' }
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <section
                                    className="dashboard-table-section dashboard-org-panel dashboard-org-profile-reviews"
                                    aria-labelledby="user-org-profile-reviews-title"
                                  >
                                    <h3 id="user-org-profile-reviews-title" className="client-compte-section-title">
                                      {t('driverDashboard.orgProfileReviewsTitle')}
                                    </h3>
                                    <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                                      {t('driverDashboard.orgProfileReviewsLead')}
                                    </p>
                                    <OrgProfileReviewsCarousel
                                      reviews={orgProfileSampleReviews}
                                      t={t}
                                      language={language}
                                    />
                                  </section>
                                </div>
                              ) : orgSubView === 'team' ? (
                                <ul className="dashboard-org-member-list">
                                  {chauffeurOrg.members.map((m) => (
                                    <li key={m.id} className="dashboard-org-member-row">
                                      <div className="dashboard-org-member-main">
                                        <span className="dashboard-org-member-email">
                                          <Mail size={14} aria-hidden />
                                          {m.email}
                                        </span>
                                        <span className="dashboard-org-member-meta">
                                          {m.role === 'admin'
                                            ? t('driverDashboard.orgRoleAdmin')
                                            : t('driverDashboard.orgRoleDriver')}
                                          {' · '}
                                          {m.status === 'pending'
                                            ? t('driverDashboard.orgStatusPending')
                                            : t('driverDashboard.orgStatusActive')}
                                        </span>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : orgSubView === 'invites' && isChauffeurOrgAdmin ? (
                                <>
                                  <form className="dashboard-org-invite-form" onSubmit={handleInviteDriver}>
                                    <label className="dashboard-org-create-label">
                                      {t('driverDashboard.orgInviteLabel')}
                                      <input
                                        type="email"
                                        value={orgInviteEmail}
                                        onChange={(e) => {
                                          setOrgInviteEmail(e.target.value);
                                          setOrgInviteError(null);
                                        }}
                                        placeholder={t('driverDashboard.orgInvitePlaceholder')}
                                        autoComplete="email"
                                      />
                                    </label>
                                    {orgInviteError ? (
                                      <p className="dashboard-field-hint" style={{ margin: '0 0 8px', color: '#b91c1c' }}>
                                        {orgInviteError}
                                      </p>
                                    ) : null}
                                    <button type="submit" className="dashboard-user-save-btn">
                                      {t('driverDashboard.orgInviteButton')}
                                    </button>
                                  </form>
                                  <h4 className="client-compte-section-title" style={{ marginTop: 16 }}>
                                    {t('driverDashboard.orgStatusPending')}
                                  </h4>
                                  <ul className="dashboard-org-member-list">
                                    {chauffeurOrg.members
                                      .filter((m) => m.status === 'pending')
                                      .map((m) => (
                                        <li key={m.id} className="dashboard-org-member-row">
                                          <div className="dashboard-org-member-main">
                                            <span className="dashboard-org-member-email">
                                              <Mail size={14} aria-hidden />
                                              {m.email}
                                            </span>
                                          </div>
                                        </li>
                                      ))}
                                  </ul>
                                </>
                              ) : orgSubView === 'settings' && isChauffeurOrgAdmin ? (
                                <>
                                  <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                                    {t('driverDashboard.orgSettingsDangerLead')}
                                  </p>
                                  <button
                                    type="button"
                                    className="dashboard-user-logout-btn"
                                    onClick={handleDeleteOrganization}
                                  >
                                    {t('driverDashboard.orgDeleteOrg')}
                                  </button>
                                </>
                              ) : orgSubView === 'fleet' && isChauffeurOrgAdmin ? (
                                <p className="dashboard-field-hint">{t('driverDashboard.fleetLead')}</p>
                              ) : (
                                <p className="dashboard-field-hint">{t('driverDashboard.orgPageLead')}</p>
                              )}
                            </section>
                          </div>
                        ) : null}
                        {userSubView === 'preferences' ? (
                          <div className="dashboard-user-sections">
                            <section className="dashboard-user-subcard">
                              <h4>Préférences</h4>
                              <h3 className="client-compte-section-title">{t('clientAccount.settingsLanguageTitle')}</h3>
                              <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
                                {t('clientAccount.settingsLanguageHint')}
                              </p>
                              <div className="client-compte-settings-lang-row" style={{ marginBottom: 16 }}>
                                <LanguageSwitcher />
                              </div>

                              <h3 className="client-compte-section-title">{t('clientAccount.settingsAppearanceTitle')}</h3>
                              <p className="dashboard-field-hint" style={{ margin: '0 0 8px' }}>
                                {t('clientAccount.settingsAppearanceHint')}
                              </p>
                              <label className="client-compte-settings-toggle-row">
                                <span>{language === 'en' ? 'Theme' : 'Theme'}</span>
                                <select
                                  value={appPrefs.theme}
                                  onChange={(e) => setAppTheme(e.target.value as AppTheme)}
                                >
                                  <option value="light">{language === 'en' ? 'Light' : 'Clair'}</option>
                                  <option value="dark">{language === 'en' ? 'Dark' : 'Sombre'}</option>
                                  <option value="contrast">{language === 'en' ? 'High contrast' : 'Contraste eleve'}</option>
                                </select>
                              </label>

                              <h3 className="client-compte-section-title" style={{ marginTop: 16 }}>
                                {t('clientAccount.settingsTextSizeTitle')}
                              </h3>
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
                                  aria-valuetext={t('clientAccount.settingsTextSizeValue', {
                                    n: String(appPrefs.fontScalePercent),
                                  })}
                                />
                                <span className="client-compte-font-scale-end client-compte-font-scale-end--max" aria-hidden="true">
                                  {FONT_SCALE_PERCENT_MAX} %
                                </span>
                              </div>
                              <p className="client-compte-font-scale-value" aria-live="polite">
                                {t('clientAccount.settingsTextSizeValue', { n: String(appPrefs.fontScalePercent) })}
                              </p>

                              <h3 className="client-compte-section-title" style={{ marginTop: 16 }}>
                                {t('clientAccount.settingsNotificationsTitle')}
                              </h3>
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
                            </section>
                          </div>
                        ) : null}
                        {userSubView === 'help' ? (
                          <div className="dashboard-user-sections">
                            <section className="dashboard-user-subcard">
                              <h4>{t('driverDashboard.navHelp')}</h4>
                              <dl className="client-compte-help-faq">
                                <dt>{t('clientAccount.helpFaq1Q')}</dt>
                                <dd>{t('clientAccount.helpFaq1A')}</dd>
                                <dt>{t('clientAccount.helpFaq2Q')}</dt>
                                <dd>{t('clientAccount.helpFaq2A')}</dd>
                                <dt>{t('clientAccount.helpFaq3Q')}</dt>
                                <dd>{t('clientAccount.helpFaq3A')}</dd>
                              </dl>
                            </section>
                          </div>
                        ) : null}
                      </article>
                    </section>
                      )}
                      </div>
                    </div>
                  )}

                  {activeView === 'settings' && (
                    <section className="dashboard-table-section">
                      <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                        {t('clientAccount.settingsLead')}
                      </p>
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
                          <span>{language === 'en' ? 'Theme' : 'Theme'}</span>
                          <select
                            value={appPrefs.theme}
                            onChange={(e) => setAppTheme(e.target.value as AppTheme)}
                          >
                            <option value="light">{language === 'en' ? 'Light' : 'Clair'}</option>
                            <option value="dark">{language === 'en' ? 'Dark' : 'Sombre'}</option>
                            <option value="contrast">{language === 'en' ? 'High contrast' : 'Contraste eleve'}</option>
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
                            aria-valuetext={t('clientAccount.settingsTextSizeValue', {
                              n: String(appPrefs.fontScalePercent),
                            })}
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
                        {t('driverDashboard.settingsMoreHint')}
                      </p>
                    </section>
                  )}

                  {activeView === 'help' && (
                    <section className="dashboard-table-section">
                      <p className="dashboard-field-hint" style={{ margin: '0 0 16px' }}>
                        {t('driverDashboard.helpLead')}
                      </p>
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
                  )}
                </div>
              </>
            )}
          </div>

          {/* Edit/Create Modal */}
          {(editingProject || isCreating) && (
            <ProjectEditor
              project={editingProject}
              isCreating={isCreating}
              onSave={handleSave}
              onCancel={() => { setEditingProject(null); setIsCreating(false); }}
            />
          )}

          {planningModalDate !== null && (
            <div className="planning-modal-overlay" onClick={() => setPlanningModalDate(null)}>
              <div className="planning-modal" onClick={(e) => e.stopPropagation()}>
                <div className="planning-modal-head">
                  <h3>
                    {new Date(`${planningModalDate}T12:00:00`).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h3>
                  <button type="button" onClick={() => setPlanningModalDate(null)}>Fermer</button>
                </div>
                <div className="planning-modal-list">
                  {planningSlotsForModal.length === 0 ? (
                    <p className="planning-modal-empty">Aucune course ce jour (selon le filtre de statut du planning).</p>
                  ) : (
                    planningSlotsForModal.map((slot) => (
                      <article key={slot.id} className="planning-modal-item">
                        <div>
                          <strong>{slot.heure}</strong>
                          <p>
                            Course planifiee -{' '}
                            <span className={`ride-status-badge ride-status-badge--${rideStatusTone(slot.statut)}`}>
                              {slot.statut}
                            </span>
                          </p>
                          {(() => {
                            const details = courseRows.find((course) => course.id === slot.id);
                            if (!details) return null;
                            return (
                              <>
                                <p className="planning-course-details">
                                  <button
                                    type="button"
                                    className="planning-client-link"
                                    onClick={() => {
                                      setSelectedClientId(details.clientId);
                                      setPlanningModalDate(null);
                                      setClientModalOpen(true);
                                    }}
                                  >
                                    {details.client}
                                  </button>
                                  {' · '}
                                  {details.depart} {'->'} {details.arrivee} · {details.km.toFixed(1)} km ·{' '}
                                  {formatEurAmount(details.montant)}
                                </p>
                                {details.statut === 'En cours' && details.startedAt != null && (
                                  <div className="planning-ride-track" aria-live="polite">
                                    <p>
                                      <strong>Course en cours</strong> · Temps ecoule :{' '}
                                      <ElapsedSince startedAt={details.startedAt} />
                                    </p>
                                    <p className="planning-ride-track-meta">
                                      Itineraire estime : {details.km.toFixed(1)} km
                                      {details.routeSnapDeviationKm != null && (
                                        <>
                                          {' '}
                                          · ecart tracee (mock GPS) : +{details.routeSnapDeviationKm.toFixed(2)} km — dans
                                          la marge
                                        </>
                                      )}
                                    </p>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div className="planning-modal-actions">
                          <button
                            type="button"
                            className="accept"
                            disabled={coursesBlockedByCompliance || slot.statut !== 'En attente'}
                            onClick={() => {
                              if (coursesBlockedByCompliance) return;
                              if (slot.statut !== 'En attente') return;
                              if (persistRides) {
                                void (async () => {
                                  try {
                                    await postChauffeurRideAction(slot.id, 'accept');
                                    await refreshRides();
                                  } catch (err) {
                                    console.error(err);
                                  }
                                })();
                                return;
                              }
                              setCourseRows((prev) =>
                                prev.map((course) =>
                                  course.id === slot.id ? { ...course, statut: 'Acceptee' } : course
                                )
                              );
                            }}
                          >
                            Accepter
                          </button>
                          <button
                            type="button"
                            className="start-ride"
                            disabled={coursesBlockedByCompliance || (slot.statut !== 'Acceptee' && slot.statut !== 'En cours')}
                            title={
                              slot.statut === 'En cours'
                                ? 'Rouvrir la navigation de la course en cours.'
                                : 'Signale au systeme que vous demarrez reellement la course (comme sur Uber).'
                            }
                            onClick={() => {
                              if (coursesBlockedByCompliance) return;
                              if (slot.statut === 'Acceptee') {
                                void launchCourseById(slot.id);
                                return;
                              }
                              if (slot.statut === 'En cours') {
                                resumeCourseById(slot.id);
                              }
                            }}
                          >
                            {slot.statut === 'En cours' ? 'Reprendre' : 'Lancer la course'}
                          </button>
                          <button
                            type="button"
                            className="accept"
                            disabled={coursesBlockedByCompliance || slot.statut !== 'En cours'}
                            title="Terminer la course en cours."
                            onClick={() => {
                              if (coursesBlockedByCompliance) return;
                              if (slot.statut !== 'En cours') return;
                              void completeCourseById(slot.id);
                            }}
                          >
                            Terminer
                          </button>
                          <button
                            type="button"
                            className="decline"
                            disabled={
                              slot.statut === 'Terminee' ||
                              slot.statut === 'En cours' ||
                              slot.statut === 'Annulee' ||
                              (persistRides && slot.statut === 'En attente' && slot.bookingKind === 'scheduled')
                            }
                            onClick={() => {
                              if (slot.statut === 'Terminee' || slot.statut === 'En cours' || slot.statut === 'Annulee') return;
                              if (persistRides && slot.statut === 'En attente' && slot.bookingKind === 'scheduled') return;
                              if (persistRides) {
                                void (async () => {
                                  try {
                                    await postChauffeurRideAction(slot.id, 'cancel');
                                    await refreshRides();
                                  } catch (err) {
                                    console.error(err);
                                  }
                                })();
                                return;
                              }
                              setCourseRows((prev) =>
                                prev.map((course) =>
                                  course.id === slot.id ? { ...course, statut: 'Annulee' } : course
                                )
                              );
                            }}
                          >
                            Decommander
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <div className="planning-modal-add-section">
                  <h4 className="planning-modal-add-title">Ajouter une course ce jour</h4>
                  {persistRides ? (
                    <p className="planning-modal-empty">
                      Les courses affichees viennent des commandes clients (API). L ajout manuel est desactive.
                    </p>
                  ) : (
                  <form
                    className="add-course-form add-course-form--planning"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (coursesBlockedByCompliance) return;
                      if (!newCourseForm.depart.trim() || !newCourseForm.arrivee.trim()) return;
                      const km = Number(newCourseForm.km);
                      const montant = Number(newCourseForm.montant);
                      if (!Number.isFinite(km) || km < 0 || !Number.isFinite(montant) || montant < 0) return;

                      const suffix = Math.floor(Math.random() * 9000 + 1000);
                      setCourseRows((prev) => [
                        {
                          id: `C-${suffix}`,
                          clientId: selectedNewCourseClient.id,
                          date: newCourseForm.date,
                          heure: newCourseForm.heure,
                          client: selectedNewCourseClient.nom,
                          depart: newCourseForm.depart.trim(),
                          arrivee: newCourseForm.arrivee.trim(),
                          km,
                          statut: newCourseForm.statut as CourseStatut,
                          montant,
                          modePaiement: newCourseForm.modePaiement,
                        },
                        ...prev,
                      ]);
                      setNewCourseForm((prev) => ({
                        clientId: selectedNewCourseClient.id,
                        date: planningModalDate ?? prev.date,
                        heure: '08:00',
                        depart: '',
                        arrivee: '',
                        km: '',
                        montant: '',
                        modePaiement: 'carte',
                        statut: 'En attente',
                      }));
                    }}
                  >
                    <label>
                      Client
                      <select
                        value={newCourseForm.clientId}
                        onChange={(e) => setNewCourseForm((prev) => ({ ...prev, clientId: e.target.value }))}
                        required
                      >
                        {clientRows.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.nom}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Date
                      <input
                        type="date"
                        value={newCourseForm.date}
                        onChange={(e) => setNewCourseForm((prev) => ({ ...prev, date: e.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Heure
                      <input
                        type="time"
                        value={newCourseForm.heure}
                        onChange={(e) => setNewCourseForm((prev) => ({ ...prev, heure: e.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Depart
                      <input
                        type="text"
                        value={newCourseForm.depart}
                        onChange={(e) => setNewCourseForm((prev) => ({ ...prev, depart: e.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Destination
                      <input
                        type="text"
                        value={newCourseForm.arrivee}
                        onChange={(e) => setNewCourseForm((prev) => ({ ...prev, arrivee: e.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Distance (km)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newCourseForm.km}
                        onChange={(e) => setNewCourseForm((prev) => ({ ...prev, km: e.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Prix (EUR)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newCourseForm.montant}
                        onChange={(e) => setNewCourseForm((prev) => ({ ...prev, montant: e.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Paiement prevu
                      <select
                        value={newCourseForm.modePaiement}
                        onChange={(e) =>
                          setNewCourseForm((prev) => ({
                            ...prev,
                            modePaiement: e.target.value as 'carte' | 'especes',
                          }))
                        }
                      >
                        <option value="carte">Carte (surplus possible)</option>
                        <option value="especes">Especes</option>
                      </select>
                    </label>
                    <label>
                      Statut
                      <select
                        value={newCourseForm.statut}
                        onChange={(e) => setNewCourseForm((prev) => ({ ...prev, statut: e.target.value }))}
                        required
                      >
                        <option value="En attente">En attente</option>
                        <option value="Acceptee">Acceptee</option>
                        <option value="En cours">En cours</option>
                        <option value="Terminee">Terminee</option>
                      </select>
                    </label>
                    <button type="submit" className="add-course-submit">Ajouter la course</button>
                  </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {bugReportModalOpen && (
            <div
              className="planning-modal-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="bug-modal-title"
              onClick={() => {
                if (!bugSubmitting) setBugReportModalOpen(false);
              }}
            >
              <div
                className="planning-modal dashboard-notifications-modal dashboard-bug-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="planning-modal-head">
                  <h3 id="bug-modal-title">{t('driverDashboard.bugModalTitle')}</h3>
                  <button type="button" disabled={bugSubmitting} onClick={() => setBugReportModalOpen(false)}>
                    {t('driverDashboard.bugClose')}
                  </button>
                </div>
                <div className="dashboard-bug-modal-body">
                  <p className="dashboard-bug-modal-lead">{t('driverDashboard.bugModalLead')}</p>
                  <div
                    className="dashboard-bug-sentiment"
                    role="group"
                    aria-label={t('driverDashboard.bugSentimentLabel')}
                  >
                    <button
                      type="button"
                      className={`dashboard-bug-sentiment-btn${bugSentiment === 'up' ? ' dashboard-bug-sentiment-btn--active' : ''}`}
                      aria-pressed={bugSentiment === 'up'}
                      onClick={() => setBugSentiment((s) => (s === 'up' ? null : 'up'))}
                    >
                      <ThumbsUp size={18} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={`dashboard-bug-sentiment-btn${bugSentiment === 'down' ? ' dashboard-bug-sentiment-btn--active' : ''}`}
                      aria-pressed={bugSentiment === 'down'}
                      onClick={() => setBugSentiment((s) => (s === 'down' ? null : 'down'))}
                    >
                      <ThumbsDown size={18} aria-hidden />
                    </button>
                  </div>
                  <label className="dashboard-bug-field">
                    <span>{t('driverDashboard.bugMessageLabel')}</span>
                    <textarea
                      className="dashboard-bug-textarea"
                      rows={5}
                      value={bugMessage}
                      onChange={(e) => setBugMessage(e.target.value)}
                      placeholder={t('driverDashboard.bugMessagePlaceholder')}
                      disabled={bugSubmitting}
                    />
                  </label>
                  <button
                    type="button"
                    className="add-course-submit dashboard-bug-submit"
                    disabled={bugSubmitting}
                    onClick={() => void submitBugReport()}
                  >
                    {bugSubmitting ? t('driverDashboard.bugSubmitting') : t('driverDashboard.bugSubmit')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {alertsOpen && (
            <div
              className="planning-modal-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notif-modal-title"
              onClick={() => setAlertsOpen(false)}
            >
              <div className="planning-modal dashboard-notifications-modal" onClick={(e) => e.stopPropagation()}>
                <div className="planning-modal-head">
                  <h3 id="notif-modal-title">{t('driverDashboard.notificationsModalTitle')}</h3>
                  <button type="button" onClick={() => setAlertsOpen(false)}>
                    Fermer
                  </button>
                </div>
                <div className="dashboard-notifications-modal-body">
                  {alertItems.map((alert) => (
                    <article key={alert.id} className={`topbar-alert-item ${alert.kind}`}>
                      <strong>{alert.title}</strong>
                      <p>{alert.description}</p>
                      {alert.kind === 'demand' && alert.courseId ? (
                        <div className="planning-modal-actions" style={{ marginTop: 10 }}>
                          <button
                            type="button"
                            className="accept"
                            disabled={coursesBlockedByCompliance}
                            onClick={() => {
                              void handleDemandAlertAction(alert.courseId, 'accept');
                            }}
                          >
                            Accepter
                          </button>
                          <button
                            type="button"
                            className="decline"
                            disabled={coursesBlockedByCompliance}
                            onClick={() => {
                              void handleDemandAlertAction(alert.courseId, 'decline');
                            }}
                          >
                            Refuser
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {moreMenuOpen && (
            <div
              className="planning-modal-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="more-modal-title"
              onClick={() => setMoreMenuOpen(false)}
            >
              <div className="planning-modal dashboard-notifications-modal" onClick={(e) => e.stopPropagation()}>
                <div className="planning-modal-head">
                  <h3 id="more-modal-title">{t('driverDashboard.moreMenuTitle')}</h3>
                  <button type="button" onClick={() => setMoreMenuOpen(false)}>
                    Fermer
                  </button>
                </div>
                <div className="dashboard-notifications-modal-body topbar-more-body">
                  <button
                    type="button"
                    className="topbar-more-item"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setBugReportModalOpen(true);
                    }}
                  >
                    {t('driverDashboard.reportBug')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {clientModalOpen && (() => {
            const selected = clientRows.find((c) => c.id === selectedClientId) ?? clientRows[0];
            if (!selected) return null;
            return (
              <div className="client-modal-overlay" onClick={() => setClientModalOpen(false)}>
                <div className="client-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="client-modal-head">
                    <h3>Fiche client</h3>
                    <button type="button" onClick={() => setClientModalOpen(false)}>Fermer</button>
                  </div>
                  <article className="client-profile-card">
                    <div className="client-profile-head">
                      <h4>{selected.nom}</h4>
                      <span>{selected.id}</span>
                    </div>
                    <div className="client-profile-grid">
                      <div><strong>Telephone</strong><p>{selected.telephone}</p></div>
                      <div><strong>Nombre de courses</strong><p>{selected.courses}</p></div>
                      <div><strong>Depense totale</strong><p>{selected.depense}</p></div>
                      <div><strong>Note moyenne</strong><p>{selected.note} / 5</p></div>
                    </div>
                  </article>
                </div>
              </div>
            );
          })()}

          {isMobileViewport && (
            <div className="dashboard-mobile-bottombar" role="group" aria-label="Actions dashboard mobile">
              <button type="button" className="dashboard-mobile-search-btn" aria-label="Rechercher">
                <Search size={16} aria-hidden />
                <span>Rechercher...</span>
              </button>
              <span className="dashboard-mobile-divider" aria-hidden />
              <button
                type="button"
                className="dashboard-mobile-menu-btn"
                aria-label={mobileSidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={mobileSidebarOpen}
                onClick={() => setMobileSidebarOpen((prev) => !prev)}
              >
                <Menu size={18} aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
