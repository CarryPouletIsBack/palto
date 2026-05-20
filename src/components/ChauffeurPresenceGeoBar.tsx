import { MapPin } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import Button from './Button'
import './ChauffeurPresenceGeoBar.css'

type Props = {
  onActivate: () => void
  error?: string | null
  /** Masquer seulement quand une position a bien été envoyée au serveur. */
  hide?: boolean
}

/** Bannière dashboard : activer le GPS chauffeur (requis sur mobile après un clic). */
export function ChauffeurPresenceGeoBar({ onActivate, error, hide }: Props) {
  const { t } = useLanguage()

  if (hide) return null

  return (
    <div className="chauffeur-presence-geo" role="region" aria-labelledby="chauffeur-presence-geo-title">
      <div className="chauffeur-presence-geo__inner">
        <MapPin size={20} aria-hidden className="chauffeur-presence-geo__icon" />
        <div className="chauffeur-presence-geo__text">
          <p id="chauffeur-presence-geo-title" className="chauffeur-presence-geo__title">
            {t('chauffeurGeo.title')}
          </p>
          <p className="chauffeur-presence-geo__body">{t('chauffeurGeo.body')}</p>
          {error ? <p className="chauffeur-presence-geo__error">{error}</p> : null}
        </div>
        <Button type="button" variant="primary" className="chauffeur-presence-geo__btn" onClick={onActivate}>
          {t('chauffeurGeo.activate')}
        </Button>
      </div>
    </div>
  )
}
