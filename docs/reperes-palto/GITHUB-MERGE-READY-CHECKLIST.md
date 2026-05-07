# GitHub merge-ready checklist (pre-prod)

## Branching recommande
- `preprod/bloquants-oauth-navigation-quality`
- `preprod/cleanup-legacy-and-css`
- `preprod/final-smoke-and-release-docs`

## Commandes de validation (repo `palto`)
```bash
npm run lint
npm run typecheck
npm run build
```

Optionnel (dette connue):
```bash
npm run typecheck:full
```

## Smoke tests manuels obligatoires

### Chauffeur
1. `/fr/chauffeur` -> bouton `Se connecter`.
2. Login chauffeur -> ouverture dashboard.
3. Lancer une course depuis planning/topbar.
4. Ouvrir `/fr/dashboard/navigation/C-2402` (et un id reel) :
   - cas avec snapshot session
   - cas direct URL (fallback API)
5. Verifier actions course: accepter/demarrer/terminer.

### Client
1. `/fr` -> flow de reservation Go.
2. Creation course (POST `/api/rides/create`).
3. Verification compte client + listing courses (`/api/client/rides`).
4. Formulaire contact (`/api/send`).

## Variables d'environnement a verifier (prod)
- `VITE_API_BASE_URL`
- `VITE_OPENSTREET_ACCESS_TOKEN`
- `VITE_CHAUFFEUR_RIDES_PERSIST`
- `VITE_USE_STATS_API`
- `VITE_USE_COMPLIANCE_API`
- `VITE_USE_ORG_API`
- `VITE_USE_CLIENT_RIDES_API`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DASHBOARD_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `RESEND_API_KEY`

## Revue de contenu statique/SEO
- `public/robots.txt`
- `public/sitemap.xml`
- `public/manifest.json`
- `index.html` (meta OG/Twitter)
- `public/content-for-crawlers.html`

## Points de dette a garder en ticket (hors blocage release immediate)
- Warnings lint `react-hooks/exhaustive-deps`.
- `typecheck:full` encore en echec (legacy TS historique).
- Reduction progressive des `!important` dans `SingleProject.css`.
- Optimisation chunks build (code splitting).
