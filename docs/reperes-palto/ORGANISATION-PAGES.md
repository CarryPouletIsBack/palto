# Palto — repères projet et pages

Document de **cartographie** pour humains et assistants (organigramme, onboarding). Dernière mise à jour : **mai 2026**.

## 1. Dépôt canonique et prod

| Dépôt | Rôle |
|--------|------|
| **`palto`** | **Seul dépôt à déployer en production** : site public, Go, compte client, **dashboard chauffeur** (dont module **Organisation** flotte), navigation course, **PWA** (`vite-plugin-pwa`, service worker). Un seul hébergement (ex. Vercel). |
| **`palto chauffeur`** | **Fork / miroir historique** — ne plus le traiter comme source de vérité ; les évolutions se font sur **`palto`**. Tu peux l’archiver ou le supprimer quand tu n’en as plus besoin en local. |

Les chemins ci-dessous sont relatifs à la **racine du dépôt `palto`**.

---

## 2. Navigation technique (SPA)

- **Pas de React Router** sur le cœur produit : état **`currentPage`** dans `src/App.tsx` + **`window.history.pushState` / `popstate`**.
- **Langue** : préfixe URL optionnel **`/fr`** ou **`/en`** ; le pathname sans préfixe sert au routage « métier ».
- **Authentification** : contrôle avant d’afficher le dashboard chauffeur (`isAuthenticated` dans `src/services/authService.ts`).

Fichier pivot : **`src/App.tsx`** (détection pathname au chargement, construction des URLs, rendu conditionnel).

---

## 3. URLs publiques ↔ identifiants internes ↔ composants

Les **identifiants internes** (`currentPage`) sont ceux utilisés dans `App.tsx`. Les URLs ci-dessous peuvent être préfixées par `/fr` ou `/en`.

| URL (exemple) | `currentPage` | Composant(s) principal(aux) | Rôle produit |
|-----------------|----------------|-----------------------------|--------------|
| `/`, `/fr`, `/en` | `accueil` | `Hero` (+ carte Mapbox embarquée, réservation, chauffeurs mock) | **Accueil** : grille hero, destination, trajet, liens compte / chauffeur / Go. |
| `/go`, `/project/go` | `project-Go` | `Project` → `SingleProjectNew` ; en overlay `ProjectCoverCarousel` | **Page Go** : parcours « commande de course » (prototype), carte, recap. Données texte / user flow : `src/data/projects.ts` (clé **Go**). |
| `/menu` | `menu` | `Menu` | Liste des projets publiés (menu case-study léger). |
| `/contact` | `contact` | `Contact` | Formulaire contact (API `api/send.ts`). |
| `/compte` | `client-compte` | `ClientCompteDashboard` | Espace **client** (compte / préférences côté app). |
| `/dashboard` | `dashboard` | `Dashboard` | **Dashboard chauffeur** : vues overview, courses, stats, clients, planning, **organisation** (flotte), compte, réglages, aide. |
| `/dashboard/navigation/:id` | `dashboard-navigation` + `navigationCourseId` | `DriverNavigationView` | **Navigation course** : carte + itinéraire pour une course active (`courseId` dans l’URL). |
| `/lieu/:id` | `destination-{id}` | `DestinationSpotlight` si lieu connu ; sinon flux 404 | **Fiche lieu** depuis `src/data/popularDestinations.ts`. |
| `/about`, `/apropos`, etc. (anciens chemins) | `404` | `ErrorPage` | Redirigé vers **404** volontairement. |
| Autre chemin non reconnu | `404` | `ErrorPage` | 404. |

**Query** : `?page=…` peut encore forcer une page (legacy) ; le **pathname** prime pour `/compte`, `/dashboard/navigation/…`, etc. (voir commentaires dans `App.tsx`).

---

## 4. Présence du header

`Header` est **masqué** sur : `dashboard`, `dashboard-navigation`, `client-compte`, `accueil`, et les pages `destination-*`. Présent sur menu, contact, 404, etc.

---

## 5. Page projet Go (détail)

- **Route** : `/go` ou `/project/go`.
- **Enrobage** : `ProjectCoverCarousel` (cover, fermeture, swipe) puis `Project` qui charge les données via `projectService` / `src/data/projects.ts`.
- **Contenu riche** : `SingleProjectNew.tsx` (très gros fichier) — sections type case study + **intégration produit** réservation (Mapbox, chauffeurs, modals).
- **Arbre user flow** : `FlowTree` + `#userflow-tree` ; référence design dans `.cursorrules`.

---

## 6. Dashboard chauffeur (`Dashboard.tsx`)

Vues internes (`DashboardView`) :

| Vue | Rôle court |
|-----|------------|
| `overview` | Synthèse / entrée. |
| `courses` | Liste / gestion des courses. |
| `stats` | `DashboardStats`, graphiques. |
| `clients` | Clients. |
| `planning` | Planning. |
| `organization` | Flotte : profil, équipe, invitations, paramètres (admin) ; données locales `chauffeurOrganizationStorage`. |
| `user` | Profil chauffeur (identité, véhicule, téléphone, etc.). |
| `settings` | Réglages (thème, préférences, etc.). |
| `help` | Aide. |

**Éditeur « projets »** : le dashboard inclut encore `ProjectEditor` branché sur `projectService` (données seed `defaultProjectsData` dans `src/data/projects.ts` + persistance `localStorage`).

**API courses** : `src/services/chauffeurRidesApi.ts` ↔ endpoints **`/api/chauffeur/rides`**, **`/api/chauffeur/rides-action`** (auth chauffeur, Supabase côté serveur).

**Navigation course** : `DriverNavigationView` ; persistance / événements décrits dans `src/constants/chauffeurNavCourseStorage.ts`.

---

## 7. API serverless (`api/`)

Chemins typiques déployés sur Vercel (préfixe `/api`) :

| Fichier | Usage |
|---------|--------|
| `api/auth/login.ts` | Login (ex. dashboard). |
| `api/google-auth/callback.ts`, `api/google-auth/refresh.ts` | OAuth Google. |
| `api/send.ts` | Envoi email / contact. |
| `api/rides/create.ts` | Création de course (côté réservation / flux client selon intégration). |
| `api/chauffeur/rides.ts` | Liste courses chauffeur. |
| `api/chauffeur/rides-action.ts` | Actions sur une course. |
| `api/lib/chauffeurAuth.ts`, `api/lib/supabaseAdmin.ts` | Auth et client Supabase admin. |

---

## 8. Données et contenus statiques

| Emplacement | Rôle |
|-------------|------|
| `src/data/projects.ts` | **Seed** projet « Go » : textes FR/EN, user flow, matrices, etc. Export `defaultProjectsData` + type `ProjectData`. |
| `src/services/projectService.ts` | Fusion seed + `localStorage`, CRUD menu/dashboard. |
| `src/data/nearbyDrivers.ts` | Mock **chauffeurs à proximité** (contrat prêt pour API réelle). |
| `src/constants/chauffeurOrganizationStorage.ts` | Organisation / flotte (stockage local). |
| `src/constants/chauffeurInboxStorage.ts` | Notifications type invitation flotte (stockage local). |
| `src/constants/chauffeurFleetZones.ts` | Secteurs / disponibilité flotte (stockage local). |
| `src/constants/chauffeurComplianceStorage.ts` | Checklist documents chauffeur (stockage local). |
| `src/constants/chauffeurRegistrationStorage.ts` | Inscription chauffeurs additionnels (stockage local). |
| `src/data/popularDestinations.ts` | Destinations « lieux » / spotlight. |
| `content/pages/*.txt` | Textes **éditoriaux** versionnés (accueil, dashboard, go, 404). À relier à l’usage réel dans le front si tu t’en sers (sinon référence rédaction / export). |
| `public/projects-content.json`, `public/content-for-crawlers.html` | Contenus **crawler / SEO** — à aligner avec `projects.ts` si besoin (voir `SEO_INDEXATION.md`). |

---

## 9. Services front notables (`src/services/`)

- **Mapbox** : géocodage, directions, carte (`mapboxGeocoding`, `mapboxDirections`, composants carte).
- **Frais / distance** : `distanceGeo.ts`, `baremeKilometriqueFiscal.ts`, `fraisTransportEstimation.ts` ; script CLI `npm run calc-frais` → `scripts/calc-frais-transport.ts`.
- **Analytics** : `googleAnalyticsTracking.ts`.
- **Auth client / Google** : `authService.ts`, `googleAuthService.ts`.

---

## 10. PWA (installable / rechargement shell)

Le **`vite.config.ts`** de `palto` inclut **`vite-plugin-pwa`** (précache JS/CSS, pas les tuiles Mapbox). En dev, le SW est désactivé (`devOptions.enabled: false`) ; il s’active au **build** (`npm run build`).

---

## 11. Pistes pour un **organigramme**

Pour un organigramme (Figma, Miro, etc.), tu peux découper en **blocs** :

1. **Public** : Accueil → Go / Contact / Menu / Lieu.  
2. **Client** : Compte.  
3. **Chauffeur** : Login → Dashboard (vues internes) → Navigation course.  
4. **Transversal** : Auth, Mapbox, GA, API Vercel, Supabase.

Liens « parent → enfant » utiles : `App.tsx` → pages ; `Dashboard` → vues ; `Project` → `SingleProjectNew`.

---

## 12. Fichiers « une lecture » pour comprendre vite

1. `README.md` (racine)  
2. `src/App.tsx`  
3. `src/data/projects.ts` (contenu Go)  
4. `src/components/Dashboard.tsx` (vues chauffeur)  
5. `vercel.json` (fallback SPA)  
6. `.env.example`  

Ce dossier `docs/reperes-palto/` peut accueillir ensuite des schémas (`*.png`), exports Miro, ou un `ORGANIGRAMME.md` lié à ton livrable design.
