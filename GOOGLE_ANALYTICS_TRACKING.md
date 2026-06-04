# Configuration Google Analytics Tracking avec react-ga4

Ce guide explique comment configurer le tracking Google Analytics avec `react-ga4` dans votre application React.

## 📋 Prérequis

- Un compte Google Analytics
- Un ID de mesure (Measurement ID) : `G-XXXXXXXXXX`

## 🚀 Installation

La bibliothèque `react-ga4` est déjà installée dans le projet.

## ⚙️ Configuration

### 1. Variable d'environnement locale (`.env.local`)

Pour le développement local, ajoutez dans votre fichier `.env.local` :

```env
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 2. Variable d'environnement Vercel (Production)

⚠️ **IMPORTANT** : Pour `react-ga4` (côté client), vous **DEVEZ** utiliser le préfixe `VITE_` même dans Vercel !

**Pourquoi ?**
- `react-ga4` s'exécute côté **client** (navigateur)
- Vite ne remplace que les variables avec le préfixe `VITE_` dans le code client
- C'est différent des API routes (serveur) qui utilisent des variables **sans** `VITE_`

**Configuration dans Vercel :**

1. Allez sur votre tableau de bord Vercel
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Environment Variables**
4. Ajoutez une nouvelle variable :
   - **Nom** : `VITE_GA_MEASUREMENT_ID` ⚠️ **Avec le préfixe VITE_**
   - **Valeur** : `G-XXXXXXXXXX`
   - Cochez **Production**, **Preview** et **Development**
5. Sauvegardez

⚠️ **Important** : Vercel redéploiera automatiquement votre projet après avoir ajouté la variable.

## 📊 Fonctionnalités

Le service `googleAnalyticsTracking.ts` fournit les fonctions suivantes :

### Initialisation
- `initGA()` : Initialise Google Analytics au démarrage de l'application

### Tracking des pages
- `trackPageView(path, title?)` : Track une page view

### Tracking des événements
- `trackEvent(action, category, label?, value?)` : Track un événement personnalisé
- `trackLinkClick(linkName, linkUrl)` : Track un clic sur un lien
- `trackDownload(fileName, fileType)` : Track un téléchargement de fichier
- `trackSearch(searchTerm, resultsCount?)` : Track une recherche

## 🔧 Utilisation

### Tracking automatique des pages

Le tracking des pages vues est automatiquement configuré dans `App.tsx`. Chaque changement de page est tracké avec :
- Le chemin de la page (`/${currentPage}`)
- Le titre de la page (ex: "Accueil - Palto")

### Tracking manuel d'événements

Si vous souhaitez tracker des événements personnalisés, importez les fonctions :

```typescript
import { trackEvent, trackLinkClick, trackSearch } from './services/googleAnalyticsTracking'

// Exemple : tracker un clic sur un bouton
trackEvent('click', 'button', 'Contact Button')

// Exemple : tracker une recherche
trackSearch('projet design', 5)

// Exemple : tracker un téléchargement
trackDownload('palto-guide.pdf', 'pdf')
```

## 📈 Vérification

Pour vérifier que Google Analytics fonctionne :

1. Déployez votre application sur Vercel
2. Visitez votre site
3. Allez dans [Google Analytics](https://analytics.google.com/)
4. Sélectionnez votre propriété (G-XXXXXXXXXX)
5. Allez dans **Rapports** → **Temps réel**
6. Vous devriez voir vos visites en temps réel

## 🐛 Dépannage

### Les données n'apparaissent pas dans Google Analytics

1. **Vérifiez la variable d'environnement** :
   - En développement : Vérifiez que `VITE_GA_MEASUREMENT_ID` est dans `.env.local`
   - En production : Vérifiez que la variable est configurée dans Vercel

2. **Vérifiez la console du navigateur** :
   - Ouvrez les DevTools (F12)
   - Allez dans l'onglet Console
   - Vérifiez s'il y a des erreurs liées à Google Analytics

3. **Vérifiez le réseau** :
   - Ouvrez les DevTools → Network
   - Filtrez par "google-analytics" ou "gtag"
   - Vérifiez que les requêtes sont envoyées

4. **Délai de traitement** :
   - Les données peuvent prendre quelques minutes à apparaître dans Google Analytics
   - Utilisez le rapport "Temps réel" pour voir les données immédiatement

### Mode développement

En développement, `react-ga4` est configuré en mode test (`testMode: true`). Les données ne seront pas envoyées à Google Analytics, mais vous ne verrez pas d'erreurs dans la console.

Pour désactiver le mode test en développement, modifiez `src/services/googleAnalyticsTracking.ts` :

```typescript
ReactGA.initialize(GA_MEASUREMENT_ID, {
  testMode: false, // Désactiver le mode test
});
```

## 📚 Ressources

- [Documentation react-ga4](https://github.com/codler/react-ga4)
- [Documentation Google Analytics 4](https://developers.google.com/analytics/devguides/collection/ga4)
- [Google Analytics](https://analytics.google.com/)

## Microsoft Clarity

Palto charge Clarity via `@microsoft/clarity` dans `src/services/analytics/index.ts` — **ne pas** coller le snippet `<script>` dans `index.html` (doublon).

Projet Palto : `x1rl80e35j` (URL tag : `https://www.clarity.ms/tag/x1rl80e35j`).

```env
VITE_CLARITY_PROJECT_ID=x1rl80e35j
```

Même règle que GA : préfixe `VITE_` + variable sur Vercel (Production + Preview) puis redéploiement.

## ✅ Checklist

- [ ] Variable `VITE_GA_MEASUREMENT_ID` configurée dans `.env.local` (développement)
- [ ] Variable `VITE_GA_MEASUREMENT_ID` configurée dans Vercel (production)
- [ ] Variable `VITE_CLARITY_PROJECT_ID=x1rl80e35j` dans `.env.local` et Vercel
- [ ] Application déployée sur Vercel
- [ ] Visites vérifiées dans Google Analytics (Temps réel)

---

*Dernière mise à jour : Janvier 2025*
