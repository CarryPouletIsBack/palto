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
- **Cache intelligent** : Système de cache localStorage (5 minutes) pour limiter les appels API
- **Graphiques de performance** : Graphique radar et journal d'entraînement
- **Limitation des appels API** : Réduction automatique des requêtes grâce au cache
- **Gestion des tokens** : Support des tokens Strava avec expiration automatique

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
- `Header` - Navigation avec logo, menu et search bar desktop
- `Background` - Gestion du background image dynamique
- `MobileSearchBar` - Barre de recherche mobile avec dégradé et résultats

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
6. **Wireframes & Maquettes** - Prototypes et architecture (avec file-tree)
7. **Design System** - Palette colorimétrique et typographie
8. **Implémentation & Technologies** - Stack technique
9. **Impacts & Résultats** - Métriques et retours

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
- **Miniatures arrondies** : Thumbnails fully rounded sur desktop
- **Miniatures agrandies** : Résultats plus grands sur desktop

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

## 🧹 Code Propre et Optimisé

### Qualité du Code
- **CSS** : Classes organisées, commentaires utiles uniquement
- **TypeScript** : Types stricts, aucune erreur de compilation
- **JavaScript** : Aucun console.log, imports optimisés
- **Accessibilité** : Attributs alt, éléments interactifs accessibles
- **Performance** : Build optimisé, pas d'erreurs de linting
- **Build** : Toutes les erreurs TypeScript corrigées (variables non utilisées, imports manquants)

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
VITE_STRAVA_CLIENT_ID=votre_client_id
VITE_STRAVA_CLIENT_SECRET=votre_client_secret
VITE_STRAVA_ACCESS_TOKEN=votre_access_token
VITE_STRAVA_REFRESH_TOKEN=votre_refresh_token
VITE_STRAVA_TOKEN_EXPIRES_AT=timestamp_unix_expiration

# Lancement en développement
npm run dev

# Build de production
npm run build

# Prévisualisation du build
npm run preview
```

### Intégration Strava

Le projet intègre l'API Strava pour afficher vos données sportives. 

**Configuration :**
1. Obtenez vos tokens Strava via votre projet Node.js (`C:\Users\Anthony\strava-api-client`)
2. Créez un fichier `.env.local` avec les variables `VITE_STRAVA_*`
3. Les données seront automatiquement chargées et mises en cache

**Système de cache :**
- Cache localStorage de 5 minutes pour limiter les appels API
- Réduction automatique des requêtes Strava
- Meilleures performances et respect des limites de taux

**Fonctionnalités :**
- Affichage du profil athlète
- 5 dernières activités avec détails
- Activités 2025 avec statistiques
- Graphiques de performance (radar, journal d'entraînement)

Voir [STRAVA_TOKEN_MANAGEMENT.md](./STRAVA_TOKEN_MANAGEMENT.md) pour plus de détails.

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
├── api/                    # Routes API Vercel (optionnel)
│   └── strava/             # Endpoints Strava
│       ├── athlete.ts      # GET /api/strava/athlete
│       ├── activities.ts   # GET /api/strava/activities
│       ├── activities/[id]/index.ts  # GET /api/strava/activities/:id
│       └── utils.ts        # Utilitaires (refresh token, etc.)
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

### Fonctionnalités
- **Données en temps réel** : Profil, activités, statistiques depuis l'API Strava
- **Cache intelligent** : Système de cache localStorage (5 minutes) pour limiter les appels API
- **Graphiques de performance** : Graphique radar et journal d'entraînement avec Recharts
- **Gestion des tokens** : Support automatique des tokens avec expiration

### Configuration
1. Obtenez vos tokens Strava (voir [STRAVA_TOKEN_MANAGEMENT.md](./STRAVA_TOKEN_MANAGEMENT.md))
2. Créez un fichier `.env.local` avec les variables `VITE_STRAVA_*`
3. Les données seront automatiquement chargées au chargement de la page AboutNew

### Cache et Performance
- **Cache localStorage** : 5 minutes pour les activités, athlète et activités 2025
- **Réduction des appels API** : Limite automatique des requêtes Strava
- **Respect des limites** : Prévention des erreurs 429 (Too Many Requests)

### Routes API Vercel (Optionnel)
- Routes API disponibles dans `/api/strava/` pour production
- Refresh automatique des tokens côté serveur
- Variables d'environnement configurées dans Vercel

## 🔧 Corrections Récentes (Janvier 2025)

### Modifications Page d'accueil (Hero)
- ✅ Simplification de l'architecture : retrait de la classe `page active` pour utiliser uniquement `accueil-page`
- ✅ Ajustements des styles de scroll pour `.hero-right-column-scroll` :
  - Configuration du scroll vertical avec `overflow-y: auto`
  - Ajustement des propriétés flexbox pour permettre le scroll correctement
  - Padding-bottom pour assurer la visibilité complète du contenu
- ✅ Configuration des styles de scroll dans `.hero-right-column` pour permettre l'affichage complet du contenu

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
- [VERCEL_API_SETUP.md](./VERCEL_API_SETUP.md) - Configuration des routes API Vercel
- [VERCEL_ENV_VARS.md](./VERCEL_ENV_VARS.md) - Variables d'environnement Vercel
- [DEPLOY.md](./DEPLOY.md) - Guide de déploiement

---

*Dernière mise à jour : Janvier 2025*
