# Audit complet — Connexion totale

## Objectif
Consolider l'etat reel des connexions entre:
- dashboard chauffeur
- page client `/go`
- organisation flotte
- compte client
- backend API/Supabase

## Synthese executive
- **Connecte en backend**: `clients`, `courses`, `course_events` via `api/rides/create`, `api/chauffeur/rides`, `api/chauffeur/rides-action`.
- **Partiellement connecte**: Tarifs chauffeur -> `/go` (prix/rayon/options affichage) via `localStorage`.
- **Local/mock uniquement**: organisation, invitations, conformite, registration, partie compte client, plusieurs stats.

## Inventaire par domaine

### 1) Chauffeur Dashboard
- Ecran principal: `src/components/Dashboard.tsx`
- Courses/planning:
  - mode persistant si `VITE_CHAUFFEUR_RIDES_PERSIST=true`
  - sinon mode local/mock.
- Tarifs:
  - source: `src/constants/chauffeurRideSettingsStorage.ts`
  - persistance: `localStorage`
  - applique dans `/go` cote client.
- Compte/paiements:
  - majoritairement state local.
- Documents/conformite:
  - checklist locale (`chauffeurComplianceStorage`), sans backend documentaire.
- Organisation/invites:
  - localStorage (`chauffeurOrganizationStorage`, `chauffeurInboxStorage`), pas de persistance serveur.

### 2) Client page `/go`
- Ecran: `src/components/SingleProjectNew.tsx`
- Geocodage/snap/route: reel via Mapbox.
- Liste chauffeurs: mock `src/data/nearbyDrivers.ts`.
- Prix affiches:
  - dynamiques dans le front
  - influencables par preferences chauffeur locales.
- Checkout:
  - persiste la course via `createRideOrder` -> `api/rides/create`.

### 3) Backend API actuel
- `api/rides/create.ts`
  - cree client + course + event.
- `api/chauffeur/rides.ts`
  - liste courses visibles chauffeur selon statut/driver key.
- `api/chauffeur/rides-action.ts`
  - transitions de statut et events.
- Auth chauffeur:
  - basee sur token dashboard simple + `CHAUFFEUR_DRIVER_EXTERNAL_KEY`.

### 4) Supabase schema actuel
- Migrations: `supabase/migrations/0001_chauffeur_core.sql`, `0002_courses_enhancements.sql`
- Tables actives: `clients`, `courses`, `course_events`.
- Entites manquantes pour connexion totale:
  - organisations, membres, invitations
  - preferences tarifaires serveur
  - conformite/documents
  - profil chauffeur persistant
  - espace client "mes courses" structure.

## Matrice source de verite (actuel)
- **Courses**: backend (si flag persistance ON), sinon local.
- **Tarifs chauffeur**: localStorage.
- **Organisation flotte**: localStorage.
- **Conformite**: localStorage.
- **Client account rides**: mix API / stockage local selon les flags.
- **Stats**: derivees front (partiellement mockees).

## Risques principaux
- Multiples sources de verite concurrentes (local, mock, API).
- Identite chauffeur non unifiee (driver key env).
- Connexions inter-domaines incomplètes (org/conformite non utilisees par matching rides).
- Regression probable si migration "big bang" sans dual-read/dual-write.
