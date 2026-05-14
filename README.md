# Palto

Application web autour de la **mobilité à La Réunion** : carte **OSM** dans la **grille d’accueil** (colonne carte), **recherche / clic carte → destination**, **itinéraire routier**, marqueurs départ / arrivée, **chauffeurs à proximité** (données mock + icônes moto sur la carte), et outils d’**estimation de distance** / barème kilométrique (usage indicatif, voir `src/services/`).

Le dépôt reprend une base **React + Vite + TypeScript** : périmètre produit **Palto** (carte, trajets, réservation Go, comptes, dashboard). Les **domaines et URLs d’exemple** dans la doc (`https://votre-domaine.re`, `nom-du-projet.vercel.app`, etc.) sont des **placeholders** à remplacer par ton déploiement réel.

## Périmètre livré & évolutions (2026)

Le cœur **Palto** (accueil carte, **Go**, comptes, dashboard chauffeur) est **maintenu dans ce dépôt** ; le build production cible `npm run build` (voir ci-dessous pour la **PWA**). Les détails d’implémentation vivent dans **Git**. Le parcours **Go** (`/go`) reste un **prototype** front (mock chauffeurs) ; les **courses persistées** passent par l’**API** + **Supabase** lorsque les flags / variables d’environnement sont activés. Pour le déploiement : **DEPLOY.md**, **.env.example** ; pour les chauffeurs sur la carte d’accueil : remplacer à terme `getNearbyDriversMock()` dans `src/data/nearbyDrivers.ts` par un appel API réel (contrat décrit dans `.cursorrules`).

## Dashboard chauffeur (`/dashboard`)

- **Dépôt unique** : tout le flux chauffeur (dont **Organisation** / flotte et **navigation** course) vit dans ce repo **`palto`** ; **PWA** activée au build (`vite-plugin-pwa`). Pas besoin d’un second hébergement pour un dépôt « chauffeur » séparé.
- **UI** : planning, courses, stats, compte, réglages, aide, etc. (`src/components/Dashboard.tsx`).
- **Compte chauffeur (profil)** : les champs édités (nom, téléphone, ville, véhicule, plaque, etc.) sont **persistés en local par email** (`localStorage`, clé `palto:chauffeur_profile_v1`) avec retour utilisateur (**toasts** Succès / erreur validation).
- **Médias profil chauffeur** : photo profil / organisation / véhicule sont également persistées dans le profil local (restauration après déconnexion/reconnexion).
- **Statistiques (refonte minimaliste)** : page stats revue avec cartes KPI compactes + graphes sobres (`recharts`) :
  - courbe **Courses par jour** (7 jours),
  - donut **Répartition des courses** (terminées / en cours / en attente / annulées),
  - bloc ratios (acceptation, annulation, en cours/attente).  
  Implémentation : `src/components/DashboardStats.tsx` + `src/components/DashboardStats.css`.
- **Fond** : **pas de carte** en arrière-plan du dashboard (évite les requêtes tuiles sur une vue où la carte n’apporte pas de valeur). Fonds **sidebar** et **zone principale** opaques (`Dashboard.css` / thème sombre dans `Dashboard.app-theme.css`).
- **Carte** ailleurs : **MapLibre GL** (`react-map-gl`) — fond **OpenStreetMap** via **OpenFreeMap Liberty** (tuiles publiques, sans Mapbox ni Carto CDN). Même logique sur **accueil**, **page Go**, **navigation** (`DriverNavigationView`), **compte** (carte lieux).
- **Navigation course + fin de course** : pendant une course **en cours**, le chauffeur peut envoyer sa position en **temps réel** (Supabase Realtime **broadcast** sur `ride_geo:{courseId}`) ; le passager voit le suivi sur la vue **rencontre chauffeur** et, après clôture côté chauffeur, un **récap** (montant, distance, durée) lorsque les données sont fournies par l’API.

## Compte passager (`/compte`)

- **UI** : `ClientCompteDashboard.tsx` (aperçu, cours, lieux, portefeuille simulé local, sécurité, réglages) ; entrée **« Gérer mon compte Palto »** (tuiles style Apple) pour nom, téléphone, e-mail affiché, langue, etc.
- **Persistance** : profil, lieux, portefeuille, sécurité et préférences sont stockés dans **`localStorage` scoping par e-mail** (ex. `palto_client_account_by_email_v1` pour le profil — voir `src/constants/clientAccountStorage.ts`). Les modifications depuis la modale d’édition appellent **`saveClientAccountSnapshot`** et émettent **`palto:client-session-changed`** pour rafraîchir la **topbar** (nom / photo) sans recharger la page.
- **Courses** : si le flag API client est actif, liste et détail via **`GET /api/client/rides`** (`api/client/rides.ts`) ; annulation **`POST`** pour les statuts **pending** / **accepted**. Un **abonnement Realtime** optionnel sur la table `courses` (`src/services/paltoCoursesRealtime.ts`) complète le polling.
- **Rencontre chauffeur** : page dédiée + lien depuis la topbar quand une course est **in_progress** ; positions **broadcast** si `VITE_SUPABASE_*` + token Realtime (`/api/auth/realtime-token`) sont configurés — voir `src/services/paltoRideLocationRealtime.ts`.

## Fonctionnalités (Palto / carte)

- **Carte** dans la **3e colonne** de l’accueil (`Hero` → `HomeOsmMapBackground` en mode `embedded`). Fond tuiles : **OSM / OpenFreeMap Liberty** uniquement (pas de fond Mapbox).
- **Position « utilisateur » (dev)** : `3 Allée Dachau, 97420 Le Port` — `DEFAULT_USER_ORIGIN` / libellé associé dans `src/constants/defaultUserOrigin.ts`.
- **Pins** départ (bleu), arrivée (orange), chauffeurs (icône moto SVG). **Chauffeurs à proximité** : liste dans la colonne centrale du `Hero` + marqueurs sur la carte ; données `src/data/nearbyDrivers.ts` (`getNearbyDriversMock()`). Sans itinéraire ni destination ciblée, la carte **cadre** départ + chauffeurs pour les garder visibles.
- **Sélection d’un chauffeur** : état `homeSelectedDriverId` dans `App.tsx` ; pas d’itinéraire vers la position du chauffeur mock (distinct de la destination course).
- **Tracé d’itinéraire** : calcul routier **OSRM** (public `router.project-osrm.org`) entre l’origine et la **destination** ; implémentation **`src/services/osrmRouting.ts`** (snap « nearest » + route `driving`). Côté **page Go**, requêtes **débouncées** et **annulables** (`AbortSignal`) pour éviter la saturation navigateur (`net::ERR_INSUFFICIENT_RESOURCES`) quand départ / arrivée changent vite.
- **Clic sur la carte** : point sur l’île, puis **géocodage inverse** — le champ **Destination** (colonne réservation) affiche l’adresse résolue, ou les coordonnées en secours.
- **Géocodage direct (adresses)** : barre de recherche header et champs adresse passent par **`/api/geocode`** (`api/geocode.ts`) : **Base Adresse Nationale** ([api-adresse.data.gouv.fr](https://adresse.data.gouv.fr)) en priorité (numéros / voies, **974xx**), complété par **Nominatim** (OSM) et repli **Photon**.
- **Estimation frais / distance** : `src/services/distanceGeo.ts`, `baremeKilometriqueFiscal.ts`, `fraisTransportEstimation.ts` ; script CLI `npm run calc-frais`.
- **Session unifiée client/chauffeur** : une session active est reflétée des deux côtés UI ; l’accès chauffeur reste conditionné à l’existence du rôle chauffeur pour l’email courant.
- **Statuts course en badges** : rendu unifié des états (`En attente`, `Acceptée/En cours`, `Terminée`, `Annulée`) côté client et chauffeur (incl. mode sombre).
- **Annulation côté client** : depuis le compte client, une course peut être annulée si son statut est **En attente** ou **Acceptée** (avec confirmation).

## Page projet **Go** — prototype parcours course (La Réunion)

Route **`/go`** (projet **Go** dans `projects.ts` / `SingleProjectNew.tsx`). Parcours type **commande de course** (prototype, sans backend de commande réelle) :

- **Localisation (départ)** et **destination** : saisie, **pré-sélection** au focus (lieux enregistrés, dernière valeur ; **géolocalisation navigateur** uniquement sur le départ), **suggestions d’adresse** via `/api/geocode` (BAN + OSM, biais La Réunion) à partir de quelques caractères, bouton **×** pour vider chaque champ.
- **Rechercher** : géocodage **départ + destination** en une fois ; affichage des **chauffeurs** (mock `getNearbyDriversMock()`, rayon **20 km** autour du départ validé) et tracé **itinéraire** sur la carte embarquée.
- **Clic sur un chauffeur** (desktop) : ouverture d’une **modal « Recap commande »** (détail trajet, chauffeur, prix indicatif) avec bouton **Commandez la course** (fermeture + événement analytics ; pas de paiement).
- Carte : pin départ après validation, `flyTo` sur le pickup, pins / route OSM comme sur le reste du site.

### Synchro carte **cover** (carousel) ↔ panneau Go (correctif boucle réseau)

La cover du projet **Go** et le panneau de réservation échangent des événements (`palto:cover-map-update`, `palto:go-cover-pickup-sync`, `palto:go-cover-destination-sync`, `palto:go-cover-route-sync`). Une **référence d’objet** `{ longitude, latitude }` recréée à chaque message sans changement de coordonnées pouvait relancer en boucle le **géocodage inverse** et le proxy **`/api/geocode`**, jusqu’à `ERR_INSUFFICIENT_RESOURCES`.

**Correctif** (mai 2026) : ne mettre à jour le state que si les coordonnées **changent réellement** (tolérance float + `setState` fonctionnel qui conserve la référence précédente quand c’est identique) ; effets et dépendances basés sur **`longitude` / `latitude`** plutôt que sur l’objet point entier. Fichiers concernés : **`src/components/SingleProjectNew.tsx`**, **`src/components/ProjectCoverCarousel.tsx`**. La navigation chauffeur annule aussi les requêtes OSRM en cours via le même **`AbortSignal`** (`osrmRouting` + `DriverNavigationView.tsx`).

> **Statut actuel (avril 2026)** : la page **Go** est mise en pause côté évolutions.  
> Le flux actuel (recherche, sélection chauffeur, recap, checkout simulé) est conservé tel quel ; intégration paiement réel (ex. Stripe Connect) prévue plus tard.

## Stack technique

- **React 19**, **TypeScript**, **Vite**
- **OSM** (carte, marqueurs, tracés)
- **Framer Motion**, **GSAP**, **MUI**, **Radix**, **Tailwind** (selon pages)
- **Navigation SPA** (`history.pushState` / `popstate`, sans React Router pour le cœur)
- **API Vercel** (`/api/*`) : auth Google, contact, courses chauffeur, **`/api/geocode`** (recherche + reverse adresses, BAN + Nominatim), etc.
- **Google Analytics** (dashboard)

## Prérequis

- Node.js **LTS** (18+ ou 20+)

## Installation

```bash
npm install
```

## Variables d’environnement

Créer un fichier **`.env.local`** à la racine (non versionné). Exemple minimal :

```env
# Optionnel — URL canonique / SEO (remplacer par ton domaine)
# VITE_SITE_URL=https://ton-domaine.re

# Dashboard / GA : voir .env.example et les guides VERCEL_*.md
```

Copier **`.env.example`** vers **`.env.local`** ; **dashboard** : `VITE_DASHBOARD_EMAIL` / `VITE_DASHBOARD_PASSWORD` (local) et sur Vercel `DASHBOARD_EMAIL` / `DASHBOARD_PASSWORD` ; réseaux sociaux footer : `VITE_SOCIAL_*` (optionnel). Voir aussi Google OAuth dans les guides listés plus bas.

## Scripts npm

| Commande        | Description                                      |
|-----------------|--------------------------------------------------|
| `npm run dev`   | Serveur Vite (frontend seul ; `/api/*` limité)  |
| `npm run build` | Build production dans `dist/` (+ **PWA** / Workbox en fin de pipeline) |
| `npm run lint` / `npm run typecheck` | Qualité (le typecheck complet peut signaler une dépréciation `baseUrl` TS selon la version locale) |
| `npm run calc-frais` | Exemple CLI distance + barème (`tsx`, voir `scripts/calc-frais-transport.ts`) |

Après un build : `npx vite preview` sert le contenu de `dist/` en local (script npm non défini dans `package.json`, commande Vite standard).

Pour tester les **routes API** comme en production : `vercel dev` (Vercel CLI).

**PWA / service worker** : l’étape finale du build peut parfois échouer sur la génération du SW (Workbox / minification) selon l’environnement (mémoire, sandbox). Dans ce cas, relancer le build sur une machine locale ou ajuster la config `vite-plugin-pwa` si besoin.

## Structure utile (repères)

```
src/
  components/          # UI — Hero, Dashboard (chauffeur), ClientCompteDashboard, SingleProjectNew, DriverNavigationView, HomeOsmMapBackground, …
  constants/            # stockages locaux client/chauffeur, defaultUserOrigin, …
  services/             # addressGeocoding, osrmRouting, paltoRideLocationRealtime, paltoCoursesRealtime, clientRidesApi…
  data/                 # nearbyDrivers.ts (mock chauffeurs), destinations, menu, projets…
api/                    # Serverless — geocode, auth, client/rides, chauffeur, auth/realtime-token, …
public/
```

## Déploiement

- Fichier **`vercel.json`** pour le routage SPA.
- Guide générique : **[DEPLOY.md](./DEPLOY.md)** — adapter dépôt GitHub, `base` Vite si sous-chemin, et variables d’environnement.
- Base Vite : si le site est servi dans un **sous-chemin**, définir `base` dans `vite.config.ts` (voir commentaire dans DEPLOY.md).

## Documentation additionnelle

Les fichiers ci-dessous décrivent des intégrations (SEO, OAuth, email, etc.) avec des **exemples génériques** ; à relire lors du passage en production :

| Fichier | Sujet |
|---------|--------|
| [DEPLOY.md](./DEPLOY.md) | Déploiement Vercel / GitHub Pages |
| [SEO_INDEXATION.md](./SEO_INDEXATION.md) | SEO, `VITE_SITE_URL` |
| [VERCEL_GOOGLE_OAUTH_SETUP.md](./VERCEL_GOOGLE_OAUTH_SETUP.md) | OAuth Google |
| [GOOGLE_CLOUD_CONSOLE_CONFIG.md](./GOOGLE_CLOUD_CONSOLE_CONFIG.md) | URIs de redirection |
| [RESEND_CONTACT.md](./RESEND_CONTACT.md) | Email contact |
| [.cursorrules](./.cursorrules) | Règles Cursor (MUI MCP, arbres user flow) |

## Règles produit / design (arbres)

Référence arbres **user flow** : implémentation surtout sur la page **Go** (`SingleProjectNew.tsx`, `FlowTree.tsx`, données `userFlow` dans `projects.ts`) — voir `.cursorrules`.

## Licence & crédits

- Données **adresses** (recherche / inverse) : **Base Adresse Nationale** (Etalab / data.gouv) + **OpenStreetMap** / **Nominatim** (conditions d’usage respectées ; `User-Agent` identifié côté `api/geocode.ts`).
- Données carte : **© OpenStreetMap contributors** — respecter les conditions d’utilisation des services utilisés.
- Photos « lieux demandés » : sources **Wikimedia Commons** (voir commentaires dans `src/data/popularDestinations.ts`).

---

### Dernière mise à jour README — **9 mai 2026**

- **Compte passager** : édition **Nom / Prénom / Téléphone** (et tuiles associées) **persistée** via `saveClientAccountSnapshot` + événement `palto:client-session-changed` pour la topbar.
- **Courses & temps réel** : API **`/api/client/rides`** ; suivi **`ride_geo:{courseId}`** (broadcast) ; récap client après clôture chauffeur quand les champs API le permettent.
- **Nettoyage local** : migration ponctuelle des brouillons navigateur via `purgeStaleLocalSnapshotsOnce` (`src/services/purgeStaleLocalSnapshots.ts`).
- **Géocodage / suggestions** : `/api/geocode` — **BAN** + **Nominatim** (page **Go** et champs adresse).
- **Session** : unifiée client/chauffeur ; annulation client en `pending` / `accepted`.
- **Dashboard chauffeur** : profil local par e-mail + stats `recharts` ; navigation course avec envoi position optionnel.
- **Stabilité Go / réseau** : plus de boucle infinie **cover ↔ panneau** (égalité des coordonnées + deps sur lat/lng) — voir sous-section *Synchro carte cover ↔ panneau Go* ; **OSRM** avec debounce + annulation (`osrmRouting.ts`, `SingleProjectNew`, `DriverNavigationView`) pour limiter `ERR_INSUFFICIENT_RESOURCES`.
- **Nommage carte** : composant carte **`HomeOsmMapBackground`** (tuiles OSM uniquement) ; services **`addressGeocoding.ts`** et **`osrmRouting.ts`** (plus de dépendance `mapbox-gl`).

*Palto — **OSM** + **`/api/geocode`** ; **Go** `/go` ; **compte** `/compte` ; **dashboard** `/dashboard` ; mock chauffeurs accueil ; API + Supabase selon configuration.*
