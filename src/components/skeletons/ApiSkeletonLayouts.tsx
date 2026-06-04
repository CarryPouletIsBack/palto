import Skeleton from '../Skeleton'
import './ApiSkeletonLayouts.css'

type CountProps = { count?: number }

/** Liste chauffeurs (page Go). */
export function RideDriverListSkeleton({ count = 4 }: CountProps) {
  return (
    <div className="palto-skeleton-driver-list" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="palto-skeleton-driver-item">
          <div className="palto-skeleton-driver-item__left">
            <Skeleton className="skeleton--on-surface skeleton--block" height="16px" width="58%" />
            <Skeleton className="skeleton--on-surface skeleton--block" height="12px" width="75%" />
          </div>
          <Skeleton className="skeleton--on-surface" height="18px" width="52px" borderRadius="6px" />
        </div>
      ))}
    </div>
  )
}

/** Liste courses passager (compte / aperçu). */
export function RideRowListSkeleton({ count = 5 }: CountProps) {
  return (
    <ul className="palto-skeleton-ride-list" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="palto-skeleton-ride-row">
            <Skeleton className="skeleton--on-surface skeleton--block" height="14px" width="88%" />
            <Skeleton className="skeleton--on-surface skeleton--block" height="11px" width="42%" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Aperçu compte — mini liste sous la tuile courses. */
export function OverviewRidesListSkeleton({ count = 3 }: CountProps) {
  return (
    <div className="palto-skeleton-overview-rides" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="palto-skeleton-ride-row">
          <Skeleton className="skeleton--on-surface skeleton--block" height="13px" width="92%" />
          <Skeleton className="skeleton--on-surface skeleton--block" height="11px" width="55%" />
        </div>
      ))}
    </div>
  )
}

/** Cartes bancaires (Stripe / paiement). */
export function PaymentCardsSkeleton({ count = 2 }: CountProps) {
  return (
    <div className="palto-skeleton-payment-cards" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="palto-skeleton-payment-card">
          <Skeleton className="skeleton--on-surface" height="36px" width="52px" borderRadius="8px" />
          <div className="palto-skeleton-payment-card__body">
            <Skeleton className="skeleton--on-surface skeleton--block" height="14px" width="70%" />
            <Skeleton className="skeleton--on-surface skeleton--block" height="11px" width="45%" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Lignes tableau courses chauffeur. */
export function DashboardCoursesTableSkeleton({ rows = 6 }: { rows?: number }) {
  const colWidths = ['48px', '72px', '52px', '28%', '22%', '18%', '72px', '64px'] as const
  return (
    <table className="palto-skeleton-table dashboard-table dashboard-table--courses" aria-hidden>
      <tbody>
        {Array.from({ length: rows }, (_, row) => (
          <tr key={row}>
            {colWidths.map((w, col) => (
              <td key={col}>
                <Skeleton className="skeleton--on-surface skeleton--block" height="12px" width={w} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** KPI stats chauffeur (4 cartes). */
export function StatsKpiGridSkeleton({ count = 4 }: CountProps) {
  return (
    <div className="palto-skeleton-kpi-grid" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="palto-skeleton-kpi-card">
          <Skeleton className="skeleton--on-surface skeleton--block" height="11px" width="55%" />
          <Skeleton className="skeleton--on-surface skeleton--block" height="22px" width="40%" />
        </div>
      ))}
    </div>
  )
}
