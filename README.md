# Portfolio React - Anthony Merault

Portfolio personnel créé avec React, TypeScript et Vite, présentant une collection de projets de design et développement web.

## 🚀 Fonctionnalités

### Navigation & Pages
- **Navigation complète** entre les pages (Accueil, Menu, À propos, Projets)
- **Design responsive** adapté mobile et desktop
- **Page d'accueil** avec hero section, carousel de projets et cartes d'information
- **Page menu** avec recherche et filtrage en temps réel par catégories
- **Page à propos** avec intégration Strava en temps réel (profil, activités, performance, entraînement)
- **Pages projets individuelles** structurées en sections professionnelles

### Intégration Strava
- **Données Strava en temps réel** : Profil athlète, activités, statistiques
- **Architecture sécurisée** : Appels API via endpoints Vercel (tokens gérés côté serveur)
- **Cache intelligent** : Système de cache localStorage (5 minutes) pour limiter les appels API
- **Graphiques de performance** : Graphique radar et journal d'entraînement (arrêt à la dernière activité)
- **Header dynamique** : Nom et prénom récupérés depuis Strava API avec skeleton de chargement
- **Photo de profil** : Photo de profil Strava affichée dans le header au lieu du logo (fallback logo SVG)
- **Limitation des appels API** : Réduction automatique des requêtes grâce au cache
- **Gestion des tokens** : Refresh automatique des tokens côté serveur via Vercel Functions

### Composants & Animations
- **Composants réutilisables** (Button, ProjectItem, HoverCard, etc.)
- **Animations fluides** avec Framer Motion et CSS
- **Barre de recherche** avec placeholder animé et suggestions
- **Search bar mobile** avec dégradé et résultats en grille
- **Effets visuels** (Magic Bento, BlurText, GradientText, ShinyText)
- **Background dynamique** qui change selon la page active
- **Loading states** avec skeletons
- **Modal de projet** avec animation slide-up/down

### Design & UX
- **Typographie** : Polices Space Grotesk, Sora, DM Mono, Inter
- **Couleurs** : Thème sombre avec accents orange
- **Animations** : Transitions fluides et effets de hover
- **Responsive** : Adaptation mobile avec aspect ratio optimisé
- **Accessibilité** : Contraste et navigation au clavier, attributs alt appropriés

## 🛠️ Technologies

- **React 19** avec TypeScript
- **Vite** pour le build et le dev server
- **Tailwind CSS** pour les utilities
- **Framer Motion** pour les animations
- **CSS personnalisé** pour le styling des composants
- **GSAP** pour les animations avancées
- **React Router DOM** pour la navigation
- **Swiper.js** pour les carousels
- **Shadcn/ui** pour les composants UI (file-tree, scroll-area, button)
- **Radix UI** pour les primitives d'accessibilité
- **React Three Fiber** pour le rendu 3D
- **Three.js** pour la manipulation de modèles 3D et nuages de points
- **Strava API** pour l'intégration des données sportives
- **Recharts** pour les graphiques de performance Strava
- **MUI X Charts** pour les visualisations de données
- **Vercel API Routes** pour les endpoints serveur (optionnel)

## 📱 Pages

1. **Accueil** (`/`) - Page principale avec hero section, titre fixe en bas, carousel de projets et cartes d'information
2. **Menu** (`/menu`) - Liste de tous les projets avec recherche et filtrage par catégories
3. **À propos** (`/about`) - Parcours professionnel, compétences, expériences et formations
4. **Projet** (`/project/:id`) - Page détaillée d'un projet avec 9 sections structurées

## 🎯 Composants Principaux

### Composants de Layout
- `Header` - Navigation avec photo de profil Strava dynamique, nom/prénom depuis Strava API, menu et search bar desktop
- `Background` - Gestion du background image dynamique
- `MobileSearchBar` - Barre de recherche mobile avec dégradé, résultats en grille carrée et overlay

### Composants de Pages
- `Hero` - Page d'accueil avec projets récents et cartes d'information
- `Menu` - Grille de projets par catégories avec filtrage
- `About` - Parcours professionnel et formations
- `AboutNew` - Page à propos améliorée avec navigation par sections et modèle 3D
- `SingleProjectNew` - Page projet structurée en sections

### Composants UI Réutilisables
- `Button` - Boutons avec variants (primary/secondary) et mode icon
- `ProjectItem` - Carte projet avec détection de couleur automatique
- `HoverCard` - Effet de hover avec suivi de souris
- `MagicBento` - Effet de bordure animée au hover
- `ShinyText` - Animation de texte brillant
- `GradientText` - Texte avec dégradé animé
- `DecryptedText` - Effet de texte décrypté
- `AnimatedContent` - Animations au scroll
- `BlurText` - Effet de blur progressif sur le texte
- `Skeleton` - Loading states
- `ProgressiveBlur` - Effet de blur progressif en bas de page
- `Tree`, `Folder`, `File` - Composants file-tree pour afficher les wireframes
- `HumanBody3D` - Modèle 3D en nuage de points avec React Three Fiber

## 📊 Architecture du Projet

### Structure des Données
Toutes les données sont centralisées dans `/src/data/` :
- **`menuCategories.ts`** - Catégories et projets du menu (Navigation, Application, Site web, Logo, Motion, PLV)
- **`aboutData.ts`** - Données de la page À propos (stats, compétences, expériences, formations)
- **`projectsNew.ts`** - Données détaillées des projets avec structure en sections

### Structure de Page Projet
1. **Titre principal** - Avec badges et sous-titre (effet BlurText)
2. **Sommaire** - Navigation horizontale scrollable, fixe en haut lors du scroll
3. **Résumé / Introduction** - Synopsis du projet
4. **L'équipe projet** - Présentation des membres de l'équipe (carousel)
5. **Contexte & Démarche** - Besoin client, enjeux, recherche UX, veille, tests
6. **Processus détaillé** - Case study avec processus de design détaillé (recherche, veille, idéation, tests)
7. **Idéation & Solutions testées** - Prototypes et architecture (avec file-tree)
8. **Design System** - Palette colorimétrique et typographie (tableau typographie masqué)
9. **Implémentation & Technologies** - Stack technique
10. **Résultats & Impact** - Métriques avec Donut Chart Race animés et retours

## ✨ Fonctionnalités Récentes

### Page AboutNew
- **Navigation par sections** : Menu de navigation avec 3 sections (Introduction, Description, Arbre de compétences)
- **Modèle 3D en nuage de points** : Affichage d'un modèle 3D humain converti en nuage de points dans la section Introduction
- **Layout 3 colonnes** : Structure en 3 colonnes avec le modèle 3D centré dans la colonne du milieu
  - **Desktop** : Grid layout avec `grid-template-columns: 1fr auto 1fr` (colonnes gauche/droite flexibles, centre auto)
  - **Tablette/Mobile (≤1024px)** : Passage en layout vertical avec ordre : Colonne gauche → Modèle 3D → Colonne droite
  - **Gestion de largeur** : Les colonnes s'adaptent automatiquement avec `width: 100%` et `box-sizing: border-box`
  - **Cartes Strava** : Largeur adaptative avec surcharge de la largeur fixe (508px → 100%)
- **Navigation fluide** : Scroll automatique vers les sections avec état actif des boutons
- **Responsive** : Adaptation mobile avec ajustements de positionnement du modèle 3D
- **OrbitControls** : Rotation automatique et contrôles interactifs du modèle 3D
- **Chargement OBJ** : Support des modèles 3D au format OBJ avec conversion en nuage de points
- **Intégration Strava** : 4 cartes affichant les données Strava en temps réel :
  - **Profil** : Informations personnelles de l'athlète (nom, ville, poids)
  - **Performance** : Graphique radar avec total kilométrique 2025
  - **Entraînement** : Journal d'entraînement avec graphique d'évolution
  - **Activités** : Liste des 5 dernières activités avec détails (carousel Swiper)
- **Système de cache** : Cache localStorage de 5 minutes pour limiter les appels API Strava

### Page d'Accueil
- **Layout 2 colonnes** : Titre principal à gauche (fixe en bas), cartes à droite
- **Titre fixe** : Positionné à 16px du bas de l'écran sur desktop
- **Cartes modernes** : Infos, Projet (carousel), Services
- **Carousel Swiper.js** : Affichage des projets avec pagination
- **Scroll vertical** : Colonne de droite avec scroll indépendant sur desktop
- **Pas de scroll vertical** : Page d'accueil sans scroll sur desktop (sauf mobile)

### Search Bar
- **Affichage sur tous les devices** : Visible sur mobile et desktop
- **Largeur réduite** : 50% de la largeur par défaut sur desktop
- **Largeur complète** : 100% quand active sur desktop
- **Positionnement optimisé** : Centrée verticalement et alignée à droite dans le header
- **Effet blur** : Backdrop-filter blur(40px) quand active avec overlay noir à 5%
- **Z-index élevé** : Search bar active passe devant tous les éléments (z-index: 10000)
- **Miniatures carrées** : Thumbnails avec bords arrondis (border-radius: 12px) au lieu de cercle
- **Miniatures agrandies** : Résultats plus grands sur desktop
- **Responsive** : Adaptation mobile avec largeur 100% et positionnement relatif dans le header

### Single Project
- **Effet BlurText** : Animation de blur progressif sur le titre principal
- **Sommaire (Table of Contents)** : Navigation horizontale scrollable avec liens vers toutes les sections
- **Sommaire sticky** : Le sommaire reste fixe en haut de la page lors du scroll (implémenté avec JavaScript)
- **ProgressiveBlur** : Effet de blur en bas de page qui suit le scroll
- **File Tree** : Affichage des wireframes avec composant file-tree
- **Support vidéo** : Affichage de vidéos en couverture (ex: Mp audio)
- **Tableaux scrollables** : Scroll horizontal pour les tableaux de couleurs
- **Responsive mobile** : Paragraphes en pleine largeur avec text-align: left sur mobile
- **Sections organisées** : Sections professionnelles avec espacement optimisé
- **Carousel équipe** : Présentation des membres de l'équipe avec Swiper.js
- **Section "Processus détaillé"** : Nouvelle section avec contenu structuré pour les projets (Case Study)
- **Section "Idéation & Solutions testées"** : Remplacement de "Wireframes & Maquettes" par ce nouveau titre
- **Donut Chart Race** : Graphiques en donut animés dans la section "Résultats & Impact" avec effet "race" séquentiel
- **Padding-bottom** : Ajout d'un padding-bottom de 160px sur desktop (64px sur mobile) pour améliorer l'espacement
- **Masquage tableau typographie** : Tableau des typographies masqué, seul l'alphabet reste visible

## 🧹 Code Propre et Optimisé

### Qualité du Code
- **CSS** : Classes organisées, commentaires utiles uniquement
- **TypeScript** : Types stricts, aucune erreur de compilation
- **JavaScript** : Aucun console.log de debug, imports optimisés (pas d'imports React inutiles)
- **React** : Utilisation des types React modernes (`FC`, `MouseEvent`, etc.) sans imports React inutiles (React 17+)
- **Accessibilité** : Attributs alt, éléments interactifs accessibles
- **Performance** : Build optimisé, pas d'erreurs de linting
- **Build** : Toutes les erreurs TypeScript corrigées, build Vercel fonctionnel
- **Code propre** : Nettoyage complet effectué (janvier 2025) - imports inutiles supprimés, variables non utilisées nettoyées, console.log de debug supprimés

### Structure Sémantique
- Balises HTML appropriées (`<header>`, `<section>`, `<footer>`)
- Hiérarchie des titres correcte (`<h1>`, `<h2>`, `<h3>`)
- Éléments interactifs accessibles (`<button>` au lieu de `<div onClick>`)
- Attributs d'accessibilité (`aria-label`, `alt` descriptifs)

## 🚀 Installation et Lancement

```bash
# Installation des dépendances
npm install

# Configuration des variables d'environnement
# Créez un fichier .env.local à la racine :
# Pour le développement local avec Vercel CLI (recommandé)
STRAVA_CLIENT_ID=votre_client_id
STRAVA_CLIENT_SECRET=votre_client_secret
STRAVA_ACCESS_TOKEN=votre_access_token
STRAVA_REFRESH_TOKEN=votre_refresh_token
STRAVA_TOKEN_EXPIRES_AT=timestamp_unix_expiration

# Lancement en développement
# Option 1: Avec Vercel CLI (pour tester les API routes)
vercel dev

# Option 2: Avec Vite uniquement (frontend seulement)
npm run dev

# Build de production
npm run build

# Prévisualisation du build
npm run preview
```

### Intégration Strava

Le projet intègre l'API Strava pour afficher vos données sportives via des **endpoints API Vercel sécurisés**.

**Architecture :**
```
Browser → /api/strava/* → Vercel Server (ajoute Bearer token) → Strava API → Données ✅
```

**Avantages de cette architecture :**
- ✅ Tokens gérés côté serveur (pas d'exposition dans le code client)
- ✅ Refresh automatique des tokens expirés
- ✅ Protection contre les erreurs CORS
- ✅ Meilleure sécurité et respect des limites de taux

**Configuration en développement :**
1. Installez Vercel CLI : `npm install -g vercel`
2. Obtenez vos tokens Strava via votre projet Node.js (`C:\Users\Anthony\strava-api-client`)
3. Créez un fichier `.env.local` avec les variables **sans** le préfixe `VITE_` :
   ```env
   STRAVA_CLIENT_ID=votre_client_id
   STRAVA_CLIENT_SECRET=votre_client_secret
   STRAVA_ACCESS_TOKEN=votre_access_token
   STRAVA_REFRESH_TOKEN=votre_refresh_token
   STRAVA_TOKEN_EXPIRES_AT=timestamp_unix_expiration
   ```
4. Lancez avec `vercel dev` (les variables seront téléchargées automatiquement)

**Configuration en production (Vercel) :**
1. Allez sur [vercel.com](https://vercel.com) → Votre projet → **Settings** → **Environment Variables**
2. Ajoutez les 5 variables **SANS** le préfixe `VITE_` (pour les API routes) :
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_ACCESS_TOKEN`
   - `STRAVA_REFRESH_TOKEN`
   - `STRAVA_TOKEN_EXPIRES_AT`
3. Cochez **Production** (et optionnellement Preview/Development)
4. Redéployez votre projet après avoir ajouté les variables

⚠️ **Important** : 
- Utilisez les variables **SANS** `VITE_` pour les API routes Vercel (plus sécurisé)
- Les tokens Strava expirent après 6 heures, mais sont **automatiquement rafraîchis** par les endpoints API
- Le refresh automatique utilise votre `STRAVA_REFRESH_TOKEN` (qui expire rarement)
- Vous n'avez normalement **PAS besoin** de mettre à jour manuellement les tokens dans Vercel

**Endpoints API disponibles :**
- `GET /api/strava/athlete` - Informations de l'athlète
- `GET /api/strava/activities` - Liste des activités (avec pagination et filtres)
- `GET /api/strava/activities/:id` - Détails d'une activité
- `GET /api/strava/athlete/stats?athlete_id=XXX` - Statistiques de l'athlète

**Système de cache :**
- Cache localStorage de 5 minutes pour limiter les appels API
- Réduction automatique des requêtes Strava
- Meilleures performances et respect des limites de taux

**Fonctionnalités :**
- Affichage du profil athlète
- 5 dernières activités avec détails
- Activités 2025 avec statistiques
- Graphiques de performance (radar, journal d'entraînement)

Voir [STRAVA_TOKEN_MANAGEMENT.md](./STRAVA_TOKEN_MANAGEMENT.md), [VERCEL_STRAVA_SETUP.md](./VERCEL_STRAVA_SETUP.md) et [VERCEL_ENV_VARS.md](./VERCEL_ENV_VARS.md) pour plus de détails.

## 📂 Structure du Projet

```
src/
├── components/              # Composants React
│   ├── Header.tsx          # Navigation principale
│   ├── Background.tsx     # Background dynamique
│   ├── Hero.tsx            # Page d'accueil
│   ├── Menu.tsx            # Page menu avec recherche
│   ├── About.tsx           # Page à propos
│   ├── AboutNew.tsx        # Page à propos améliorée avec navigation et 3D
│   ├── HumanBody3D.tsx    # Composant 3D avec nuage de points
│   ├── MobileSearchBar.tsx # Search bar mobile
│   ├── SingleProjectNew.tsx # Page projet (sections)
│   ├── ProjectItem.tsx     # Carte projet réutilisable
│   ├── Button.tsx          # Bouton réutilisable
│   ├── ui/                 # Composants UI (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── scroll-area.tsx
│   │   └── file-tree.tsx
│   └── ... (autres composants)
├── data/                   # Données centralisées
│   ├── projectsNew.ts      # Projets (structure sections)
│   ├── menuCategories.ts   # Catégories et projets menu
│   ├── aboutData.ts        # Données page À propos
│   └── flowData.ts         # Données pour l'arbre de compétences
├── services/               # Services API
│   └── stravaService.ts    # Service Strava avec cache
├── lib/                    # Utilitaires
│   └── utils.ts            # Fonction cn() pour Tailwind
├── api/                    # Routes API Vercel (Serverless Functions)
│   └── strava/             # Endpoints Strava sécurisés
│       ├── athlete.ts      # GET /api/strava/athlete
│       ├── activities.ts   # GET /api/strava/activities
│       ├── activities/[id]/index.ts  # GET /api/strava/activities/:id
│       ├── athlete/stats.ts # GET /api/strava/athlete/stats
│       └── utils.ts        # Utilitaires (refresh token, gestion tokens)
├── App.tsx                 # Composant racine
├── main.tsx               # Point d'entrée
└── index.css              # Styles globaux + Tailwind
```

## 🎨 Personnalisation

### Couleurs
- Orange principal : `#FF6B35`
- Texte sombre : `#222`
- Fond sombre : `#0a0a0a`
- Fond accueil : `#509ED8` (bleu ciel)

### Typographie
- Titres : `Space Grotesk`
- Corps : `Inter`
- Monospace : `DM Mono`
- Projets : `Sora`

### Animations
- Durée standard : `0.3s ease`
- Effets de bounce pour les entrées
- Transitions fluides entre les pages

## 📝 Notes de Développement

- **Architecture basée sur les données** : Séparation claire données/logique
- **Composants modulaires** pour faciliter la maintenance
- **Tailwind CSS** utilisé pour les utilities (avec CSS custom pour les composants)
- **Deux roots React** : un pour le background, un pour l'application
- **TypeScript strict** avec `verbatimModuleSyntax` activé
- **Tableaux HTML natifs** pour garantir le scroll horizontal
- **Code propre et optimisé** : Nettoyage complet de tous les fichiers
- **Menu temporairement masqué** : Le menu redirige vers l'accueil (code commenté pour réactivation future)

## 🎯 Fonctionnalités Clés

### Responsive Design
- **Mobile** : Layout vertical, scroll vertical activé
- **Desktop** : Layout 2 colonnes, pas de scroll vertical sur la page d'accueil
- **Tablette** : Adaptation intermédiaire

### Animations
- **BlurText** : Effet de blur progressif sur le texte
- **ProgressiveBlur** : Blur en bas de page qui suit le scroll
- **Framer Motion** : Animations fluides et performantes
- **GSAP** : Animations avancées pour les effets complexes

### Accessibilité
- Navigation au clavier
- Attributs ARIA appropriés
- Contraste de couleurs respecté
- Labels descriptifs

## 🏃 Intégration Strava

### Architecture Sécurisée
Le projet utilise des **endpoints API Vercel** pour tous les appels Strava :
- ✅ Tokens gérés côté serveur (jamais exposés dans le code client)
- ✅ Refresh automatique des tokens expirés
- ✅ Protection contre les erreurs CORS et 401
- ✅ Meilleure sécurité et gestion des secrets

**Flow des données :**
```
React Component → /api/strava/athlete → Vercel Function (ajoute token) → Strava API → Données
```

### Fonctionnalités
- **Données en temps réel** : Profil, activités, statistiques depuis l'API Strava
- **Cache intelligent** : Système de cache localStorage (5 minutes) pour limiter les appels API
- **Graphiques de performance** : Graphique radar et journal d'entraînement avec Recharts
- **Gestion des tokens** : Refresh automatique côté serveur via Vercel Functions

### Configuration
1. Obtenez vos tokens Strava (voir [STRAVA_TOKEN_MANAGEMENT.md](./STRAVA_TOKEN_MANAGEMENT.md))
2. **En développement** : Créez un fichier `.env.local` avec les variables **SANS** `VITE_` :
   ```env
   STRAVA_CLIENT_ID=votre_client_id
   STRAVA_ACCESS_TOKEN=votre_access_token
   # ... etc
   ```
3. Lancez avec `vercel dev` (les API routes fonctionneront)
4. **En production** : Configurez les variables dans Vercel (voir [VERCEL_ENV_VARS.md](./VERCEL_ENV_VARS.md))

### Endpoints API Disponibles
- `GET /api/strava/athlete` - Informations de l'athlète
- `GET /api/strava/activities?page=1&per_page=10` - Liste des activités
- `GET /api/strava/activities/:id` - Détails d'une activité
- `GET /api/strava/athlete/stats?athlete_id=XXX` - Statistiques de l'athlète

### Refresh Automatique des Tokens

**🎉 Bonne nouvelle :** Les tokens sont automatiquement rafraîchis par les endpoints API Vercel !

**Comment ça fonctionne :**
1. Quand un appel API est fait et que le token est expiré (vérifié avec `STRAVA_TOKEN_EXPIRES_AT`)
2. L'endpoint utilise automatiquement le `STRAVA_REFRESH_TOKEN` pour obtenir un nouveau token
3. Le nouveau token est utilisé pour l'appel Strava
4. ✅ **Aucune manipulation manuelle nécessaire !**

**⚠️ Note importante :**
- Le refresh automatique fonctionne tant que votre `STRAVA_REFRESH_TOKEN` est valide (il expire très rarement)
- Les nouveaux tokens rafraîchis ne sont **pas** automatiquement sauvegardés dans Vercel (mais ça n'empêche pas le fonctionnement)
- Si vous voulez mettre à jour les tokens dans Vercel manuellement, utilisez votre script `strava-api-client` pour obtenir les nouveaux tokens, puis mettez-les à jour dans Vercel

### Cache et Performance
- **Cache localStorage** : 5 minutes pour les activités, athlète et activités 2025
- **Réduction des appels API** : Limite automatique des requêtes Strava
- **Respect des limites** : Prévention des erreurs 429 (Too Many Requests)

## 🔧 Corrections Récentes (Janvier 2025)

### Header avec Intégration Strava Dynamique
- ✅ **Photo de profil Strava** : Photo de profil affichée dans le header au lieu du logo SVG (object-fit: cover)
- ✅ **Nom et prénom dynamiques** : Récupération depuis Strava API avec `getStravaAthlete()`
- ✅ **Skeleton de chargement** : Skeleton animé pendant le chargement des données Strava (nom et photo)
- ✅ **Fallback** : Logo SVG et nom "Anthony Merault" affichés si pas de données Strava disponibles
- ✅ **Balise sémantique** : Nom/prénom dans une balise `<p>` au lieu de `<h1>` pour meilleure structure HTML

### Corrections Search Bar Mobile
- ✅ **Positionnement corrigé** : Search bar correctement intégrée dans le header (position: relative au lieu de fixed)
- ✅ **Centrage vertical** : Alignement vertical centré dans le header (align-items: center)
- ✅ **Alignement à droite** : Search bar alignée à droite avec justify-content: flex-end
- ✅ **Effet blur restauré** : Backdrop-filter blur fonctionnel avec isolation: auto
- ✅ **Overlay noir** : Overlay noir à 5% d'opacité sur la search bar active (rgba(0, 0, 0, 0.05))
- ✅ **Z-index optimisé** : Search bar active (z-index: 10000) passe devant tous les éléments (boutons menu z-index: 99)
- ✅ **Header fixe** : Header reste en position: fixed même quand search bar active pour maintenir le contexte de stacking
- ✅ **Projets en carré** : Miniatures des projets dans la search bar avec forme carrée et bords arrondis (border-radius: 12px)

### Corrections Graphiques Strava
- ✅ **Graphique d'entraînement** : Le graphique Spline s'arrête maintenant à la dernière activité (suppression de l'intervalle qui ajoutait des points continuellement)
- ✅ **Données réelles uniquement** : Affichage uniquement des activités réelles sans simulation de données futures

### Nettoyage du Code (Janvier 2025)
- ✅ **Suppression des imports React inutiles** : Nettoyage complet de tous les imports `React` inutiles (React 17+ n'en a plus besoin pour JSX)
- ✅ **Correction des types React** : Remplacement de `React.FC`, `React.MouseEvent`, `React.TouchEvent`, `React.CSSProperties` par les types importés directement (`FC`, `MouseEvent`, `TouchEvent`, `CSSProperties`)
- ✅ **Remplacement de React.ReactNode** : Utilisation de `ReactNode` importé de 'react' au lieu de `React.ReactNode`
- ✅ **Suppression des console.log/warn/error** : Nettoyage de tous les `console.log` de debug dans les composants (conservés uniquement dans les services si nécessaire)
- ✅ **Suppression des variables inutilisées** : Nettoyage de toutes les variables non utilisées (`stravaActivities`, `_searchTerm`, `_prev`, `_animateOpacity`, etc.)
- ✅ **Suppression des lignes vides inutiles** : Nettoyage des espaces et lignes vides superflues
- ✅ **Tous les fichiers passent le linting** : Aucune erreur de linting dans tout le projet

### Corrections de Build Vercel (Janvier 2025)
- ✅ **Fichiers manquants ajoutés** : Ajout de `StravaRadialBarChart.tsx` et `StravaSonifiedChart.tsx` qui étaient manquants
- ✅ **Correction des imports React dans les graphiques** : Remplacement de `React.FC` par `FC` dans tous les composants Strava
- ✅ **Import dynamique conditionnel pour stravaMockData** : Remplacement de l'import statique par un import dynamique conditionnel pour éviter les erreurs de build en production
- ✅ **Ajout de stravaMockData.ts au commit** : Fichier mock ajouté au dépôt pour permettre à Rollup de le résoudre lors du build (jamais utilisé en production)
- ✅ **Build Vercel fonctionnel** : Tous les problèmes de build résolus, le projet se build correctement sur Vercel

### Architecture Strava Corrigée et Opérationnelle (Janvier 2025)
- ✅ **Migration vers endpoints API Vercel** : Tous les appels Strava passent maintenant par des endpoints serveur sécurisés
- ✅ **Sécurité renforcée** : Tokens gérés côté serveur, jamais exposés dans le code client
- ✅ **Correction des erreurs 401** : Plus d'appels directs depuis le navigateur vers Strava API
- ✅ **Nouvel endpoint créé** : `/api/strava/athlete/stats` pour les statistiques de l'athlète
- ✅ **Variables d'environnement** : Utilisation des variables sans préfixe `VITE_` pour les API routes
- ✅ **Gestion automatique des tokens** : Refresh automatique des tokens expirés côté serveur
- ✅ **Corrections techniques** :
  - Correction de l'erreur `ERR_MODULE_NOT_FOUND` (ajout des extensions `.js` dans les imports)
  - Correction de l'erreur `body stream already read` (utilisation de `response.clone()`)
  - Amélioration des messages d'erreur avec diagnostics détaillés
- ✅ **Documentation mise à jour** : README et guides mis à jour avec la nouvelle architecture

### Refresh Automatique des Tokens

**Bonne nouvelle :** Les tokens sont automatiquement rafraîchis par les endpoints API Vercel ! 🎉

Quand un token expire :
1. L'endpoint API détecte que le token est expiré (vérification avec `STRAVA_TOKEN_EXPIRES_AT`)
2. Il utilise automatiquement le `STRAVA_REFRESH_TOKEN` pour obtenir un nouveau token
3. Le nouveau token est utilisé pour l'appel Strava

**⚠️ Important :** Les nouveaux tokens rafraîchis ne sont PAS automatiquement sauvegardés dans Vercel. Pour une solution complètement automatique à long terme, vous pouvez :
- Utiliser **Vercel KV** pour stocker les tokens dynamiquement
- Créer un endpoint `/api/refresh-token` qui met à jour les variables Vercel via l'API
- Ou simplement mettre à jour manuellement les tokens dans Vercel tous les quelques jours si nécessaire

**Note :** Le refresh automatique fonctionne tant que le `STRAVA_REFRESH_TOKEN` est valide (il expire rarement, contrairement à l'access token qui expire toutes les 6 heures).

### Ajustements CSS Page AboutNew

### Ajustements CSS Page AboutNew
- ✅ Ajustement des espacements dans le layout 3 colonnes :
  - `gap` du conteneur `.intro-columns-container` : `24px` → `0px`
  - `margin-bottom` des colonnes `.intro-column-left/right` : `16px` → `0px`
- ✅ Alignement des colonnes :
  - Ajout de `justify-content: flex-start` sur `.intro-column`
  - Ajout de `align-items: center` sur `.intro-column`
- ✅ Optimisation des cartes Strava (`.hero-card.services-card`) :
  - `gap` : `16px` → `0px`
  - `margin-bottom` : `0px` → `12px`
  - `padding-top` et `padding-bottom` : `11px` → `12px`

### Modifications Page d'accueil (Hero) - Janvier 2025
- ✅ **Refactorisation de l'architecture CSS** : 
  - Gestion de la classe `accueil-page` directement sur le `body` (comme `menu-active`)
  - Simplification de la classe `page active accueil-page` en `page active`
  - Détection de la page d'accueil via `body.classList.contains('accueil-page')` dans GridPattern et Background
- ✅ **Page d'accueil scrollable avec titre fixe** :
  - Toute la page d'accueil est maintenant scrollable (scroll vertical activé sur `body.accueil-page`)
  - Titre H1 fixe en position `sticky` à gauche de la colonne (reste visible lors du scroll)
  - Suppression des limitations de hauteur (`max-height`) qui causaient l'enveloppement du contenu
  - Colonne de droite suit le scroll de la page entière (plus de scroll indépendant)
- ✅ **Correction de l'overflow visible** :
  - Correction des règles CSS pour permettre `overflow: visible` sur `.hero-main` et `.main-accueil`
  - Modification de tous les parents (`.page.active`, `.container`, `body.accueil-page`) pour permettre l'overflow visible uniquement sur la page d'accueil
  - Protection des autres pages (AboutNew, SingleProject) avec `:not(.single-project-page)`
- ✅ **Améliorations UI** :
  - Mise à jour du favicon pour utiliser le logo du header (`/images/logo.svg`)
  - Style de la carte Footer identique à la carte Infos (même padding, gap, animation-delay)
  - Intégration du bouton "About New" dans la flèche de la carte Infos (suppression du bouton séparé)
- ✅ **Effet BlurText global sur tous les titres** :
  - Animation CSS automatique appliquée à tous les titres H1, H2, H3, H4, H5, H6
  - Effet de blur progressif lors de l'apparition (blur(8px) → blur(0px))
  - Délais progressifs pour les titres imbriqués (h2: +0.1s, h3: +0.2s, etc.)
  - Durée d'animation : 0.8s avec transition ease-out

- ✅ Correction de toutes les erreurs TypeScript du build
- ✅ Suppression des imports non utilisés (`Menu`, `swiper/css/navigation`)
- ✅ Nettoyage des variables non utilisées (`searchTerm`, `filteredResults`, `groupIndex`, `handleClose`, `ref`)
- ✅ Ajout d'une section Sommaire avec navigation horizontale scrollable
- ✅ Implémentation du sticky positioning pour le sommaire (JavaScript)
- ✅ Amélioration du responsive mobile : paragraphes en pleine largeur
- ✅ Nettoyage du code CSS et JavaScript (suppression des duplications)
- ✅ Code prêt pour le déploiement sur Vercel/GitHub Pages
- ✅ Ajout de la page AboutNew avec navigation par sections
- ✅ Intégration d'un modèle 3D en nuage de points avec React Three Fiber
- ✅ Conversion de modèles OBJ en nuage de points pour affichage optimisé
- ✅ Responsive design pour le modèle 3D sur mobile et desktop
- ✅ Intégration Strava avec affichage des données en temps réel
- ✅ Système de cache localStorage pour limiter les appels API Strava
- ✅ Graphiques de performance (radar, journal d'entraînement)
- ✅ Routes API Vercel configurées pour le refresh automatique des tokens (production)
- ✅ Gestion des tokens avec expiration et validation

## 📦 Déploiement

Le projet est prêt pour être déployé sur différentes plateformes. Voir le [Guide de Déploiement](./DEPLOY.md) pour les instructions détaillées.

### Déploiement rapide sur Vercel

1. Aller sur [vercel.com](https://vercel.com) et se connecter avec GitHub
2. Cliquer sur "New Project" et importer `portfolio-react-anthony`
3. Vercel détectera automatiquement les paramètres (Vite, build, etc.)
4. Cliquer sur "Deploy" → C'est fait ! 🎉

Le projet inclut :
- ✅ Fichier `vercel.json` configuré pour le routing SPA
- ✅ Cache optimisé pour les assets
- ✅ Configuration prête pour production

### Autres options
- **Netlify** : Build command `npm run build`, publish directory `dist`
- **GitHub Pages** : Voir le guide pour configurer GitHub Actions

---

## 📚 Documentation Additionnelle

- [STRAVA_TOKEN_MANAGEMENT.md](./STRAVA_TOKEN_MANAGEMENT.md) - Gestion des tokens Strava
- [VERCEL_STRAVA_SETUP.md](./VERCEL_STRAVA_SETUP.md) - Configuration Strava sur Vercel (Production)
- [VERCEL_API_SETUP.md](./VERCEL_API_SETUP.md) - Configuration des routes API Vercel
- [VERCEL_ENV_VARS.md](./VERCEL_ENV_VARS.md) - Variables d'environnement Vercel
- [DEPLOY.md](./DEPLOY.md) - Guide de déploiement

---

### Améliorations Single Project (Janvier 2025)
- ✅ **Section "Processus détaillé – PlayDaGo"** : Nouvelle section Case Study avec contenu structuré détaillant le processus de design (recherche utilisateur, veille concurrentielle, idéation, tests & itérations)
- ✅ **Titre section mis à jour** : "Wireframes & Maquettes" renommé en "Idéation & Solutions testées" pour une meilleure cohérence
- ✅ **Donut Chart Race** : Intégration de graphiques en donut animés dans la section "Résultats & Impact" avec effet "race" séquentiel (délai progressif entre chaque graphique)
- ✅ **Padding-bottom amélioré** : Ajout d'un padding-bottom de 160px sur desktop (64px sur mobile) pour un meilleur espacement en bas de page
- ✅ **Tableau typographie masqué** : Le tableau des typographies est maintenant masqué, seul l'affichage de l'alphabet reste visible

---

*Dernière mise à jour : Janvier 2025*
