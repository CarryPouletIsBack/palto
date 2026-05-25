import { getDestinationById } from '../data/popularDestinations'

export type SeoLanguage = 'fr' | 'en'

export type PageSeo = {
  title: string
  description: string
  robots: 'index,follow' | 'noindex,nofollow'
  canonicalPath: string
  ogTitle?: string
  ogDescription?: string
  ogImage: string
  ogType?: 'website' | 'article'
  twitterCard?: 'summary' | 'summary_large_image'
}

export type PageSeoOptions = {
  navigationCourseId?: string | null
}

const DEFAULT_OG_IMAGE = '/images/palto-og.svg'

const PUBLIC_DESCRIPTIONS = {
  fr: {
    home:
      'Palto facilite les trajets à La Réunion : recherche de destination, estimation de course, réservation immédiate ou programmée.',
    chauffeur:
      'Espace chauffeur Palto : recevez des demandes structurées, suivez vos courses et préparez votre activité à La Réunion.',
    go:
      'Palto Go permet de préparer une course à La Réunion avec adresse de départ, destination, estimation et choix immédiat ou programmé.',
    contact: 'Contactez Palto pour une question, un partenariat ou un retour sur les services de mobilité à La Réunion.',
    menu: 'Retrouvez les accès principaux Palto : réservation, compte, contact et espace chauffeur.',
    destination:
      'Préparez une course Palto vers cette destination à La Réunion avec itinéraire, contexte local et accès direct à la réservation.',
    notFound: 'La page demandée est introuvable. Retrouvez les accès principaux de Palto.',
  },
  en: {
    home:
      'Palto helps plan rides in Reunion Island: destination search, fare estimate, instant or scheduled booking.',
    chauffeur:
      'Palto driver area: receive structured ride requests, follow trips and prepare your activity in Reunion Island.',
    go:
      'Palto Go helps prepare a ride in Reunion Island with pickup, destination, estimate, and instant or scheduled booking.',
    contact: 'Contact Palto for questions, partnerships, or feedback about mobility services in Reunion Island.',
    menu: 'Find the main Palto links: booking, account, contact and driver area.',
    destination:
      'Prepare a Palto ride to this destination in Reunion Island with route context and direct booking access.',
    notFound: 'The requested page cannot be found. Browse the main Palto links.',
  },
} as const

export function getSeoPathForLang(page: string, lang: SeoLanguage, navigationCourseId?: string | null): string {
  const prefix = lang === 'en' ? '/en' : '/fr'
  if (page === 'accueil' || page === '404') return prefix
  if (page === 'accueil-chauffeur') return `${prefix}/chauffeur`
  if (page === 'menu') return `${prefix}/menu`
  if (page === 'contact') return `${prefix}/contact`
  if (page === 'dashboard') return `${prefix}/dashboard`
  if (page === 'client-meet-driver') return `${prefix}/compte/course`
  if (page === 'client-compte') return `${prefix}/compte`
  if (page === 'dashboard-navigation') {
    return navigationCourseId
      ? `${prefix}/dashboard/navigation/${encodeURIComponent(navigationCourseId)}`
      : `${prefix}/dashboard`
  }
  if (page.startsWith('destination-')) {
    const id = page.slice('destination-'.length)
    return id ? `${prefix}/lieu/${encodeURIComponent(id)}` : prefix
  }
  if (page.startsWith('project-')) {
    const name = page.replace('project-', '')
    const slug = name.toLowerCase()
    return slug === 'go' ? `${prefix}/go` : `${prefix}/project/${encodeURIComponent(name)}`
  }
  return prefix
}

export function absoluteUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, '')
  if (/^https?:\/\//i.test(path)) return path
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function getPageSeo(page: string, language: SeoLanguage, options: PageSeoOptions = {}): PageSeo {
  const copy = PUBLIC_DESCRIPTIONS[language]
  const canonicalPath = getSeoPathForLang(page, language, options.navigationCourseId)

  if (page === 'accueil-chauffeur') {
    return {
      title: language === 'en' ? 'Palto Drivers — Manage rides in Reunion Island' : 'Palto Chauffeurs — Gérez vos courses à La Réunion',
      description: copy.chauffeur,
      robots: 'index,follow',
      canonicalPath,
      ogImage: DEFAULT_OG_IMAGE,
      twitterCard: 'summary_large_image',
    }
  }

  if (page === 'contact') {
    return {
      title: language === 'en' ? 'Contact Palto' : 'Contact — Palto',
      description: copy.contact,
      robots: 'index,follow',
      canonicalPath,
      ogImage: DEFAULT_OG_IMAGE,
      twitterCard: 'summary_large_image',
    }
  }

  if (page === 'menu') {
    return {
      title: language === 'en' ? 'Palto Menu' : 'Menu — Palto',
      description: copy.menu,
      robots: 'index,follow',
      canonicalPath,
      ogImage: DEFAULT_OG_IMAGE,
      twitterCard: 'summary_large_image',
    }
  }

  if (page === 'client-compte') {
    return {
      title: language === 'en' ? 'My Palto account' : 'Mon compte — Palto',
      description: language === 'en' ? 'Private Palto passenger account.' : 'Compte passager Palto privé.',
      robots: 'noindex,nofollow',
      canonicalPath,
      ogImage: DEFAULT_OG_IMAGE,
      twitterCard: 'summary',
    }
  }

  if (page === 'client-meet-driver') {
    return {
      title: language === 'en' ? 'Meet your driver — Palto' : 'Retrouver votre chauffeur — Palto',
      description: language === 'en' ? 'Private ride tracking page.' : 'Page privée de suivi de course.',
      robots: 'noindex,nofollow',
      canonicalPath,
      ogImage: DEFAULT_OG_IMAGE,
      twitterCard: 'summary',
    }
  }

  if (page === 'dashboard' || page === 'dashboard-navigation') {
    return {
      title: page === 'dashboard-navigation'
        ? language === 'en'
          ? 'Driver navigation — Palto'
          : 'Navigation course — Palto'
        : language === 'en'
          ? 'Driver dashboard — Palto'
          : 'Tableau de bord chauffeur — Palto',
      description: language === 'en' ? 'Private Palto driver workspace.' : 'Espace chauffeur Palto privé.',
      robots: 'noindex,nofollow',
      canonicalPath,
      ogImage: DEFAULT_OG_IMAGE,
      twitterCard: 'summary',
    }
  }

  if (page.startsWith('project-')) {
    return {
      title: language === 'en' ? 'Palto Go — Book rides in Reunion Island' : 'Palto Go — Réserver une course à La Réunion',
      description: copy.go,
      robots: 'index,follow',
      canonicalPath,
      ogImage: DEFAULT_OG_IMAGE,
      twitterCard: 'summary_large_image',
    }
  }

  if (page.startsWith('destination-')) {
    const id = page.slice('destination-'.length)
    const destination = getDestinationById(id)
    const label = destination ? (language === 'en' ? destination.titleEn : destination.titleFr) : 'Palto'
    return {
      title: language === 'en' ? `${label} — Palto ride` : `${label} — Course Palto`,
      description: destination
        ? `${copy.destination} ${language === 'en' ? destination.titleEn : destination.titleFr}.`
        : copy.destination,
      robots: destination ? 'index,follow' : 'noindex,nofollow',
      canonicalPath,
      ogImage: destination?.imageSrc || DEFAULT_OG_IMAGE,
      ogType: 'article',
      twitterCard: 'summary_large_image',
    }
  }

  if (page === '404') {
    return {
      title: language === 'en' ? 'Page not found — Palto' : 'Page introuvable — Palto',
      description: copy.notFound,
      robots: 'noindex,nofollow',
      canonicalPath,
      ogImage: DEFAULT_OG_IMAGE,
      twitterCard: 'summary',
    }
  }

  return {
    title: language === 'en' ? 'Palto — Rides in Reunion Island' : 'Palto — Courses à La Réunion',
    description: copy.home,
    robots: 'index,follow',
    canonicalPath,
    ogImage: DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
  }
}

export function getPageJsonLd(page: string, language: SeoLanguage, siteBaseUrl: string, options: PageSeoOptions = {}) {
  const seo = getPageSeo(page, language, options)
  if (seo.robots === 'noindex,nofollow') return []

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Palto',
    url: absoluteUrl(siteBaseUrl, getSeoPathForLang('accueil', language)),
    inLanguage: ['fr', 'en'],
    description: PUBLIC_DESCRIPTIONS[language].home,
  }

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Palto',
    url: absoluteUrl(siteBaseUrl, getSeoPathForLang('accueil', language)),
    logo: absoluteUrl(siteBaseUrl, '/images/palto-app-icon.svg'),
  }

  if (page.startsWith('project-')) {
    return [
      website,
      organization,
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'Palto Go',
        serviceType: language === 'en' ? 'Ride booking' : 'Réservation de course',
        areaServed: {
          '@type': 'AdministrativeArea',
          name: language === 'en' ? 'Reunion Island' : 'La Réunion',
        },
        provider: { '@type': 'Organization', name: 'Palto' },
        url: absoluteUrl(siteBaseUrl, seo.canonicalPath),
        description: seo.description,
      },
    ]
  }

  if (page.startsWith('destination-')) {
    const destination = getDestinationById(page.slice('destination-'.length))
    if (!destination) return [website, organization]
    return [
      website,
      organization,
      {
        '@context': 'https://schema.org',
        '@type': 'Place',
        name: language === 'en' ? destination.titleEn : destination.titleFr,
        url: absoluteUrl(siteBaseUrl, seo.canonicalPath),
        image: destination.imageSrc || absoluteUrl(siteBaseUrl, DEFAULT_OG_IMAGE),
        description: seo.description,
        address: {
          '@type': 'PostalAddress',
          addressRegion: language === 'en' ? 'Reunion Island' : 'La Réunion',
          addressCountry: 'RE',
        },
      },
    ]
  }

  return [website, organization]
}
