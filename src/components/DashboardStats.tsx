import { useMemo } from 'react';
import { CheckCircle2, Clock3, Star, Wallet } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import './DashboardStats.css';

/** Agrégats d’activité chauffeur (courses du planning), sans Google Analytics. */
export interface ChauffeurActivityStatsForView {
  completed: number;
  cancelled: number;
  inProgress: number;
  pending: number;
  totalCourses: number;
  acceptanceRate: number;
  cancellationRate: number;
  totalIncome: number;
  rating: number;
  onlineHoursWeek: number;
  lastPayout: string;
}

export interface ChauffeurHeatmapStatsForView {
  totalWeeks: number;
  cells: number[][];
  bestMonth: string;
  bestDay: string;
  longestStreak: string;
  currentStreak: string;
}

interface DashboardStatsProps {
  activity: ChauffeurActivityStatsForView;
  heatmap?: ChauffeurHeatmapStatsForView | null;
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

const DashboardStats = ({ activity, heatmap }: DashboardStatsProps) => {
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  const yearlyHeatmap = useMemo(() => {
    const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const weekdayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const totalWeeks = 52;
    const monthWeekMarkers = monthLabels.map((label, m) => ({
      week: Math.min(totalWeeks - 1, Math.floor((m * totalWeeks) / 12)),
      label,
    }));
    const colors = ['#eef0f3', '#d8efe5', '#b9e0cf', '#82c8a9', '#4ca780'];

    const hasApiHeatmap =
      heatmap != null &&
      Array.isArray(heatmap.cells) &&
      heatmap.cells.length === totalWeeks &&
      heatmap.cells.every((col) => Array.isArray(col) && col.length === weekdayLabels.length);

    const emptyCells = Array.from({ length: totalWeeks }, () => weekdayLabels.map(() => 0));
    const colorForEmpty = () => colors[0];

    if (!hasApiHeatmap) {
      return {
        monthWeekMarkers,
        totalWeeks,
        weekdayLabels,
        cells: emptyCells,
        colorFor: colorForEmpty,
        bestMonth: '—',
        bestDay: '—',
        longestStreak: '—',
        currentStreak: '—',
        heatmapEmpty: true as const,
      };
    }

    const cells = heatmap.cells;
    const flat = cells.flat();
    const max = Math.max(0, ...flat);
    const min = max > 0 ? Math.min(...flat) : 0;

    const colorFor = (value: number) => {
      if (max <= 0) return colors[0];
      if (value <= 0) return colors[0];
      const ratio = (value - min) / Math.max(1e-6, max - min);
      if (ratio < 0.25) return colors[1];
      if (ratio < 0.5) return colors[2];
      if (ratio < 0.75) return colors[3];
      return colors[4];
    };

    return {
      monthWeekMarkers,
      totalWeeks,
      weekdayLabels,
      cells,
      colorFor,
      bestMonth: heatmap.bestMonth?.trim() || '—',
      bestDay: heatmap.bestDay?.trim() || '—',
      longestStreak: heatmap.longestStreak?.trim() || '—',
      currentStreak: heatmap.currentStreak?.trim() || '—',
      heatmapEmpty: false as const,
    };
  }, [heatmap]);

  const summary = [
    {
      key: 'completed',
      label: 'Courses terminées',
      value: `${activity.completed}`,
      helper: `${activity.totalCourses} au total`,
      icon: CheckCircle2,
    },
    {
      key: 'revenue',
      label: 'Revenus',
      value: formatEur(activity.totalIncome),
      helper: 'hors annulations',
      icon: Wallet,
    },
    {
      key: 'online',
      label: 'En ligne',
      value: `${activity.onlineHoursWeek} h`,
      helper: 'sur 7 jours',
      icon: Clock3,
    },
    {
      key: 'rating',
      label: 'Note',
      value: `${activity.rating.toFixed(2)} / 5`,
      helper: `dernier versement : ${activity.lastPayout}`,
      icon: Star,
    },
  ] as const;

  return (
    <div className="dashboard-stats-container">
      <div className="stats-kpi-grid">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.key} className="stats-kpi-card">
              <div className="stats-kpi-icon" aria-hidden>
                <Icon size={18} />
              </div>
              <p className="stats-kpi-label">{item.label}</p>
              <p className="stats-kpi-value">{item.value}</p>
              <p className="stats-kpi-helper">{item.helper}</p>
            </article>
          );
        })}
      </div>

      <section className="stats-heatmap-card" aria-label={isEn ? 'Annual activity heatmap' : 'Heatmap annuelle activité'}>
        <div className="stats-chart-head">
          <h3>{isEn ? 'Annual activity' : 'Activité annuelle'}</h3>
          {yearlyHeatmap.heatmapEmpty ? (
            <span className="stats-chart-head-badge">{isEn ? 'Not connected' : 'Non branché'}</span>
          ) : null}
        </div>
        <div className="stats-heatmap-scroll">
          <div className="stats-heatmap-grid">
            <div className="stats-heatmap-months">
              {Array.from({ length: yearlyHeatmap.totalWeeks }, (_, weekIdx) => {
                const marker = yearlyHeatmap.monthWeekMarkers.find((m) => m.week === weekIdx);
                return (
                  <span key={`month-slot-${weekIdx}`}>{marker?.label ?? ''}</span>
                );
              })}
            </div>
            <div className="stats-heatmap-body">
              <div className="stats-heatmap-days">
                {yearlyHeatmap.weekdayLabels.map((day, i) => (
                  <span key={`${day}-${i}`}>{day}</span>
                ))}
              </div>
              <div className="stats-heatmap-cells">
                {yearlyHeatmap.cells.map((col, weekIdx) => (
                  <div key={`col-${weekIdx}`} className="stats-heatmap-col">
                    {col.map((value, dayIdx) => (
                      <span
                        key={`cell-${weekIdx}-${dayIdx}`}
                        className="stats-heatmap-cell"
                        style={{ background: yearlyHeatmap.colorFor(value) }}
                        title={
                          value > 0
                            ? isEn
                              ? `${value} ride${value > 1 ? 's' : ''}`
                              : `${value} course${value > 1 ? 's' : ''}`
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="stats-heatmap-meta">
          <article>
            <p>{isEn ? 'Busiest month' : 'Mois le plus actif'}</p>
            <strong>{yearlyHeatmap.bestMonth}</strong>
          </article>
          <article>
            <p>{isEn ? 'Busiest weekday' : 'Jour le plus actif'}</p>
            <strong>{yearlyHeatmap.bestDay}</strong>
          </article>
          <article>
            <p>{isEn ? 'Longest streak' : 'Plus longue série'}</p>
            <strong>{yearlyHeatmap.longestStreak}</strong>
          </article>
          <article>
            <p>{isEn ? 'Current streak' : 'Série actuelle'}</p>
            <strong>{yearlyHeatmap.currentStreak}</strong>
          </article>
        </div>
        {yearlyHeatmap.heatmapEmpty ? (
          <p className="stats-heatmap-placeholder" role="status">
            {t('driverDashboard.statsHeatmapPlaceholder')}
          </p>
        ) : null}
        <div className="stats-heatmap-legend">
          <span>{isEn ? 'Less' : 'Moins'}</span>
          <div>
            <i style={{ background: '#eef0f3' }} />
            <i style={{ background: '#d8efe5' }} />
            <i style={{ background: '#b9e0cf' }} />
            <i style={{ background: '#82c8a9' }} />
            <i style={{ background: '#4ca780' }} />
          </div>
          <span>{isEn ? 'More' : 'Plus'}</span>
        </div>
      </section>

      <section className="stats-inline-notes" aria-label="Ratios">
        <article>
          <p>{isEn ? 'Acceptance rate' : 'Taux d’acceptation'}</p>
          <strong>{activity.acceptanceRate}%</strong>
        </article>
        <article>
          <p>{isEn ? 'Cancellation rate' : 'Taux d’annulation'}</p>
          <strong>{activity.cancellationRate}%</strong>
        </article>
        <article>
          <p>{isEn ? 'In progress / pending' : 'En cours / attente'}</p>
          <strong>
            {activity.inProgress} / {activity.pending}
          </strong>
        </article>
      </section>
    </div>
  );
};

export default DashboardStats;
