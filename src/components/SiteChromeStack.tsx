import type { ReactNode } from 'react'
import BetaTestBanner from './BetaTestBanner'

/** Bandeau bêta + barre (topbar / header) dans le même flux document. */
export function SiteChromeStack({ children }: { children: ReactNode }) {
  return (
    <div className="site-chrome-stack">
      <BetaTestBanner placement="top" inPageFlow />
      {children}
    </div>
  )
}
