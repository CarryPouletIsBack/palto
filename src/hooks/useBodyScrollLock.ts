import { useEffect } from 'react'

/**
 * Bloque le scroll de la page derrière une modale ouverte (évite le scroll « à travers »).
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return

    const body = document.body
    const html = document.documentElement
    const prevBodyOverflow = body.style.overflow
    const prevHtmlOverflow = html.style.overflow
    const prevBodyPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - html.clientWidth

    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      body.style.overflow = prevBodyOverflow
      html.style.overflow = prevHtmlOverflow
      body.style.paddingRight = prevBodyPaddingRight
    }
  }, [locked])
}
