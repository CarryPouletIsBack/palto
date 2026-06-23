import { useMemo, useState } from 'react'
import { Briefcase, Luggage, Baby, X, User, Route } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import type { ChauffeurVehicleType } from '../constants/chauffeurRegistrationStorage'
import {
  CHAUFFEUR_JOBS_MOCK,
  countChauffeurJobsForDriver,
  jobMatchesChauffeurVehicle,
  vehicleTypeLabel,
  type ChauffeurJobOffer,
} from '../data/chauffeurJobs'
import ChauffeurJobRouteModal from './ChauffeurJobRouteModal'
import './ChauffeurJobsPanel.css'

type JobsTab = 'forYou' | 'all'

export type ChauffeurJobsPanelProps = {
  chauffeurVehicleType?: ChauffeurVehicleType | string | null
  acceptedJobIds: ReadonlySet<string>
  dismissedJobIds: ReadonlySet<string>
  onDismissJob: (jobId: string) => void
  onAcceptJob: (job: ChauffeurJobOffer) => void
}

function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function formatFullScheduleDate(job: ChauffeurJobOffer, language: 'fr' | 'en'): string {
  const d = new Date(`${job.scheduledDate}T${job.scheduledTime}:00`)
  return d.toLocaleString(language === 'en' ? 'en-GB' : 'fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function JobCard({
  job,
  language,
  onDismiss,
  onApply,
  onViewRoute,
}: {
  job: ChauffeurJobOffer
  language: 'fr' | 'en'
  onDismiss: (id: string) => void
  onApply: (job: ChauffeurJobOffer) => void
  onViewRoute: (job: ChauffeurJobOffer) => void
}) {
  const title =
    language === 'en'
      ? `Scheduled ride · ${vehicleTypeLabel(job.vehicleRequired, language)}`
      : `Course programmée · ${vehicleTypeLabel(job.vehicleRequired, language)}`

  const photoUrl = job.clientPhotoUrl?.trim() || null

  return (
    <article className="chauffeur-job-card">
      <header className="chauffeur-job-card__head">
        <div className="chauffeur-job-card__poster">
          <span className="chauffeur-job-card__avatar" aria-hidden>
            {photoUrl ? (
              <img src={photoUrl} alt="" className="chauffeur-job-card__avatar-img" />
            ) : (
              <span className="chauffeur-job-card__avatar-fallback">
                {clientInitials(job.clientName) || <User size={16} strokeWidth={2} />}
              </span>
            )}
          </span>
          <div className="chauffeur-job-card__poster-meta">
            <span className="chauffeur-job-card__poster-name">{job.clientName}</span>
            <time
              className="chauffeur-job-card__posted"
              dateTime={`${job.scheduledDate}T${job.scheduledTime}`}
            >
              {formatFullScheduleDate(job, language)}
            </time>
          </div>
        </div>
      </header>
      <h3 className="chauffeur-job-card__title">{title}</h3>
      <button
        type="button"
        className="chauffeur-job-card__route"
        onClick={() => onViewRoute(job)}
        aria-label={
          language === 'en'
            ? `View route from ${job.pickupLabel} to ${job.dropoffLabel}`
            : `Voir le trajet de ${job.pickupLabel} vers ${job.dropoffLabel}`
        }
      >
        <span className="chauffeur-job-card__route-text">
          {job.pickupLabel} → {job.dropoffLabel}
        </span>
        <Route size={15} strokeWidth={2} aria-hidden className="chauffeur-job-card__route-icon" />
      </button>
      <p className="chauffeur-job-card__meta">
        {job.amountEur} € · {job.distanceKm} km · ~{job.deliveryWindowLabel}
      </p>
      <div className="chauffeur-job-card__tags">
        <span className="chauffeur-job-card__tag">{vehicleTypeLabel(job.vehicleRequired, language)}</span>
        {job.luggage ? (
          <span className="chauffeur-job-card__tag">
            <Luggage size={12} strokeWidth={2} aria-hidden />
            {language === 'en' ? 'Luggage' : 'Bagages'}
          </span>
        ) : null}
        {job.babySeat ? (
          <span className="chauffeur-job-card__tag">
            <Baby size={12} strokeWidth={2} aria-hidden />
            {language === 'en' ? 'Baby seat' : 'Siège bébé'}
          </span>
        ) : null}
      </div>
      <div className="chauffeur-job-card__actions">
        <button
          type="button"
          className="chauffeur-job-card__btn chauffeur-job-card__btn--ghost"
          onClick={() => onDismiss(job.id)}
        >
          <X size={16} strokeWidth={2} aria-hidden />
          {language === 'en' ? 'Dismiss' : 'Ignorer'}
        </button>
        <button
          type="button"
          className="chauffeur-job-card__btn chauffeur-job-card__btn--primary"
          onClick={() => onApply(job)}
        >
          {language === 'en' ? 'Accept' : 'Accepter'}
        </button>
      </div>
    </article>
  )
}

export default function ChauffeurJobsPanel({
  chauffeurVehicleType,
  acceptedJobIds,
  dismissedJobIds,
  onDismissJob,
  onAcceptJob,
}: ChauffeurJobsPanelProps) {
  const { t, language } = useLanguage()
  const lang = language === 'en' ? 'en' : 'fr'
  const [tab, setTab] = useState<JobsTab>('forYou')
  const [routePreviewJob, setRoutePreviewJob] = useState<ChauffeurJobOffer | null>(null)

  const visibleJobs = useMemo(() => {
    const base = CHAUFFEUR_JOBS_MOCK.filter(
      (j) => !dismissedJobIds.has(j.id) && !acceptedJobIds.has(j.id)
    ).sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    if (tab === 'all') return base
    return base.filter((j) => jobMatchesChauffeurVehicle(j, chauffeurVehicleType))
  }, [tab, dismissedJobIds, acceptedJobIds, chauffeurVehicleType])

  const forYouCount = useMemo(
    () =>
      countChauffeurJobsForDriver({
        acceptedJobIds,
        dismissedJobIds,
        chauffeurVehicleType,
      }),
    [dismissedJobIds, acceptedJobIds, chauffeurVehicleType]
  )

  const allCount = useMemo(
    () => CHAUFFEUR_JOBS_MOCK.filter((j) => !dismissedJobIds.has(j.id) && !acceptedJobIds.has(j.id)).length,
    [dismissedJobIds, acceptedJobIds]
  )

  const handleDismiss = (id: string) => {
    onDismissJob(id)
  }

  const handleApply = (job: ChauffeurJobOffer) => {
    onAcceptJob(job)
  }

  return (
    <section className="chauffeur-jobs" aria-label={t('driverDashboard.titleJobs')}>
      <div className="chauffeur-jobs__toolbar">
        <div className="chauffeur-jobs__tabs" role="tablist" aria-label={t('driverDashboard.jobsTabsAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'forYou'}
            className={'chauffeur-jobs__tab' + (tab === 'forYou' ? ' chauffeur-jobs__tab--active' : '')}
            onClick={() => setTab('forYou')}
          >
            {t('driverDashboard.jobsTabForYou')} ({forYouCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            className={'chauffeur-jobs__tab' + (tab === 'all' ? ' chauffeur-jobs__tab--active' : '')}
            onClick={() => setTab('all')}
          >
            {t('driverDashboard.jobsTabAll')} ({allCount})
          </button>
        </div>
      </div>

      <div className="chauffeur-jobs__list" role="tabpanel">
        {visibleJobs.length === 0 ? (
          <div className="chauffeur-jobs__empty">
            <Briefcase size={28} strokeWidth={1.75} aria-hidden />
            <p>{t('driverDashboard.jobsEmpty')}</p>
          </div>
        ) : (
          visibleJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              language={lang}
              onDismiss={handleDismiss}
              onApply={handleApply}
              onViewRoute={setRoutePreviewJob}
            />
          ))
        )}
      </div>
      {routePreviewJob ? (
        <ChauffeurJobRouteModal
          job={routePreviewJob}
          language={lang}
          onClose={() => setRoutePreviewJob(null)}
        />
      ) : null}
    </section>
  )
}
