import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LanguageProvider } from './contexts/LanguageContext'
import {
  applyAppThemeToDocument,
  applyUserFontScaleToDocument,
  loadClientAppPreferences,
} from './constants/clientAppPreferencesStorage'
import { initAnalytics } from './services/analytics'
import './styles/globals.css'
import './styles/app-theme.css'
import './index.css'

function showBootstrapError(message: string): void {
  const rootElement = document.getElementById('root')
  if (!rootElement) return
  rootElement.innerHTML = `
    <div style="padding: 20px; color: #b91c1c; font-family: system-ui, sans-serif;">
      <h1 style="margin: 0 0 8px;">Erreur de chargement</h1>
      <p style="margin: 0 0 12px;">${message}</p>
      <button type="button" onclick="location.reload()">Recharger</button>
    </div>
  `
}

/** Ancien SW de prod peut servir un shell vide sur localhost — on le retire en dev uniquement. */
async function unregisterStaleServiceWorkersInDev(): Promise<void> {
  if (!import.meta.env.DEV || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((r) => r.unregister()))
  } catch {
    // ignore
  }
}

void unregisterStaleServiceWorkersInDev()

try {
  initAnalytics()
  const _initialPrefs = loadClientAppPreferences()
  applyAppThemeToDocument(_initialPrefs.theme)
  applyUserFontScaleToDocument(_initialPrefs.fontScalePercent)

  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </React.StrictMode>,
  )
} catch (error) {
  showBootstrapError(error instanceof Error ? error.message : String(error))
}
