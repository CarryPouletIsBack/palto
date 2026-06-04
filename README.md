# Palto

Application web autour de la **mobilité à La Réunion** : carte **OSM** dans la **grille d’accueil** (colonne carte), **recherche / clic carte → destination**, **itinéraire routier**, marqueurs départ / arrivée, **chauffeurs à proximité** (API ou mock local, **avatars** photo / initiales sur la carte), et outils d’**estimation de distance** / barème kilométrique (usage indicatif, voir `src/services/`).

Le dépôt reprend une base **React + Vite + TypeScript** : périmètre produit **Palto** (carte, trajets, réservation Go, comptes, dashboard). Déploiement de référence : **[palto-six.vercel.app](https://palto-six.vercel.app)**.

## Vérification (build, prod, BDD, Stripe)

| Contrôle | Commande / URL | Résultat attendu |
|----------|----------------|------------------|
| **Qualité + build** | `npm run verify` (lint + typecheck + `vite build`) | Exit 0 ; PWA / Workbox générés dans `dist/` |
| **Variables Supabase (local)** | `npm run check:supabase` | Les 4 clés `SUPABASE_*` / `VITE_SUPABASE_*` présentes |
| **Front prod** | `GET https://palto-six.vercel.app/` | `200` |
| **Géocodage prod** | `GET /api/geocode?mode=search&q=Saint-Denis` | `200` + suggestions JSON |
| **Auth Realtime** | `GET /api/auth/realtime-token` (sans Bearer) | `401` (route vivante) |
| **Stripe API** | `POST /api/stripe?action=wallet-balance` (sans Bearer) | `401` (pas `503` = clés Stripe serveur actives sur Vercel) |
| **Création course** | `POST /api/rides/create` (body vide) | `400` validation Zod (handler actif) |

**Migrations Supabase** (SQL Editor — projet `uzjplpdpbxvzhisxgwfz`) : appliquer si manquantes, dans l’ordre :

| Script | Rôle |
|--------|------|
| `scripts/apply-migration-0008.sql` | Colonnes paiement Stripe sur `courses` |
| `scripts/apply-migration-0009.sql` | Portefeuille client (`client_wallet`, etc.) |
| `scripts/apply-migration-0010.sql` | Table `chauffeur_profile_data` (sinon `GET …/chauffeur?resource=profile` → 500) |
| `scripts/apply-migration-0011.sql` | `courses.payment_method` (`card` \| `cash`) |

Guide détaillé : **[docs/SUPABASE-CONNEXION.md](./docs/SUPABASE-CONNEXION.md)**, **[docs/STRIPE-SETUP.md](./docs/STRIPE-SETUP.md)**.

**Dev API locale** : `npm run dev:api` (`vercel dev`) — `npm run dev` seul ne sert pas toutes les routes `/api/*` (proxy limité).

## Beta publique & capacité (Vercel Hobby + Supabase Free)

Prod de référence : **[palto-six.vercel.app](https://palto-six.vercel.app)**. Pour un **premier lien partagé** (testeurs à La Réunion), le tier gratuit suffit en général si tu restes dans cet ordre de grandeur :

| Indicateur | Cible confortable (free) |
|------------|---------------------------|
| Utilisateurs inscrits / mois | ~20–80 |
| Personnes **en ligne en même temps** | ~5–15 |
| Chauffeurs avec app + GPS actifs | ~2–5 |
| Pics au-delà de ~15 chauffeurs connectés | Surveiller Vercel + Supabase ; envisager Pro |

**Goulot Palto** : le **heartbeat chauffeur** (~1 requête / 20 s par chauffeur connecté) et le **polling** dashboard / page Go — pas le nombre de comptes créés.

**Recommandations beta**

- Activer **`VITE_CASH_ONLY_PAYMENTS=true`** en prod pendant le test (espèces uniquement, moins de charge Stripe) — voir [docs/STRIPE-SETUP.md](./docs/STRIPE-SETUP.md).
- Surveiller **Supabase → Egress** et **Vercel → Bandwidth** chaque semaine.
- Éviter une diffusion massive du lien tant que les quotas ne sont pas suivis.

**Guide complet** (checklist quotidienne, seuils d’alerte, quand passer Pro) : **[docs/MONITORING-BETA-FREE-TIER.md](./docs/MONITORING-BETA-FREE-TIER.md)**.

## Périmètre livré & évolutions (2026)

Le cœur **Palto** (accueil carte, **Go**, comptes, dashboard chauffeur) est **maintenu dans ce dépôt** ; le build production cible `npm run build` (voir ci-dessous pour la **PWA**). Les détails d’implémentation vivent dans **Git**. Le parcours **Go** (`/go`) charge les chauffeurs via **`getNearbyDrivers()`** → **`GET /api/client/rides?mode=nearby`** (présence + photo profil Supabase) ; le mock **`getNearbyDriversMock()`** dans `src/data/nearbyDrivers.ts` reste réservé aux tests / démos locales (voir `.cursorrules`). Les **courses persistées** passent par l’**API** + **Supabase** lorsque les flags / variables d’environnement sont activés. Déploiement : **DEPLOY.md**, **.env.example**.

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

## Authentification & mot de passe oublié

- **Connexion** : modales **client** (`ClientAuthPage`) et **chauffeur** (`ChauffeurAuthPage`) ; **Mot de passe oublié ?** → `POST /api/auth?role=client|chauffeur&action=forgot-password` → e-mail **Resend** avec lien (30 min).
- **Réinitialisation** : page **`/fr/reset-password`** (sans header site — pas de logo Palto en haut) ; après validation du nouveau mot de passe → redirection automatique vers la **modale de connexion** (`/compte` ou `/dashboard` selon le rôle).
- **Variables** : `RESEND_API_KEY`, `RESEND_FROM`, `APP_BASE_URL`, Supabase — voir **[RESEND_CONTACT.md](./RESEND_CONTACT.md)** et **`.env.example`**. Dev API : `npm run dev:api`.

## Compte passager (`/compte`)

- **UI** : `ClientCompteDashboard.tsx` (aperçu, cours, lieux, portefeuille simulé local, sécurité, réglages) ; entrée **« Gérer le compte »** (tuiles style Apple) pour nom, téléphone, e-mail affiché, langue, etc.
- **Persistance** : profil, lieux, sécurité et préférences en **`localStorage` par e-mail** (`src/constants/clientAccountStorage.ts`) ; sync profil serveur via **`PUT /api/client/profile`** quand l’API client est active.
- **Portefeuille — Derniers mouvements** : la liste affichée sur `/compte` (bento + page portefeuille) est dérivée des **courses API** (`clientRides` / `ridesForUi`), pas d’un tableau mock vide.
- **Courses** : si `VITE_USE_CLIENT_RIDES_API` est actif (défaut : oui), liste via **`GET /api/client/rides`** ; annulation **`POST`** (`pending` / `accepted`) avec logique Stripe si carte ; chauffeurs proches **`GET ?mode=nearby`**. Realtime optionnel : `src/services/paltoCoursesRealtime.ts`.
- **Paiement carte / portefeuille Stripe** : si `VITE_STRIPE_PUBLISHABLE_KEY` est défini — cartes enregistrées, solde, recharge via **`POST /api/stripe?action=…`** (Bearer client ou chauffeur avec compte passager lié).
- **Rencontre chauffeur** : page dédiée + lien depuis la topbar quand une course est **in_progress** ; positions **broadcast** si `VITE_SUPABASE_*` + token Realtime (`/api/auth/realtime-token`) sont configurés — voir `src/services/paltoRideLocationRealtime.ts`.

## Fonctionnalités (Palto / carte)

- **Carte** dans la **3e colonne** de l’accueil (`Hero` → `HomeOsmMapBackground` en mode `embedded`). Fond tuiles : **OSM / OpenFreeMap Liberty** uniquement (pas de fond Mapbox).
- **Position « utilisateur » (dev)** : `3 Allée Dachau, 97420 Le Port` — `DEFAULT_USER_ORIGIN` / libellé associé dans `src/constants/defaultUserOrigin.ts`.
- **Pins** départ (bleu), arrivée (orange), chauffeurs (**avatar** : photo de profil si disponible, sinon **initiales** colorées — `HomeOsmMapBackground` + `src/utils/driverMapMarkerAvatar.ts`). **Chauffeurs à proximité** : liste + marqueurs sur la carte ; prod via API nearby, mock optionnel en local (`getNearbyDriversMock()` avec URLs d’avatar générées). Sans itinéraire ni destination ciblée, la carte **cadre** départ + chauffeurs pour les garder visibles.
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
- **Rechercher** : géocodage **départ + destination** en une fois ; affichage des **chauffeurs** inscrits / à proximité (**API** `mode=nearby`, rayon **20 km** autour du départ validé) avec **avatars sur la carte** (cover mobile synchronisée via `palto:go-cover-nearby-drivers-sync`) et tracé **itinéraire** sur la carte embarquée. Prix affichés en **€** (`formatFareEurDisplay`).
- **Clic sur un chauffeur** (desktop) : ouverture d’une **modal « Recap commande »** (détail trajet, chauffeur, prix indicatif) avec bouton **Commandez la course** (fermeture + événement analytics ; pas de paiement).
- Carte : pin départ après validation, `flyTo` sur le pickup, pins / route OSM comme sur le reste du site.

### Synchro carte **cover** (carousel) ↔ panneau Go (correctif boucle réseau)

La cover du projet **Go** et le panneau de réservation échangent des événements (`palto:cover-map-update`, `palto:go-cover-pickup-sync`, `palto:go-cover-destination-sync`, `palto:go-cover-route-sync`). Une **référence d’objet** `{ longitude, latitude }` recréée à chaque message sans changement de coordonnées pouvait relancer en boucle le **géocodage inverse** et le proxy **`/api/geocode`**, jusqu’à `ERR_INSUFFICIENT_RESOURCES`.

**Correctif** (mai 2026) : ne mettre à jour le state que si les coordonnées **changent réellement** (tolérance float + `setState` fonctionnel qui conserve la référence précédente quand c’est identique) ; effets et dépendances basés sur **`longitude` / `latitude`** plutôt que sur l’objet point entier. Fichiers concernés : **`src/components/SingleProjectNew.tsx`**, **`src/components/ProjectCoverCarousel.tsx`**. La navigation chauffeur annule aussi les requêtes OSRM en cours via le même **`AbortSignal`** (`osrmRouting` + `DriverNavigationView.tsx`).

> **Paiement Go (2026)** : avec `VITE_STRIPE_PUBLISHABLE_KEY` + `STRIPE_SECRET_KEY`, création de course **`POST /api/rides/create`** (PaymentIntent si `payment_method=card`) puis confirmation **`POST /api/stripe?action=confirm-authorized`**. Espèces : `payment_method=cash` sans Stripe. Voir **[docs/STRIPE-SETUP.md](./docs/STRIPE-SETUP.md)**.

## API serverless (`/api/*`)

**9 fonctions** Vercel (limite Hobby : 12) — ne pas ajouter de fichier sous `api/` sans fusionner une route existante.

| Fichier | Méthodes | Paramètres / corps | Rôle |
|---------|----------|-------------------|------|
| `api/auth/index.ts` | `POST`, `GET` | `?role=…&action=login\|register\|forgot-password\|reset-password\|delete` ; `?action=realtime-token` | Auth Palto, reset mot de passe (Resend), JWT Realtime |
| `api/client/rides.ts` | `GET`, `POST` | `GET` : `email`, `status`, `limit` ou `mode=nearby` ; `POST` : `{ courseId }` annulation | Courses client + chauffeurs à proximité |
| `api/client/profile.ts` | `GET`, `PUT` | Bearer client | Profil client Supabase |
| `api/chauffeur/index.ts` | `GET`, `PUT`, `POST` | `?resource=` : `rides`, `rides-action`, `profile`, `ride-profile`, `presence`, `stats`, `organization`, `compliance`, `cron-expire-instant` | Dashboard chauffeur |
| `api/rides/create.ts` | `POST` | Corps réservation (instant / scheduled, adresses, montant, email, `payment_method`) | Création course + Stripe si carte |
| `api/stripe/index.ts` | `POST` | `?action=` : `webhook`, `confirm-authorized`, `setup-intent`, `list-payment-methods`, `detach-payment-method`, `update-payment-method-billing`, `wallet-balance`, `wallet-topup-create`, `wallet-topup-confirm` | Paiements, portefeuille, webhook |
| `api/geocode.ts` | `GET` | `mode=search&q=…` ou `mode=reverse&lon&lat` | BAN + Nominatim + Photon |
| `api/google-auth/[action].ts` | `GET`, `POST` | `?action=callback\|token\|refresh` | OAuth Google |
| `api/send.ts` | `POST` | Formulaire contact (Resend) | Email contact |

**Rewrites** (`vercel.json`) : chemins courts auth (`/api/auth/client/login`, `/api/auth/realtime-token`, …) et cron **`/api/cron/expire-instant-pending`** → `chauffeur?resource=cron-expire-instant` (planifié **02:00 UTC**).

## Stack technique

- **React 18.3**, **TypeScript**, **Vite** — config TS projet : `tsconfig.json` (références) + **`tsconfig.app.json`** (code sous `src/`, alias `@/*`) + **`tsconfig.node.json`** (Vite / scripts Node)
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

Copier **`.env.example`** vers **`.env.local`**. Indispensables pour le parcours complet :

- **Supabase** : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` (Realtime)
- **Stripe (Go + portefeuille)** : `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` ; `STRIPE_WEBHOOK_SECRET` optionnel
- **Dashboard chauffeur** : `VITE_DASHBOARD_*` (local) / `DASHBOARD_*` (Vercel)

Flags front (défauts dans `src/constants/featureFlags.ts`) : `VITE_USE_CLIENT_RIDES_API`, `VITE_CHAUFFEUR_RIDES_PERSIST`, `VITE_CHAUFFEUR_PRESENCE_API`, `VITE_USE_ORG_API`, `VITE_USE_COMPLIANCE_API`, `VITE_USE_STATS_API`, `VITE_USE_PRICING_API`, `VITE_CASH_ONLY_PAYMENTS` (beta : espèces uniquement sur Go / compte client).

## Scripts npm

| Commande        | Description                                      |
|-----------------|--------------------------------------------------|
| `npm run dev`   | Serveur Vite (frontend seul ; `/api/*` limité)  |
| `npm run dev:api` | `vercel dev` — API + front comme en prod |
| `npm run verify` | `lint` + `typecheck` + `build` (CI locale) |
| `npm run check:supabase` | Vérifie les variables Supabase dans `.env.local` |
| `npm run build` | Build production dans `dist/` (+ **PWA** / Workbox) |
| `npm run lint` / `npm run typecheck` | Qualité |
| `npm run calc-frais` | Exemple CLI distance + barème (`tsx`) |

Après un build : `npx vite preview` sert le contenu de `dist/` en local (script npm non défini dans `package.json`, commande Vite standard).

Pour tester les **routes API** comme en production : `vercel dev` (Vercel CLI).

**PWA / service worker** : l’étape finale du build peut parfois échouer sur la génération du SW (Workbox / minification) selon l’environnement (mémoire, sandbox). Dans ce cas, relancer le build sur une machine locale ou ajuster la config `vite-plugin-pwa` si besoin.

## Structure utile (repères)

```
src/
  components/          # UI — Hero, Dashboard (chauffeur), ClientCompteDashboard, SingleProjectNew, DriverNavigationView, HomeOsmMapBackground, …
  constants/            # stockages locaux client/chauffeur, defaultUserOrigin, …
  services/             # addressGeocoding, osrmRouting, paltoRideLocationRealtime, paltoCoursesRealtime, clientRidesApi…
  data/                 # nearbyDrivers.ts (types + mock local), destinations, menu, projets…
  utils/                # driverMapMarkerAvatar.ts (marqueurs carte chauffeurs), mapLngLat…
api/                    # Serverless — geocode, auth, client/rides, chauffeur, auth/realtime-token, …
public/
```

## Backstage (catalogue logiciel)

Ce dépôt est enregistré dans **Backstage** via **[catalog-info.yaml](./catalog-info.yaml)** (format Software Catalog `backstage.io/v1alpha1`, entité `Component` **palto**).

| Point | Détail |
|-------|--------|
| **Effet sur Palto en prod** | **Aucun** — le fichier n’est pas lu par Vite, Vercel ni `npm run build`. |
| **Effet sur Backstage** | Métadonnées (titre, description, lien GitHub, owner, tags) affichées dans votre portail une fois la **location** catalogue pointée vers ce repo (branche `main`). |
| **Design system** | Page **`/go`** (case study Go), section **`#design-system`** — contenu dans `src/data/projects.ts`, rendu `SingleProjectNew.tsx` / `SingleProject.css`. L’annotation `palto.backstage.io/design-system-path` vaut **`/go#design-system`** (à préfixer par l’URL de prod, ex. `https://votre-domaine.re/fr/go#design-system`). |
| **Routes produit** | `/` accueil · `/go` réservation · `/compte` passager · `/dashboard` chauffeur · `/compte/course` rencontre chauffeur |

Après un **push** sur GitHub : déclencher la **synchro** du catalogue Backstage (refresh de la location ou du plugin GitHub) pour voir les changements. Aucune action sur Vercel n’est nécessaire pour le catalogue.

## Déploiement

- Fichier **`vercel.json`** pour le routage SPA.
- Guide générique : **[DEPLOY.md](./DEPLOY.md)** — adapter dépôt GitHub, `base` Vite si sous-chemin, et variables d’environnement.
- Base Vite : si le site est servi dans un **sous-chemin**, définir `base` dans `vite.config.ts` (voir commentaire dans DEPLOY.md).

## Documentation additionnelle

Les fichiers ci-dessous décrivent des intégrations (SEO, OAuth, email, etc.) avec des **exemples génériques** ; à relire lors du passage en production :

| Fichier | Sujet |
|---------|--------|
| [DEPLOY.md](./DEPLOY.md) | Déploiement Vercel / GitHub Pages |
| [docs/SUPABASE-CONNEXION.md](./docs/SUPABASE-CONNEXION.md) | Projet Supabase, clés, Realtime |
| [docs/STRIPE-SETUP.md](./docs/STRIPE-SETUP.md) | Clés test/live, migrations 0008–0011, webhook |
| [docs/MONITORING-BETA-FREE-TIER.md](./docs/MONITORING-BETA-FREE-TIER.md) | Capacité free Vercel/Supabase, checklist monitoring, passage Pro |
| [SEO_INDEXATION.md](./SEO_INDEXATION.md) | SEO, `VITE_SITE_URL` |
| [VERCEL_GOOGLE_OAUTH_SETUP.md](./VERCEL_GOOGLE_OAUTH_SETUP.md) | OAuth Google |
| [GOOGLE_CLOUD_CONSOLE_CONFIG.md](./GOOGLE_CLOUD_CONSOLE_CONFIG.md) | URIs de redirection |
| [RESEND_CONTACT.md](./RESEND_CONTACT.md) | Email contact |
| [.cursorrules](./.cursorrules) | Règles Cursor (MUI MCP, arbres user flow) |
| [catalog-info.yaml](./catalog-info.yaml) | Fiche **Backstage** (Software Catalog) — voir section [Backstage](#backstage-catalogue-logiciel) |

## Règles produit / design (arbres)

Référence arbres **user flow** : implémentation surtout sur la page **Go** (`SingleProjectNew.tsx`, `FlowTree.tsx`, données `userFlow` dans `projects.ts`) — voir `.cursorrules`.

## Licence & crédits

- Données **adresses** (recherche / inverse) : **Base Adresse Nationale** (Etalab / data.gouv) + **OpenStreetMap** / **Nominatim** (conditions d’usage respectées ; `User-Agent` identifié côté `api/geocode.ts`).
- Données carte : **© OpenStreetMap contributors** — respecter les conditions d’utilisation des services utilisés.
- Photos « lieux demandés » : sources **Wikimedia Commons** (voir commentaires dans `src/data/popularDestinations.ts`).

---

### Dernière mise à jour README — **28 mai 2026**

- **Mot de passe oublié** : Resend + page `/reset-password` (sans header) ; retour auto vers modale connexion après changement de MDP.
- **Carte chauffeurs** : marqueurs **avatar** (photo profil API / mock, repli **initiales**) — plus d’icône moto ; util `src/utils/driverMapMarkerAvatar.ts`, sync cover Go.
- **Go** : chauffeurs via **`GET ?mode=nearby`** ; mock local documenté comme tests uniquement.
- **Prix Go** : affichage unifié **`82,56 €`** (`formatFareEurDisplay` / `formatDriverPriceLabel`, front + server).
- **TypeScript** : `tsconfig.app.json` / `tsconfig.node.json` mentionnés dans [Stack](#stack-technique).
- **Beta / capacité** : [docs/MONITORING-BETA-FREE-TIER.md](./docs/MONITORING-BETA-FREE-TIER.md), `VITE_CASH_ONLY_PAYMENTS`, vérif prod **palto-six.vercel.app**.

*Palto — prod [palto-six.vercel.app](https://palto-six.vercel.app) · **OSM** + **`/api/geocode`** · **Go** `/go` · **compte** `/compte` · **dashboard** `/dashboard` · API + Supabase + Stripe selon `.env` / Vercel.*
