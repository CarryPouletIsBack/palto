import { useLanguage } from '../contexts/LanguageContext'
import { trackEvent } from '../services/googleAnalyticsTracking'
import { PLACEHOLDER_COVER } from '../constants/imagePlaceholders'
import Button from './Button'
import { SocialFooterLinks } from './SocialFooterLinks'
import './ErrorPage.css'

const PROJECTS = [{ slug: 'Go', title: 'Go', cover: PLACEHOLDER_COVER }]

interface ErrorPageProps {
  code?: number
  onBackToHome: () => void
  onProjectClick?: (projectSlug: string) => void
}

export default function ErrorPage({ code = 404, onBackToHome, onProjectClick }: ErrorPageProps) {
  const { t } = useLanguage()

  const handleProjectClick = (slug: string) => {
    trackEvent('click', 'error_page_project', slug)
    if (onProjectClick) {
      onProjectClick(slug)
    } else {
      const base = window.location.pathname.startsWith('/en') ? '/en' : '/fr'
      window.location.href = `${base}/${slug.toLowerCase()}`
    }
  }

  return (
    <div className="error-page">
      <div className="error-page-content">
        <p className="error-page-code">{code}</p>
        <h1 className="error-page-title">{t('error.pageNotFound')}</h1>
        <p className="error-page-message">{t('error.pageNotFoundMessage')}</p>

        <section className="error-page-projects">
          <h2 className="error-page-projects-title">{t('error.discoverProjects')}</h2>
          <div className="error-page-projects-grid">
            {PROJECTS.map((project) => (
              <button
                key={project.slug}
                type="button"
                className="error-page-project-card"
                onClick={() => handleProjectClick(project.slug)}
              >
                <div className="error-page-project-cover">
                  <img src={project.cover} alt={project.title} loading="lazy" />
                </div>
                <span className="error-page-project-title">{project.title}</span>
              </button>
            ))}
          </div>
        </section>

        <SocialFooterLinks className="error-page-social" />

        <Button variant="primary" className="error-page-cta" onClick={onBackToHome}>
          {t('error.backToHome')}
        </Button>
      </div>
    </div>
  )
}
