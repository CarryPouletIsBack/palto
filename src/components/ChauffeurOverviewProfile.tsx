import type { DragEvent, ReactNode } from 'react';
import { BarChart3, Camera, ChevronRight, Image, MapPin, Pencil, Share2, User } from 'lucide-react';
import type { Language } from '../contexts/LanguageContext';
import type { FleetAvailability } from '../constants/chauffeurFleetZones';

export type OverviewProfileTab = 'vehicle' | 'service' | 'organization' | 'about' | 'contact';

type TabDef = { id: OverviewProfileTab; labelFr: string; labelEn: string };

const TABS: TabDef[] = [
  { id: 'vehicle', labelFr: 'Votre véhicule', labelEn: 'Your vehicle' },
  { id: 'service', labelFr: 'Service (tarifs)', labelEn: 'Service (rates)' },
  { id: 'organization', labelFr: 'Organisation', labelEn: 'Organization' },
  { id: 'about', labelFr: 'À propos', labelEn: 'About' },
  { id: 'contact', labelFr: 'Contact', labelEn: 'Contact' },
];

type Props = {
  language: Language;
  prenom: string;
  nom: string;
  photoUrl: string | null;
  onPrenomChange: (value: string) => void;
  onNomChange: (value: string) => void;
  onPhotoPick: (file: File | undefined) => void;
  onSavePersonal?: () => void;
  isPersonalDirty?: boolean;
  subtitle: string;
  vehicleBadge?: string;
  isVtc?: boolean;
  availability?: FleetAvailability;
  availabilityLabel?: string;
  onAvailabilityClick?: () => void;
  messagesEnabled?: boolean;
  onMessagesEnabledChange?: (enabled: boolean) => void;
  onStatsClick?: () => void;
  onShareClick?: () => void;
  commune: string;
  communeOptions: readonly string[];
  onCommuneChange: (value: string) => void;
  heroImageUrl: string | null;
  heroImageAlt: string;
  onHeroImagePick?: (file: File | undefined) => void;
  showHeroImagePicker?: boolean;
  activeTab: OverviewProfileTab;
  onTabChange: (tab: OverviewProfileTab) => void;
  children: ReactNode;
};

export default function ChauffeurOverviewProfile({
  language,
  prenom,
  nom,
  photoUrl,
  onPrenomChange,
  onNomChange,
  onPhotoPick,
  onSavePersonal,
  isPersonalDirty = false,
  subtitle,
  vehicleBadge,
  isVtc = false,
  availability = 'available',
  availabilityLabel,
  onAvailabilityClick,
  messagesEnabled = true,
  onMessagesEnabledChange,
  onStatsClick,
  onShareClick,
  commune,
  communeOptions,
  onCommuneChange,
  heroImageUrl,
  heroImageAlt,
  onHeroImagePick,
  showHeroImagePicker = false,
  activeTab,
  onTabChange,
  children,
}: Props) {
  const isEn = language === 'en';
  const resolvedAvailabilityLabel =
    availabilityLabel ??
    (isEn
      ? availability === 'available'
        ? 'Available'
        : availability === 'on_course'
          ? 'On a ride'
          : availability === 'pause'
            ? 'Break'
            : 'Off duty'
      : availability === 'available'
        ? 'Disponible'
        : availability === 'on_course'
          ? 'En course'
          : availability === 'pause'
            ? 'Pause'
            : 'Hors ligne');
  const badgeLabel = vehicleBadge?.trim() || subtitle;

  const handleHeroDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleHeroDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!onHeroImagePick) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onHeroImagePick(file);
  };

  return (
    <section className="chauffeur-overview-profile" aria-labelledby="chauffeur-overview-profile-heading">
      <h2 id="chauffeur-overview-profile-heading" className="chauffeur-overview-profile__sr-only">
        {isEn ? 'Profile' : 'Profil'}
      </h2>

      <div className="chauffeur-overview-profile__header">
        <div className="chauffeur-overview-profile__identity">
          <div className="chauffeur-overview-profile__identity-top">
            <label className="chauffeur-overview-profile__avatar-btn">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="chauffeur-overview-profile__file-input"
                onChange={(e) => {
                  onPhotoPick(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <span className="chauffeur-overview-profile__avatar" aria-hidden>
                {photoUrl ? (
                  <img src={photoUrl} alt="" />
                ) : (
                  <User size={28} strokeWidth={1.75} />
                )}
              </span>
              <span
                className={`chauffeur-overview-profile__avatar-status chauffeur-overview-profile__avatar-status--${availability}`}
                aria-hidden
              />
              <span className="chauffeur-overview-profile__avatar-edit">
                <Camera size={12} strokeWidth={2} aria-hidden />
              </span>
              <span className="chauffeur-overview-profile__sr-only">
                {isEn ? 'Change profile photo' : 'Modifier la photo de profil'}
              </span>
            </label>

            <div className="chauffeur-overview-profile__identity-badges">
              <div className="chauffeur-overview-profile__identity-badge-row">
                {isVtc ? (
                  <span className="chauffeur-overview-profile__tag chauffeur-overview-profile__tag--pro">
                    VTC
                  </span>
                ) : null}
                {badgeLabel ? (
                  <span className="chauffeur-overview-profile__tag chauffeur-overview-profile__tag--vehicle">
                    {badgeLabel}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                className={`chauffeur-overview-profile__tag chauffeur-overview-profile__tag--availability chauffeur-overview-profile__tag--availability-${availability}`}
                onClick={onAvailabilityClick}
                disabled={!onAvailabilityClick}
              >
                <span>{resolvedAvailabilityLabel}</span>
                <ChevronRight size={14} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>

          <div className="chauffeur-overview-profile__identity-main">
            <div className="chauffeur-overview-profile__name-row">
              <input
                type="text"
                className="chauffeur-overview-profile__name-input chauffeur-overview-profile__name-input--given"
                value={prenom}
                onChange={(e) => onPrenomChange(e.target.value)}
                placeholder={isEn ? 'First name' : 'Prénom'}
                autoComplete="given-name"
                aria-label={isEn ? 'First name' : 'Prénom'}
              />
              <input
                type="text"
                className="chauffeur-overview-profile__name-input chauffeur-overview-profile__name-input--family"
                value={nom}
                onChange={(e) => onNomChange(e.target.value)}
                placeholder={isEn ? 'Last name' : 'Nom'}
                autoComplete="family-name"
                aria-label={isEn ? 'Last name' : 'Nom'}
              />
            </div>
            <p className="chauffeur-overview-profile__subtitle">{subtitle}</p>
          </div>

          <div className="chauffeur-overview-profile__identity-actions">
            <label className="chauffeur-overview-profile__message-toggle">
              <span>{isEn ? 'Message' : 'Message'}</span>
              <input
                type="checkbox"
                role="switch"
                className="chauffeur-overview-profile__message-toggle-input"
                checked={messagesEnabled}
                onChange={(e) => onMessagesEnabledChange?.(e.target.checked)}
                disabled={!onMessagesEnabledChange}
                aria-label={isEn ? 'Allow client messages' : 'Autoriser les messages clients'}
              />
              <span className="chauffeur-overview-profile__message-toggle-track" aria-hidden />
            </label>
            <button
              type="button"
              className="chauffeur-overview-profile__icon-action"
              onClick={onStatsClick}
              disabled={!onStatsClick}
              aria-label={isEn ? 'View statistics' : 'Voir les statistiques'}
            >
              <BarChart3 size={18} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              className="chauffeur-overview-profile__icon-action"
              onClick={onShareClick}
              disabled={!onShareClick}
              aria-label={isEn ? 'Share profile' : 'Partager le profil'}
            >
              <Share2 size={18} strokeWidth={2} aria-hidden />
            </button>
          </div>

          {isPersonalDirty && onSavePersonal ? (
            <button type="button" className="chauffeur-overview-profile__save-personal" onClick={onSavePersonal}>
              {isEn ? 'Save profile' : 'Enregistrer le profil'}
            </button>
          ) : null}
        </div>

        <div className="chauffeur-overview-profile__hero-wrap">
          {showHeroImagePicker && onHeroImagePick ? (
            <label
              className={`chauffeur-overview-profile__hero chauffeur-overview-profile__hero--editable${
                heroImageUrl ? ' chauffeur-overview-profile__hero--has-image' : ''
              }`}
              onDragOver={handleHeroDragOver}
              onDrop={handleHeroDrop}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="chauffeur-overview-profile__file-input"
                onChange={(e) => {
                  onHeroImagePick(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              {heroImageUrl ? (
                <img src={heroImageUrl} alt={heroImageAlt} decoding="async" />
              ) : null}
              <span className="chauffeur-overview-profile__hero-upload-overlay" aria-hidden={Boolean(heroImageUrl)}>
                <Image size={28} strokeWidth={1.5} className="chauffeur-overview-profile__hero-upload-icon" aria-hidden />
                <strong className="chauffeur-overview-profile__hero-upload-title">
                  {isEn ? 'Add vehicle photo' : 'Ajouter une photo du véhicule'}
                </strong>
                <span className="chauffeur-overview-profile__hero-upload-action">
                  {isEn ? 'Drag and drop or ' : 'Glisser-déposer ou '}
                  <span className="chauffeur-overview-profile__hero-upload-browse">
                    {isEn ? 'browse' : 'parcourir'}
                  </span>
                </span>
                <small className="chauffeur-overview-profile__hero-upload-hint">
                  {isEn
                    ? 'JPG, PNG or WebP · 16:9 recommended · max. 5 MB (auto-compressed)'
                    : 'JPG, PNG ou WebP · 16:9 recommandé · max. 5 Mo (compressé automatiquement)'}
                </small>
              </span>
              <span className="chauffeur-overview-profile__hero-edit" aria-hidden>
                <Pencil size={14} strokeWidth={2} />
              </span>
            </label>
          ) : (
            <div className="chauffeur-overview-profile__hero">
              {heroImageUrl ? (
                <img src={heroImageUrl} alt={heroImageAlt} decoding="async" />
              ) : (
                <span className="chauffeur-overview-profile__hero-placeholder chauffeur-overview-profile__hero-placeholder--muted">
                  {isEn ? 'Vehicle photo' : 'Photo du véhicule'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="chauffeur-overview-profile__tabs" aria-label={isEn ? 'Profile sections' : 'Sections du profil'}>
        <div className="chauffeur-overview-profile__tabs-list" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`overview-profile-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`overview-profile-panel-${tab.id}`}
              className={`chauffeur-overview-profile__tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {isEn ? tab.labelEn : tab.labelFr}
            </button>
          ))}
        </div>
        <label className="chauffeur-overview-profile__location">
          <span className="chauffeur-overview-profile__location-inner">
            <MapPin size={14} strokeWidth={2} aria-hidden />
            <span className="chauffeur-overview-profile__location-value" aria-hidden>
              {commune || (isEn ? 'Choose…' : 'Choisir…')}
            </span>
            <select
              className="chauffeur-overview-profile__location-select"
              value={commune}
              onChange={(e) => onCommuneChange(e.target.value)}
              aria-label={isEn ? 'Municipality (Reunion)' : 'Commune (La Réunion)'}
            >
              <option value="">{isEn ? 'Choose…' : 'Choisir…'}</option>
              {communeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </span>
          <Pencil size={13} strokeWidth={2} className="chauffeur-overview-profile__location-edit" aria-hidden />
        </label>
      </nav>

      <div
        className="chauffeur-overview-profile__panel"
        role="tabpanel"
        id={`overview-profile-panel-${activeTab}`}
        aria-labelledby={`overview-profile-tab-${activeTab}`}
      >
        {children}
      </div>
    </section>
  );
}
