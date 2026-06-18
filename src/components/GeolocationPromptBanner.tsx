import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import Button from './Button'
import './GeolocationPromptBanner.css'
import {
  markUserGeolocationDenied,
  saveGrantedUserGeolocation,
} from '../constants/userGeolocationSession'
import { geocodeReverse } from '../services/addressGeocoding'

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
  const { t, language } = useLanguage()
  const [visible, setVisible] = useState(false)

  const persistGrantedPosition = useCallback(
    (longitude: number, latitude: number) => {
      saveGrantedUserGeolocation(longitude, latitude)
      void geocodeReverse(longitude, latitude, undefined, { language }).then((label) => {
        if (label?.trim()) saveGrantedUserGeolocation(longitude, latitude, label.trim())
      })
    },
    [language]
  )

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
          if (p.state === 'granted') {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (cancelled) return
                persistGrantedPosition(pos.coords.longitude, pos.coords.latitude)
                markDone()
              },
              () => {
                if (!cancelled) markDone()
              },
              { enableHighAccuracy: false, timeout: 12000, maximumAge: 120_000 }
            )
            return
          }
          if (p.state === 'denied') {
            markUserGeolocationDenied()
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
  }, [persistGrantedPosition])

  const dismiss = useCallback(() => {
    markDone()
    setVisible(false)
  }, [])

  const onAllow = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        persistGrantedPosition(pos.coords.longitude, pos.coords.latitude)
        markDone()
        setVisible(false)
      },
      () => {
        markUserGeolocationDenied()
        markDone()
        setVisible(false)
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 }
    )
  }, [persistGrantedPosition])

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
