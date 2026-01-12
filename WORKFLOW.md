# 🔄 Workflow de Développement - Portfolio React Anthony Merault

Ce document décrit le workflow complet de développement, de la conception à la production, incluant toutes les intégrations et outils utilisés.

## 📋 Table des Matières

1. [Architecture du Projet](#architecture-du-projet)
2. [Workflow de Design (Figma)](#workflow-de-design-figma)
3. [Workflow de Développement (Cursor)](#workflow-de-développement-cursor)
4. [Workflow Git & GitHub](#workflow-git--github)
5. [Workflow de Déploiement (Vercel)](#workflow-de-déploiement-vercel)
6. [Intégrations API](#intégrations-api)
7. [MCP (Model Context Protocol)](#mcp-model-context-protocol)
8. [Librairies Principales](#librairies-principales)

---

## 🏗️ Architecture du Projet

### Structure des Dossiers

```
portfolio-react-anthony/
├── api/                    # API Routes Vercel (Serverless Functions)
│   ├── auth/              # Authentification dashboard
│   ├── google-auth/       # OAuth2 Google Analytics
│   └── strava/            # API Strava (proxy sécurisé)
├── src/
│   ├── components/        # Composants React
│   ├── services/         # Services API (Strava, Google Analytics, etc.)
│   ├── data/             # Données statiques (projets, etc.)
│   ├── styles/           # Styles globaux
│   └── utils/            # Utilitaires
├── public/              # Assets publics (images, modèles 3D)
├── figma-plugin/         # Plugin Figma pour export
└── vercel.json          # Configuration Vercel
```

### Technologies Principales

- **Frontend** : React 19 + TypeScript + Vite
- **Styling** : Tailwind CSS + CSS Modules
- **Animations** : Framer Motion + GSAP
- **3D** : React Three Fiber + Three.js
- **Graphiques** : Highcharts + Recharts + MUI X Charts
- **Backend** : Vercel Serverless Functions (Node.js)
- **Déploiement** : Vercel

---

## 🎨 Workflow de Design (Figma)

### 1. Conception dans Figma

1. **Créer le design** dans Figma
2. **Organiser les composants** en frames et variants
3. **Exporter les assets** nécessaires (SVG, PNG)

### 2. Export depuis Figma

#### Méthode 1 : Export Manuel
- Sélectionner l'élément dans Figma
- Clic droit → "Copy/Paste as" → "Copy as SVG" ou "Export"
- Coller dans le projet

#### Méthode 2 : Plugin Figma → Cursor (MCP)
- Utiliser le MCP Figma dans Cursor
- Sélectionner un élément dans Figma
- Dans Cursor, utiliser la commande MCP pour générer le code React

#### Méthode 3 : Assets Figma
- Exporter les assets depuis Figma
- Placer dans `public/figma-assets/` ou `src/assets/`
- Importer dans les composants React

### 3. Intégration dans le Code

```tsx
// Exemple d'import d'asset Figma
import figmaLogo from '../assets/figma-assets/logo.svg';

// Utilisation
<img src={figmaLogo} alt="Logo" />
```

### 4. Plugin Figma Personnalisé

Le projet contient un plugin Figma dans `figma-plugin/` :
- `manifest.json` : Configuration du plugin
- `code.js` : Logique du plugin
- `ui.html` : Interface utilisateur

**Utilisation** :
1. Ouvrir Figma
2. Plugins → Development → Import plugin from manifest
3. Sélectionner `figma-plugin/manifest.json`

---

## 💻 Workflow de Développement (Cursor)

### 1. Configuration Cursor

Cursor est l'IDE principal utilisé pour le développement. Il intègre :
- **IA intégrée** : Code completion et suggestions
- **MCP (Model Context Protocol)** : Intégration avec Figma, MUI, etc.
- **Git intégré** : Gestion des commits et push

### 2. Développement Local

```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement
npm run dev

# Build de production
npm run build
```

### 3. Utilisation de l'IA dans Cursor

- **Code completion** : Suggestions automatiques
- **Refactoring** : Amélioration du code via IA
- **Génération de composants** : Création rapide via prompts
- **Debugging** : Analyse des erreurs et suggestions de corrections

### 4. Intégration MCP dans Cursor

Voir section [MCP (Model Context Protocol)](#mcp-model-context-protocol)

---

## 🔀 Workflow Git & GitHub

### 1. Branches

- **`main`** : Branche de production (déployée automatiquement sur Vercel)
- **`develop`** : Branche de développement (optionnel)

### 2. Workflow de Commit

```bash
# Vérifier les changements
git status

# Ajouter les fichiers modifiés
git add .

# Commit avec message descriptif
git commit -m "feat: ajout fonctionnalité X"
# ou
git commit -m "fix: correction bug Y"
# ou
git commit -m "refactor: nettoyage code Z"

# Push vers GitHub
git push origin main
```

### 3. Convention de Commits

Utiliser le format [Conventional Commits](https://www.conventionalcommits.org/) :

- `feat:` : Nouvelle fonctionnalité
- `fix:` : Correction de bug
- `refactor:` : Refactoring du code
- `style:` : Changements de style (formatage, etc.)
- `docs:` : Documentation
- `chore:` : Tâches de maintenance
- `perf:` : Amélioration de performance
- `test:` : Ajout/modification de tests

### 4. GitHub Actions (si configuré)

Les actions GitHub peuvent être configurées pour :
- Tests automatiques
- Linting
- Build automatique
- Déploiement conditionnel

### 5. Protection de la Branche Main

- **Ne jamais commit de secrets** : Vérifier `.gitignore`
- **Code review** : Vérifier les changements avant merge
- **Tests** : S'assurer que le code fonctionne avant push

---

## 🚀 Workflow de Déploiement (Vercel)

### 1. Configuration Vercel

Le projet est connecté à Vercel via GitHub :
- **Déploiement automatique** : Chaque push sur `main` déclenche un déploiement
- **Preview deployments** : Les PR créent des previews automatiques

### 2. Variables d'Environnement

**⚠️ IMPORTANT** : Les variables d'environnement doivent être configurées dans Vercel :

1. Aller sur [vercel.com](https://vercel.com) → Votre projet
2. Settings → Environment Variables
3. Ajouter les variables nécessaires

#### Variables Client-Side (avec `VITE_`)

Ces variables sont exposées côté client (dans le bundle JavaScript) :

```env
VITE_GOOGLE_CLIENT_ID=...
VITE_GOOGLE_REDIRECT_URI=...
VITE_STRAVA_CLIENT_ID=...
VITE_GA_MEASUREMENT_ID=...
```

#### Variables Server-Side (sans `VITE_`)

Ces variables sont uniquement disponibles dans les API routes Vercel :

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_ACCESS_TOKEN=...
STRAVA_REFRESH_TOKEN=...
DASHBOARD_PASSWORD=...
DASHBOARD_EMAIL=...
```

### 3. Configuration `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ]
}
```

### 4. Déploiement

#### Déploiement Automatique

- Push sur `main` → Déploiement automatique
- Vérifier les logs dans Vercel Dashboard

#### Déploiement Manuel (CLI)

```bash
# Installer Vercel CLI
npm i -g vercel

# Login
vercel login

# Déployer
vercel

# Déployer en production
vercel --prod
```

### 5. Domaines Personnalisés

1. Vercel Dashboard → Project Settings → Domains
2. Ajouter le domaine (ex: `anthony-merault.fr`)
3. Configurer les DNS selon les instructions Vercel
4. Attendre la propagation DNS et le certificat SSL (automatique)

---

## 🔌 Intégrations API

### 1. Strava API

#### Architecture

```
Client (React) → /api/strava/* → Vercel Function → Strava API
```

Les tokens Strava sont gérés **uniquement côté serveur** pour la sécurité.

#### Endpoints Disponibles

- `GET /api/strava/athlete` : Informations de l'athlète
- `GET /api/strava/activities` : Liste des activités
- `GET /api/strava/activity-details?id=XXX` : Détails d'une activité
- `GET /api/strava/athlete/stats` : Statistiques de l'athlète

#### Configuration

Variables d'environnement Vercel (sans `VITE_`) :
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_ACCESS_TOKEN`
- `STRAVA_REFRESH_TOKEN`
- `STRAVA_TOKEN_EXPIRES_AT`

#### Refresh Automatique

Les tokens sont automatiquement rafraîchis par les API routes Vercel si nécessaire.

### 2. Google Analytics Data API

#### Architecture

```
Client (React) → OAuth2 Google → /api/google-auth/callback → Dashboard
```

#### Flux OAuth2

1. Utilisateur clique sur "Se connecter à Google Analytics"
2. Redirection vers Google OAuth2
3. Google redirige vers `/api/google-auth/callback` avec un code
4. Le callback échange le code contre un token
5. Redirection vers `/dashboard` avec les tokens dans l'URL
6. Les tokens sont sauvegardés dans `localStorage` et l'URL est nettoyée

#### Configuration

**Variables d'environnement Vercel** :

Client-side (avec `VITE_`) :
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_REDIRECT_URI`

Server-side (sans `VITE_`) :
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

**Google Cloud Console** :
- Créer un projet OAuth2
- Configurer les "Authorized JavaScript origins" : `https://anthony-merault.fr`
- Configurer les "Authorized redirect URIs" : `https://anthony-merault.fr/api/google-auth/callback`

#### Endpoints

- `GET /api/google-auth/callback` : Callback OAuth2
- `POST /api/google-auth/refresh` : Rafraîchir un token expiré

### 3. Google Analytics Tracking (react-ga4)

#### Configuration

Variable d'environnement (avec `VITE_`) :
- `VITE_GA_MEASUREMENT_ID=G-MS120551E9`

#### Utilisation

```typescript
import { initGA, trackPageView } from './services/googleAnalyticsTracking';

// Initialisation (dans main.tsx)
initGA();

// Tracking page view (dans App.tsx)
trackPageView('/dashboard', 'Dashboard');
```

### 4. Authentification Dashboard

#### Endpoint

- `POST /api/auth/login` : Authentification email/password

#### Configuration

Variables d'environnement Vercel (sans `VITE_`) :
- `DASHBOARD_EMAIL` : Email autorisé
- `DASHBOARD_PASSWORD` : Mot de passe

**⚠️ SÉCURITÉ** : Les identifiants ne doivent **JAMAIS** être hardcodés dans le code.

---

## 🤖 MCP (Model Context Protocol)

### 1. Qu'est-ce que MCP ?

Le Model Context Protocol permet à Cursor d'accéder à des ressources externes (documentation, APIs, outils) pour améliorer les suggestions de code.

### 2. MCP Configurés dans ce Projet

#### MUI MCP

**Configuration** : Voir `MCP_CONFIG.md`

Permet à Cursor d'accéder à la documentation MUI et aux exemples de code.

**Utilisation** :
- Cursor peut suggérer des composants MUI appropriés
- Accès à la documentation officielle MUI
- Exemples de code basés sur les meilleures pratiques MUI

#### Figma MCP (si configuré)

Permet de générer du code React depuis les designs Figma directement dans Cursor.

**Utilisation** :
1. Sélectionner un élément dans Figma
2. Dans Cursor, utiliser la commande MCP Figma
3. Le code React est généré automatiquement

### 3. Configuration MCP dans Cursor

1. Ouvrir Cursor Settings (`Cmd + ,` ou `Ctrl + ,`)
2. Aller dans "MCP" → "Add Server"
3. Ajouter la configuration du serveur MCP souhaité

### 4. Avantages

- **Documentation à jour** : Accès aux dernières versions
- **Code précis** : Suggestions basées sur la documentation officielle
- **Productivité** : Génération rapide de code depuis les designs

---

## 📚 Librairies Principales

### UI & Composants

- **@radix-ui/** : Primitives d'accessibilité (Dialog, Dropdown, etc.)
- **@mui/material** : Composants Material UI
- **@mui/x-charts** : Graphiques MUI
- **shadcn/ui** : Composants UI réutilisables
- **lucide-react** : Icônes

### Animations

- **framer-motion** : Animations React
- **gsap** : Animations avancées
- **@react-spring/web** : Animations physiques

### Graphiques & Visualisation

- **highcharts** : Graphiques avancés (DonutChartRace, etc.)
- **recharts** : Graphiques React
- **@mui/x-charts** : Graphiques MUI

### 3D

- **@react-three/fiber** : Rendu 3D React
- **@react-three/drei** : Helpers 3D
- **three** : Bibliothèque 3D

### Utilitaires

- **date-fns** : Manipulation de dates
- **clsx** : Gestion de classes CSS
- **class-variance-authority** : Variants de composants

### API & Tracking

- **react-ga4** : Google Analytics 4
- **@vercel/node** : API Routes Vercel

### Carousels & Navigation

- **swiper** : Carousels
- **react-router-dom** : Routing

---

## 🔒 Sécurité

### 1. Secrets & Variables d'Environnement

**⚠️ RÈGLE D'OR** : Ne jamais commiter de secrets dans Git.

#### Fichiers à Ignorer

Vérifier `.gitignore` :
- `.env*`
- `*_CREDENTIALS.txt`
- `*_SECRETS.txt`
- `GOOGLE_OAUTH_CREDENTIALS.txt`

#### Variables d'Environnement

- **Client-side** : Utiliser `VITE_` prefix (exposé dans le bundle)
- **Server-side** : Sans `VITE_` (uniquement dans API routes)

### 2. Tokens & API Keys

- **Strava** : Gérés uniquement côté serveur
- **Google OAuth2** : Client Secret uniquement côté serveur
- **Dashboard** : Mot de passe uniquement côté serveur

### 3. CORS

Les API routes Vercel incluent des headers CORS appropriés :
```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
```

### 4. Validation

- Validation des inputs utilisateur
- Gestion des erreurs appropriée
- Logs d'erreur sans exposer de secrets

---

## 📝 Documentation du Code

### 1. Commentaires JSDoc

Toutes les fonctions importantes doivent avoir des commentaires JSDoc :

```typescript
/**
 * Récupère les données de l'athlète Strava
 * @returns Promise avec les données de l'athlète
 * @throws {Error} Si les variables d'environnement ne sont pas configurées
 */
export async function getStravaAthlete(): Promise<StravaAthlete> {
  // ...
}
```

### 2. Commentaires Inline

- Expliquer le "pourquoi", pas le "comment"
- Documenter les décisions architecturales
- Indiquer les limitations ou TODOs

### 3. README.md

Le `README.md` principal contient :
- Description du projet
- Instructions d'installation
- Guide de configuration
- Liste des technologies

### 4. Documentation Spécialisée

- `WORKFLOW.md` : Ce fichier (workflow complet)
- `GOOGLE_ANALYTICS_SETUP.md` : Configuration Google Analytics
- `VERCEL_STRAVA_SETUP.md` : Configuration Strava
- `MCP_CONFIG.md` : Configuration MCP

---

## 🐛 Debugging

### 1. Logs de Développement

Les logs sont désactivés en production. Utiliser `debugLog()` :

```typescript
const debugLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};
```

### 2. Vercel Logs

- Vercel Dashboard → Project → Deployments → Logs
- Vérifier les erreurs dans les API routes

### 3. Console Browser

- Ouvrir DevTools (F12)
- Vérifier les erreurs JavaScript
- Vérifier les appels API dans Network tab

### 4. Variables d'Environnement

Vérifier que les variables sont bien configurées :
- Vercel Dashboard → Settings → Environment Variables
- Local : `.env.local` (non commité)

---

## ✅ Checklist de Déploiement

Avant de déployer en production :

- [ ] Tous les secrets sont dans les variables d'environnement Vercel
- [ ] Aucun secret hardcodé dans le code
- [ ] `.gitignore` est à jour
- [ ] Les tests passent (si configurés)
- [ ] Le build fonctionne (`npm run build`)
- [ ] Les variables d'environnement sont configurées dans Vercel
- [ ] Les domaines personnalisés sont configurés
- [ ] Les certificats SSL sont valides
- [ ] La documentation est à jour

---

## 📞 Support & Ressources

### Documentation Officielle

- [Vercel Docs](https://vercel.com/docs)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Vite Docs](https://vitejs.dev)

### APIs

- [Strava API Docs](https://developers.strava.com)
- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Google OAuth2](https://developers.google.com/identity/protocols/oauth2)

### Outils

- [Figma](https://www.figma.com)
- [Cursor](https://cursor.sh)
- [GitHub](https://github.com)
- [Vercel](https://vercel.com)

---

**Dernière mise à jour** : Janvier 2025
