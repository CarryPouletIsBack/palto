import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** `vercel dev` doit détecter un port fixe (évite le timeout « Detecting port … »). */
const vercelDev = process.env.VERCEL === '1'

export default defineConfig({
  /** Routes SPA (/go, /fr/…) : évite un index vide si le navigateur demande un chemin hors racine. */
  appType: 'spa',
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      /** Manifest déjà servi depuis `public/manifest.json` (icônes, standalone). */
      manifest: false,
      includeAssets: ['manifest.json', 'images/palto-app-icon.svg', 'images/palto-og.svg'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        /** Contourne le crash terser en build (Vercel / CI) ; le SW reste fonctionnel. */
        mode: 'development',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,svg,png,webp,woff2,json,webmanifest}'],
        /** Bundle principal > 2 Mo ; image OG souvent lourde — hors precache SW. */
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globIgnores: ['**/og-image.png', '**/og-image.jpg', '**/og-image.webp'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        /** Pas de cache des tuiles cartographiques ici (CGU / volume) : le SW sert surtout le shell JS/CSS pour un 2e chargement instantané. */
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/maplibre-gl')) return 'maplibre-gl'
          if (id.includes('node_modules/react-map-gl')) return 'react-map-gl'
          if (id.includes('node_modules/framer-motion')) return 'framer-motion'
          if (id.includes('node_modules/@supabase/')) return 'supabase'
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: vercelDev,
    /** Ouvre le navigateur sur l’URL réelle (important si 5173 est déjà pris : Vite passe à 5174, 5175…). */
    open: !vercelDev,
    host: vercelDev ? false : true, // réseau local hors vercel dev (détection de port Vercel)
    watch: {
      usePolling: true, // Nécessaire sur Windows pour que les modifs soient détectées sans redémarrer
    },
    proxy: {
      // Rediriger toutes les requêtes API vers Vercel dev (port 3000 par défaut)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
