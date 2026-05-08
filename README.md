# Palto

Application web autour de la **mobilité à La Réunion** : carte **OSM** dans la **grille d’accueil** (colonne carte), **recherche / clic carte → destination**, **itinéraire routier**, marqueurs départ / arrivée, **chauffeurs à proximité** (données mock + icônes moto sur la carte), et outils d’**estimation de distance** / barème kilométrique (usage indicatif, voir `src/services/`).

Le dépôt reprend une base **React + Vite + TypeScript** : périmètre produit **Palto** (carte, trajets, réservation Go, comptes, dashboard). Les **domaines et URLs d’exemple** dans la doc (`https://votre-domaine.re`, `nom-du-projet.vercel.app`, etc.) sont des **placeholders** à remplacer par ton déploiement réel.

## Clôture du projet (avril 2026)

Le chantier **Palto** (carte accueil, héros) est **terminé** : livrable dans l’**état actuel** du dépôt (build `npm run build` OK). Les détails d’implémentation vivent dans **Git** ; ce README résume le périmètre et comment relancer le projet. Le **prototype page Go** (`/go`, réservation course) continue d’évoluer dans le même dépôt (`SingleProjectNew.tsx`, services carto/routing OSM, mock chauffeurs). Pour la suite : **DEPLOY.md**, **.env.example**, remplacement de `getNearbyDriversMock()` dans `src/data/nearbyDrivers.ts` par une API réelle si besoin.

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
- **Carte OSM** ailleurs : utilisée là où le produit l’exige — **accueil** (colonne carte), **page Go** (parcours réservation), **navigation course** (`DriverNavigationView`, route `/dashboard/navigation/:id`).

## Fonctionnalités (Palto / carte OSM)

- **Carte OSM** dans la **3e colonne** de l’accueil (`Hero` → composant carte en mode `embedded`).
- **Vue 3D** : non utilisée dans le flux OSM actuel.
- **Position « utilisateur » (dev)** : `3 Allée Dachau, 97420 Le Port` — `DEFAULT_USER_ORIGIN` / libellé associé dans `src/constants/defaultUserOrigin.ts`.
- **Pins** départ (bleu), arrivée (orange), chauffeurs (icône moto SVG). **Chauffeurs à proximité** : liste dans la colonne centrale du `Hero` + marqueurs sur la carte ; données `src/data/nearbyDrivers.ts` (`getNearbyDriversMock()`). Sans itinéraire ni destination ciblée, la carte **cadre** départ + chauffeurs pour les garder visibles.
- **Sélection d’un chauffeur** : état `homeSelectedDriverId` dans `App.tsx` ; pas d’itinéraire vers la position du chauffeur mock (distinct de la destination course).
- **Tracé d’itinéraire** : calcul routier entre l’origine et la **destination** dans le flux OSM.
- **Clic sur la carte** : point sur l’île, puis **géocodage inverse** — le champ **Destination** (colonne réservation) affiche l’adresse résolue, ou les coordonnées en secours.
- **Géocodage direct (adresses)** : barre de recherche header et champs adresse passent par **`/api/geocode`** (`api/geocode.ts`) : **Base Adresse Nationale** ([api-adresse.data.gouv.fr](https://adresse.data.gouv.fr)) en priorité (numéros / voies, **974xx**), complété par **Nominatim** (OSM) et repli **Photon**.
- **Estimation frais / distance** : `src/services/distanceGeo.ts`, `baremeKilometriqueFiscal.ts`, `fraisTransportEstimation.ts` ; script CLI `npm run calc-frais`.
- **Session unifiée client/chauffeur** : une session active est reflétée des deux côtés UI ; l’accès chauffeur reste conditionné à l’existence du rôle chauffeur pour l’email courant.
- **Statuts course en badges** : rendu unifié des états (`En attente`, `Acceptée/En cours`, `Terminée`, `Annulée`) côté client et chauffeur (incl. mode sombre).
- **Annulation côté client** : depuis le compte client, une course peut être annulée si son statut est **En attente** ou **Acceptée** (avec confirmation).

## Page projet **Go** — prototype parcours course (La Réunion)

Route **`/go`** (projet **Go** dans `projects.ts` / `SingleProjectNew.tsx`). Parcours type **commande de course** (démo, sans backend de commande réelle) :

- **Localisation (départ)** et **destination** : saisie, **pré-sélection** au focus (lieux enregistrés, dernière valeur ; **géolocalisation navigateur** uniquement sur le départ), **suggestions d’adresse** via `/api/geocode` (BAN + OSM, biais La Réunion) à partir de quelques caractères, bouton **×** pour vider chaque champ.
- **Rechercher** : géocodage **départ + destination** en une fois ; affichage des **chauffeurs** (mock `getNearbyDriversMock()`, rayon **20 km** autour du départ validé) et tracé **itinéraire** sur la carte embarquée.
- **Clic sur un chauffeur** (desktop) : ouverture d’une **modal « Recap commande »** (détail trajet, chauffeur, prix indicatif) avec bouton **Commandez la course** (fermeture + événement analytics ; pas de paiement).
- Carte : pin départ après validation, `flyTo` sur le pickup, pins / route OSM comme sur le reste du site.

> **Statut actuel (avril 2026)** : la page **Go** est mise en pause côté évolutions.  
> Le flux actuel (recherche, sélection chauffeur, recap, checkout démo) est conservé tel quel ; intégration paiement réel (ex. Stripe Connect) prévue plus tard.

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
| `npm run build` | Build production dans `dist/`                    |
| `npm run calc-frais` | Exemple CLI distance + barème (`tsx`, voir `scripts/calc-frais-transport.ts`) |

Après un build : `npx vite preview` sert le contenu de `dist/` en local (script npm non défini dans `package.json`, commande Vite standard).

Pour tester les **routes API** comme en production : `vercel dev` (Vercel CLI).

## Structure utile (repères)

```
src/
  components/          # UI — Hero, Dashboard (chauffeur), composant carte accueil, SingleProjectNew, DriverNavigationView, …
  constants/            # defaultUserOrigin.ts, placeholders, …
  services/             # géocodage, itinéraires, fraisTransport…
  data/                 # nearbyDrivers.ts (mock chauffeurs), destinations, menu, projets…
api/                    # Serverless — dont geocode.ts (BAN + Nominatim), auth, contact, courses…
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

### Dernière mise à jour README — **8 mai 2026**

- **Géocodage / suggestions** : `/api/geocode` s’appuie sur la **Base Adresse Nationale** (précision numéro + voie, DROM 974) et fusionne avec **Nominatim** ; la page **Go** et les champs adresse compte client en bénéficient.
- **Authentification / session** : session unifiée client/chauffeur (avec contrôle de rôle côté routes chauffeur).
- **Compte client** : persistance locale **par email** (profil, lieux enregistrés) + annulation de course autorisée en `pending`/`accepted` avec confirmation.
- **Dashboard chauffeur** : persistance locale du **profil** (incl. photos) par email + feedback **toast** à l’enregistrement.
- *(Historique 5 mai 2026)* : périmètre Palto (accueil, **Go**, comptes, dashboard) ; stats `recharts` ; dashboard sans fond carte.

*README à jour : Palto — carte & directions **OSM** ; adresses **BAN + OSM** via **`/api/geocode`** ; **Go** `/go` ; **dashboard** chauffeur avec profil persisté ; mock chauffeurs ; déploiement Vercel (ex. `palto-six.vercel.app`).*
