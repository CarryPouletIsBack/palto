import type { ReactNode } from 'react'
import './ButtonLoadingLabel.css'

export type ButtonLoadingLabelProps = {
  pending: boolean
  pendingLabel: string
  children: ReactNode
  /** Boutons fond sombre (primary Palto). */
  spinnerVariant?: 'default' | 'inverse'
}

export function ButtonLoadingLabel({
  pending,
  pendingLabel,
  children,
  spinnerVariant = 'inverse',
}: ButtonLoadingLabelProps) {
  if (!pending) return <>{children}</>
  return (
    <span className="btn-loading-content">
      <span
        className={`btn-loading-spinner${spinnerVariant === 'inverse' ? ' btn-loading-spinner--inverse' : ''}`}
        aria-hidden
      />
      <span>{pendingLabel}</span>
    </span>
  )
}
