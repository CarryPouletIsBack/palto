import { useMemo } from 'react';
import { CheckCircle2, Clock3, Star, Wallet } from 'lucide-react';
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
  const yearlyHeatmap = useMemo(() => {
    const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const weekdayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const totalWeeks = 52;
    const monthFactors = [0.88, 0.92, 1.02, 0.95, 1.04, 1.1, 1.2, 1.16, 1.06, 1.0, 0.96, 1.12];
    const weekdayFactors = [0.84, 0.95, 1.0, 1.05, 1.2, 1.12, 0.78];
    const base = Math.max(1, activity.completed / 90);

    const monthStarts = monthLabels.map((_, idx) => Math.floor((idx / 12) * totalWeeks));
    const cells = Array.from({ length: totalWeeks }, (_, weekIdx) =>
      weekdayLabels.map((_, weekdayIdx) => {
        const monthIdx = Math.min(11, Math.floor((weekIdx / totalWeeks) * 12));
        const seed = (weekIdx * 17 + weekdayIdx * 13 + activity.completed) % 7;
        const noise = 0.78 + seed * 0.08;
        const value = Math.max(0, Math.round(base * monthFactors[monthIdx] * weekdayFactors[weekdayIdx] * noise));
        return value;
      })
    );

    const flat = cells.flat();
    const max = Math.max(1, ...flat);
    const min = Math.min(...flat);

    const colors = ['#eef0f3', '#d8efe5', '#b9e0cf', '#82c8a9', '#4ca780'];
    const colorFor = (value: number) => {
      if (value <= min) return colors[0];
      const ratio = value / max;
      if (ratio < 0.3) return colors[1];
      if (ratio < 0.5) return colors[2];
      if (ratio < 0.75) return colors[3];
      return colors[4];
    };

    const monthTotals = cells.map((col) => col.reduce((sum, v) => sum + v, 0));
    const bestMonthIdx = monthTotals.indexOf(Math.max(...monthTotals));
    const dayTotals = weekdayLabels.map((_, dayIdx) => cells.reduce((sum, col) => sum + col[dayIdx], 0));
    const bestDayIdx = dayTotals.indexOf(Math.max(...dayTotals));

    const binary = flat.map((v) => (v > 0 ? 1 : 0));
    let longest = 0;
    let current = 0;
    let run = 0;
    for (let i = 0; i < binary.length; i += 1) {
      if (binary[i] === 1) {
        run += 1;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
    }
    for (let i = binary.length - 1; i >= 0; i -= 1) {
      if (binary[i] === 1) current += 1;
      else break;
    }

    const fallback = {
      monthLabels,
      monthStarts,
      totalWeeks,
      weekdayLabels,
      cells,
      colorFor,
      bestMonth: ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'][bestMonthIdx] ?? '—',
      bestDay: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][bestDayIdx] ?? '—',
      longestStreak: `${longest}j`,
      currentStreak: `${current}j`,
    };
    if (!heatmap || !Array.isArray(heatmap.cells) || heatmap.cells.length !== totalWeeks) {
      return fallback;
    }
    return {
      ...fallback,
      cells: heatmap.cells,
      bestMonth: heatmap.bestMonth || fallback.bestMonth,
      bestDay: heatmap.bestDay || fallback.bestDay,
      longestStreak: heatmap.longestStreak || fallback.longestStreak,
      currentStreak: heatmap.currentStreak || fallback.currentStreak,
    };
  }, [activity.completed, heatmap]);

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
      <div className="stats-header stats-header--minimal">
        <h2 className="stats-title">Statistiques</h2>
        <p className="stats-subtitle">Vue rapide et lisible de ton activité chauffeur</p>
      </div>

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

      <section className="stats-heatmap-card" aria-label="Heatmap annuelle activité">
        <div className="stats-chart-head">
          <h3>Activité annuelle</h3>
          <span>style contribution</span>
        </div>
        <div className="stats-heatmap-scroll">
          <div className="stats-heatmap-grid">
            <div className="stats-heatmap-months">
              {Array.from({ length: yearlyHeatmap.totalWeeks }, (_, weekIdx) => {
                const monthIdx = yearlyHeatmap.monthStarts.indexOf(weekIdx);
                return (
                  <span key={`month-slot-${weekIdx}`}>
                    {monthIdx >= 0 ? yearlyHeatmap.monthLabels[monthIdx] : ''}
                  </span>
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
                {yearlyHeatmap.cells.map((col, monthIdx) => (
                  <div key={`col-${monthIdx}`} className="stats-heatmap-col">
                    {col.map((value, dayIdx) => (
                      <span
                        key={`cell-${monthIdx}-${dayIdx}`}
                        className="stats-heatmap-cell"
                        style={{ background: yearlyHeatmap.colorFor(value) }}
                        title={`${value} courses`}
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
            <p>Mois le plus actif</p>
            <strong>{yearlyHeatmap.bestMonth}</strong>
          </article>
          <article>
            <p>Jour le plus actif</p>
            <strong>{yearlyHeatmap.bestDay}</strong>
          </article>
          <article>
            <p>Plus longue série</p>
            <strong>{yearlyHeatmap.longestStreak}</strong>
          </article>
          <article>
            <p>Série actuelle</p>
            <strong>{yearlyHeatmap.currentStreak}</strong>
          </article>
        </div>
        <div className="stats-heatmap-legend">
          <span>Moins</span>
          <div>
            <i style={{ background: '#eef0f3' }} />
            <i style={{ background: '#d8efe5' }} />
            <i style={{ background: '#b9e0cf' }} />
            <i style={{ background: '#82c8a9' }} />
            <i style={{ background: '#4ca780' }} />
          </div>
          <span>Plus</span>
        </div>
      </section>

      <section className="stats-inline-notes" aria-label="Ratios">
        <article>
          <p>Taux d’acceptation</p>
          <strong>{activity.acceptanceRate}%</strong>
        </article>
        <article>
          <p>Taux d’annulation</p>
          <strong>{activity.cancellationRate}%</strong>
        </article>
        <article>
          <p>En cours / attente</p>
          <strong>
            {activity.inProgress} / {activity.pending}
          </strong>
        </article>
      </section>
    </div>
  );
};

export default DashboardStats;
