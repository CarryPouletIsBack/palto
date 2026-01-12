import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initGA } from './services/googleAnalyticsTracking'
import './styles/globals.css'
import './index.css'

// Initialiser Google Analytics au démarrage
initGA()

try {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} catch (error) {
  const rootElement = document.getElementById('root')
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>Erreur de chargement</h1>
        <p>${error instanceof Error ? error.message : String(error)}</p>
      </div>
    `
  }
}
