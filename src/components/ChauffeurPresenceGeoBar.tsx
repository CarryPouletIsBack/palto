import { MapPin } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import Button from './Button'
import './ChauffeurPresenceGeoBar.css'

type Props = {
  onActivate: () => void
  onRefresh: () => void
  error?: string | null
  /** Position déjà enregistrée : afficher le bandeau « actif » + actualisation manuelle. */
  tracking?: boolean
}

/** Bannière dashboard : activer ou actualiser le GPS chauffeur (page Go). */
export function ChauffeurPresenceGeoBar({ onActivate, onRefresh, error, tracking }: Props) {
  const { t } = useLanguage()

  if (tracking) {
    return (
      <div
        className="chauffeur-presence-geo chauffeur-presence-geo--active"
        role="region"
        aria-labelledby="chauffeur-presence-geo-active-title"
      >
        <div className="chauffeur-presence-geo__inner">
          <MapPin size={20} aria-hidden className="chauffeur-presence-geo__icon" />
          <div className="chauffeur-presence-geo__text">
            <p id="chauffeur-presence-geo-active-title" className="chauffeur-presence-geo__title">
              {t('chauffeurGeo.activeTitle')}
            </p>
            <p className="chauffeur-presence-geo__body">{t('chauffeurGeo.activeBody')}</p>
            {error ? <p className="chauffeur-presence-geo__error">{error}</p> : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="chauffeur-presence-geo__btn"
            onClick={onRefresh}
          >
            {t('chauffeurGeo.refresh')}
          </Button>
        </div>
      </div>
    )
  }

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
