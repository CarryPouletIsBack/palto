# Thème Palto (`data-app-theme`)

Source unique : [`src/styles/app-theme.css`](../src/styles/app-theme.css). Application : `applyAppThemeToDocument()` dans [`src/constants/clientAppPreferencesStorage.ts`](../src/constants/clientAppPreferencesStorage.ts).

**Règle :** préférer `var(--app-*)` pour fonds, textes et bordures ; ponts `html[data-app-theme='dark']` seulement pour cas spécifiques (carte Go `--sp-*`, modales, cartes Mapbox).

### Tokens surfaces (clair / sombre)

| Token | Usage |
|-------|--------|
| `--app-surface-card` | Cartes auth, panneaux |
| `--app-surface-input` | Champs formulaire |
| `--app-surface-elevated` | Modales, popovers |
| `--app-surface-muted` / `--app-surface-hover` | Listes, cartes secondaires |
| `--app-border-medium` | Bordures champs |
| `--app-text-danger` / `--app-text-link` | Erreurs, liens |
| `--app-btn-primary-*` / `--app-btn-ghost-*` | Boutons shell |
| `--app-shadow-sm` / `--app-shadow-md` | Ombres cartes |
| `--app-overlay-scrim` | Fond modal |

## Pages × couverture dark

| Page | Route / id | CSS principal | Pont dark |
|------|------------|---------------|-----------|
| Accueil client | `accueil` | Hero.css | Partiel |
| Accueil chauffeur | `accueil-chauffeur` | HeroChauffeur.css | Partiel |
| Dashboard chauffeur | `dashboard` | Dashboard.css + Dashboard.app-theme.css | Oui |
| Compte client | `client-compte` | ClientCompteDashboard.css | Oui |
| Go | `project-Go` | SingleProject.css + SingleProject.app-theme.css | Oui |
| Auth | `login` | AuthPage.css | Tokens |
| Contact | `contact` | Contact.css | Tokens |
| Destination | `destination-*` | DestinationSpotlight.css | Tokens |
| Meet chauffeur | `client-meet-driver` | ClientMeetDriverPage.css | Partiel |
| Navigation | `dashboard-navigation` | DriverNavigationView.css | Partiel |
| Menu | `menu` | Menu.css | Tokens |
| 404 | `404` | ErrorPage.css | Tokens |
| Header (global) | — | Header.css | Tokens |

## Fichiers CSS sans `html[data-app-theme='dark']` (pont dédié)

Utiliser les tokens `--app-*` : AuthPage, Header, Menu, Contact, ErrorPage, DestinationSpotlight, Button, LanguageSwitcher, MobileSearchBar (vars search-*), App.css, etc.

Fichiers avec pont dark dédié : Dashboard.app-theme.css, ClientCompteDashboard.css, Hero.css, SingleProject.css, SingleProject.app-theme.css, Dashboard.css (partiel), DriverNavigationView.css, ClientRideTrackingView.css, HomeFooter.css, GeolocationPromptBanner.css, HomeOsmMapBackground.css, HeroChauffeur.css, ClientMeetDriverPage.css, ClientDriverMeetCard.css.

## Test manuel

1. Préférences → Thème **Sombre** (compte client ou chauffeur).
2. Parcourir : accueil, /go, compte client, dashboard chauffeur (vue d’ensemble + compte).
3. Desktop + mobile (Safari iOS pour inputs).
4. Vérifier : pas de flash blanc, textes lisibles, bordures visibles.

### Matrice 8 écrans × clair/sombre × desktop/mobile

| Écran | Route / id |
|-------|------------|
| Accueil | `accueil` |
| Go | `project-Go` |
| Compte client | `client-compte` |
| Dashboard chauffeur | `dashboard` |
| Auth | `login` |
| Contact | `contact` |
| Destination | `destination-*` |
| 404 | `404` |

Console (smoke dark) : `document.documentElement.setAttribute('data-app-theme','dark')` puis recharger la route.

Toasts : `AppToaster` suit `data-app-theme` (Sonner).
