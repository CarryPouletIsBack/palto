import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import Button from './Button'
import './GeolocationPromptBanner.css'

const SESSION_DONE_KEY = 'palto_geo_prompt_done_v1'

function markDone() {
  try {
    sessionStorage.setItem(SESSION_DONE_KEY, '1')
  } catch {
    /* quota / private mode */
  }
}

function isDone(): boolean {
  try {
    return sessionStorage.getItem(SESSION_DONE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * À l’arrivée sur le site : propose d’autoriser la géolocalisation (geste utilisateur → dialogue système).
 * Une fois traité (accord, refus navigateur ou « Pas maintenant »), ne réaffiche pas cette session.
 */
export function GeolocationPromptBanner() {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isDone()) return
    if (!navigator.geolocation) return

    let cancelled = false

    const decide = async () => {
      try {
        const perm = navigator.permissions?.query({ name: 'geolocation' as PermissionName })
        if (perm) {
          const p = await perm
          if (cancelled) return
          if (p.state === 'granted' || p.state === 'denied') {
            markDone()
            return
          }
        }
      } catch {
        /* Permissions-API absente ou géolocalisation non exposée */
      }
      if (!cancelled) setVisible(true)
    }

    void decide()
    return () => {
      cancelled = true
    }
  }, [])

  const dismiss = useCallback(() => {
    markDone()
    setVisible(false)
  }, [])

  const onAllow = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      () => {
        markDone()
        setVisible(false)
      },
      () => {
        markDone()
        setVisible(false)
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 }
    )
  }, [])

  if (!visible) return null

  return (
    <div className="palto-geo-prompt" role="region" aria-labelledby="palto-geo-prompt-title">
      <div className="palto-geo-prompt__inner">
        <p id="palto-geo-prompt-title" className="palto-geo-prompt__title">
          {t('geoPrompt.title')}
        </p>
        <p className="palto-geo-prompt__body">{t('geoPrompt.body')}</p>
        <div className="palto-geo-prompt__actions">
          <Button type="button" variant="secondary" onClick={dismiss}>
            {t('geoPrompt.later')}
          </Button>
          <Button type="button" variant="primary" onClick={onAllow}>
            {t('geoPrompt.allow')}
          </Button>
        </div>
      </div>
    </div>
  )
}
