import Clarity from '@microsoft/clarity'
import ReactGA from 'react-ga4'

export const ANALYTICS_ADMIN_STORAGE_KEY = 'exclude_analytics'

type AnalyticsUserContext = {
  id?: string
  role?: 'client' | 'chauffeur' | 'admin' | 'guest'
}

export type AnalyticsDeviceContext = {
  browser: string
  os: string
  viewport: string
  touch: boolean
  language: string
  timezone: string
}

export type AnalyticsRuntimeConfig = {
  gaMeasurementId: string | null
  gtmId: string | null
  clarityProjectId: string | null
  rb2bKey: string | null
  enableVercelAnalytics: boolean
  enableSpeedInsights: boolean
  debug: boolean
}

let gaReady = false
let gtmReady = false
let clarityReady = false
let currentUserContext: AnalyticsUserContext = {}

function envString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isEnabled(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export function readAnalyticsRuntimeConfig(): AnalyticsRuntimeConfig {
  return {
    gaMeasurementId: envString(import.meta.env.VITE_GA_MEASUREMENT_ID),
    gtmId: envString(import.meta.env.VITE_GTM_ID),
    clarityProjectId: envString(import.meta.env.VITE_CLARITY_PROJECT_ID),
    rb2bKey: envString(import.meta.env.VITE_RB2B_KEY),
    enableVercelAnalytics: isEnabled(import.meta.env.VITE_ENABLE_VERCEL_ANALYTICS),
    enableSpeedInsights: isEnabled(import.meta.env.VITE_ENABLE_SPEED_INSIGHTS),
    debug: isEnabled(import.meta.env.VITE_ANALYTICS_DEBUG),
  }
}

export function markAnalyticsExcludedFromUrl(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('admin') !== 'true') return false
  try {
    window.localStorage.setItem(ANALYTICS_ADMIN_STORAGE_KEY, 'true')
  } catch {
    /* ignore */
  }
  return true
}

export function isAnalyticsExcluded(): boolean {
  if (typeof window === 'undefined') return true
  if (markAnalyticsExcludedFromUrl()) return true
  try {
    return window.localStorage.getItem(ANALYTICS_ADMIN_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function parseBrowser(userAgent: string): string {
  if (/Edg\//.test(userAgent)) return 'Edge'
  if (/OPR\//.test(userAgent)) return 'Opera'
  if (/Firefox\//.test(userAgent)) return 'Firefox'
  if (/SamsungBrowser\//.test(userAgent)) return 'Samsung Internet'
  if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) return 'Chrome'
  if (/Safari\//.test(userAgent)) return 'Safari'
  return 'Unknown'
}

function parseOs(userAgent: string): string {
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS'
  if (/Android/.test(userAgent)) return 'Android'
  if (/Mac OS X|Macintosh/.test(userAgent)) return 'macOS'
  if (/Windows NT/.test(userAgent)) return 'Windows'
  if (/Linux/.test(userAgent)) return 'Linux'
  return 'Unknown'
}

export function getAnalyticsDeviceContext(): AnalyticsDeviceContext {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      viewport: '0x0',
      touch: false,
      language: 'unknown',
      timezone: 'unknown',
    }
  }
  const userAgent = navigator.userAgent || ''
  return {
    browser: parseBrowser(userAgent),
    os: parseOs(userAgent),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    touch: navigator.maxTouchPoints > 0,
    language: navigator.language || 'unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
  }
}

function pushDataLayer(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const w = window as Window & { dataLayer?: Array<Record<string, unknown>> }
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push(payload)
}

function injectScript(id: string, src: string): void {
  if (typeof document === 'undefined' || document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

export function initAnalytics(): void {
  if (typeof window === 'undefined' || isAnalyticsExcluded()) return
  const config = readAnalyticsRuntimeConfig()

  if (config.gaMeasurementId && !gaReady) {
    ReactGA.initialize(config.gaMeasurementId, { testMode: import.meta.env.DEV })
    gaReady = true
  }

  if (config.gtmId && !gtmReady) {
    pushDataLayer({ 'gtm.start': Date.now(), event: 'gtm.js' })
    injectScript('palto-gtm', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmId)}`)
    gtmReady = true
  }

  if (config.clarityProjectId && !clarityReady) {
    Clarity.init(config.clarityProjectId)
    clarityReady = true
  }

  if (config.debug) {
    console.info('[analytics] initialized', {
      ga: Boolean(config.gaMeasurementId),
      gtm: Boolean(config.gtmId),
      clarity: Boolean(config.clarityProjectId),
      device: getAnalyticsDeviceContext(),
    })
  }
}

export function setUserContext(context: AnalyticsUserContext): void {
  currentUserContext = { ...context }
}

export function identify(id: string, context: Omit<AnalyticsUserContext, 'id'> = {}): void {
  setUserContext({ ...context, id })
  if (isAnalyticsExcluded()) return
  if (clarityReady) {
    const friendlyName = context.role ? `${context.role}:${id}` : id
    Clarity.identify(id, undefined, undefined, friendlyName)
    if (context.role) Clarity.setTag('role', context.role)
  }
  pushDataLayer({ event: 'palto_identify', user: currentUserContext })
}

export function trackPageView(path: string, title?: string): void {
  if (isAnalyticsExcluded()) return
  const pageTitle = title || (typeof document !== 'undefined' ? document.title : undefined)
  const device = getAnalyticsDeviceContext()

  if (gaReady) {
    ReactGA.send({ hitType: 'pageview', page: path, title: pageTitle })
  }

  pushDataLayer({
    event: 'palto_page_view',
    page_path: path,
    page_title: pageTitle,
    device,
    user: currentUserContext,
  })
}

export function trackEvent(
  action: string,
  category: string = 'general',
  label?: string,
  value?: number
): void {
  if (isAnalyticsExcluded()) return
  const device = getAnalyticsDeviceContext()

  if (gaReady) {
    ReactGA.event({ action, category, label, value })
  }

  if (clarityReady) {
    const clarityEvent = label ? `${category}_${action}_${label}` : `${category}_${action}`
    Clarity.event(clarityEvent.slice(0, 128))
  }

  pushDataLayer({
    event: 'palto_event',
    event_action: action,
    event_category: category,
    event_label: label,
    value,
    device,
    user: currentUserContext,
  })
}

export function trackLinkClick(linkName: string, linkUrl: string): void {
  trackEvent('click', 'link', linkName)
  if (linkUrl.startsWith('/')) trackPageView(linkUrl)
}

export function trackDownload(fileName: string, fileType: string): void {
  trackEvent('download', 'file', `${fileName}.${fileType}`)
}

export function trackSearch(searchTerm: string, resultsCount?: number): void {
  trackEvent('search', 'site', searchTerm, resultsCount)
}
