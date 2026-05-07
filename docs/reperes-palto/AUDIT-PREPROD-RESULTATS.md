# Audit pre-prod Palto — execution

## Scope
- Repo principal: `/Users/oceanepauzat/palto`
- Repo miroir compare: `/Users/oceanepauzat/palto chauffeur`

## 1) Bloquants traites

### OAuth Google
- **Probleme**: le front appelait `/api/google-auth/token` sans endpoint backend.
- **Correction**: endpoint ajoute dans `/Users/oceanepauzat/palto/api/google-auth/token.ts`.
- **Resultat**: alignement front/back pour l'echange `code -> token`.

### Route chauffeur directe `/fr/dashboard/navigation/:id`
- **Probleme**: acces direct cassait si `sessionStorage` vide.
- **Correction**: fallback API ajoute dans `/Users/oceanepauzat/palto/src/components/DriverNavigationView.tsx`:
  - lecture snapshot session
  - sinon chargement des courses via `/api/chauffeur/rides`
  - rehydratation d'un snapshot si la course existe
- **Resultat**: route plus robuste hors lancement immediat depuis le planning.

### Outillage qualite minimal
- **Scripts ajoutes** dans `/Users/oceanepauzat/palto/package.json`:
  - `lint`
  - `typecheck`
  - `typecheck:full`
  - `test:smoke`
  - `verify`
- **Config**:
  - `eslint.config.js` ajuste pour execution stable en base legacy.
  - `tsconfig.app.json`: ajout `ignoreDeprecations`.

## 2) Validation parcours pages -> API

### Chauffeur
- Entree: `/fr/chauffeur` via `/Users/oceanepauzat/palto/src/components/HeroChauffeur.tsx`
- Navigation principale: `/Users/oceanepauzat/palto/src/App.tsx` + `/Users/oceanepauzat/palto/src/components/Dashboard.tsx`
- API branchees:
  - `/api/auth/login`
  - `/api/chauffeur/rides`
  - `/api/chauffeur/rides-action`
  - `/api/chauffeur/stats`
  - `/api/chauffeur/compliance`
  - `/api/chauffeur/organization`

### Client
- Entree: `/fr` via `/Users/oceanepauzat/palto/src/components/Hero.tsx`
- Reservation: `/Users/oceanepauzat/palto/src/components/SingleProjectNew.tsx` -> `/api/rides/create`
- Compte client: `/Users/oceanepauzat/palto/src/components/ClientCompteDashboard.tsx`
- API branchees:
  - `/api/client/rides`
  - `/api/send`

### Contrats API
- Le document `/Users/oceanepauzat/palto/docs/reperes-palto/CONTRATS-API-CIBLES.md` contient encore des endpoints cibles non implementes tels quels (`pricing-preferences`, `organizations/current`, `compliance-status`).
- Action recommandee: aligner ce document sur les endpoints reels du dossier `/api`.

## 3) Nettoyage legacy / fichiers parasites

### Supprime dans repo principal
- `/Users/oceanepauzat/palto/src/components/TarotCard.tsx`
- `/Users/oceanepauzat/palto/src/components/TarotCard.css`
- `/Users/oceanepauzat/palto/src/components/ProjectCharts.tsx`
- `/Users/oceanepauzat/palto/src/components/ProjectCharts.css`
- `/Users/oceanepauzat/palto/@/components/ScrollReveal.tsx`
- `/Users/oceanepauzat/palto/@/components/ui/safari.tsx`

### Dette CSS `!important`
- Releve actuel:
  - `SingleProject.css`: tres eleve
  - `ProjectCoverCarousel.css`: eleve
  - `Dashboard.css`: present
  - `DriverNavigationView.css`: present
- Nettoyage effectue:
  - suppression d'un `!important` non critique dans `MobileSearchBar.css`.
- Prochaine passe recommandee:
  - cibler `SingleProject.css` en priorite (zone la plus chargee).

## 4) Statut verification technique

Commandes executees sur `/Users/oceanepauzat/palto`:
- `npm run lint` -> **OK** (warnings restants, pas d'erreur bloquante)
- `npm run typecheck` -> **OK** (profil minimal node)
- `npm run build` -> **OK** (warning chunks volumineux)

Points restants avant prod:
- `npm run typecheck:full` est encore en echec (dette TS historique hors scope correctifs rapides).
- Warnings lint `react-hooks/exhaustive-deps` a traiter progressivement.
- Taille chunks JS a reduire (code-splitting).

## 5) Prepa GitHub (merge-ready)

Checklist recommandee pour la PR prod:
1. Inclure les fixes bloquants OAuth + navigation directe.
2. Inclure le nettoyage des fichiers orphelins ci-dessus.
3. Joindre ce rapport dans la description PR.
4. Exiger en CI: `npm run lint`, `npm run typecheck`, `npm run build`.
5. Ajouter un ticket de dette pour `typecheck:full` + reduction warnings hooks.

## 6) Migration cartographie OpenStreet

- Migration executee: logique carte conservee, provider remplace de Mapbox vers OpenStreet.
- Services migrés:
  - `src/services/mapboxGeocoding.ts` -> Nominatim (search/reverse)
  - `src/services/mapboxDirections.ts` -> OSRM route
  - `src/services/mapboxSnapToRoad.ts` -> OSRM nearest
- Style carte GL remplace par styles OSM dans `src/components/HomeMapboxBackground.tsx`.
- Variable env projet mise a jour:
  - `VITE_OPENSTREET_ACCESS_TOKEN` (facultatif selon config), remplace l'ancienne variable Mapbox.
