# Rollout flags par environnement

## Objectif
Fournir une matrice d'activation simple pour piloter la migration progressive sans toucher au code.

## Flags disponibles
- `VITE_CHAUFFEUR_RIDES_PERSIST`
- `VITE_USE_PRICING_API`
- `VITE_USE_ORG_API`
- `VITE_USE_COMPLIANCE_API`
- `VITE_USE_CLIENT_RIDES_API`
- `VITE_USE_STATS_API`

## Regle d'interpretation
- `1`, `true`, `yes`, `on` => active.
- toute autre valeur (ou absente) => desactive.

## Matrice recommandee

### Dev local (iteration rapide)
- `VITE_CHAUFFEUR_RIDES_PERSIST=1`
- `VITE_USE_ORG_API=1`
- `VITE_USE_COMPLIANCE_API=1`
- `VITE_USE_CLIENT_RIDES_API=1`
- `VITE_USE_STATS_API=1`
- `VITE_USE_PRICING_API=0` (tant que route pricing API non finalisee)

### Staging (validation pre-prod)
- `VITE_CHAUFFEUR_RIDES_PERSIST=1`
- `VITE_USE_ORG_API=1`
- `VITE_USE_COMPLIANCE_API=1`
- `VITE_USE_CLIENT_RIDES_API=1`
- `VITE_USE_STATS_API=1`
- `VITE_USE_PRICING_API=0` ou `1` selon readiness endpoint pricing

### Production (rollout progressif)
- Phase 1:
  - `VITE_CHAUFFEUR_RIDES_PERSIST=1`
  - `VITE_USE_ORG_API=0`
  - `VITE_USE_COMPLIANCE_API=0`
  - `VITE_USE_CLIENT_RIDES_API=0`
  - `VITE_USE_STATS_API=0`
  - `VITE_USE_PRICING_API=0`
- Phase 2:
  - activer `VITE_USE_CLIENT_RIDES_API=1`, puis observer erreurs/UX.
- Phase 3:
  - activer `VITE_USE_STATS_API=1`, puis observer.
- Phase 4:
  - activer `VITE_USE_ORG_API=1` puis `VITE_USE_COMPLIANCE_API=1`.
- Phase 5:
  - activer `VITE_USE_PRICING_API=1` apres validation endpoint pricing.

## Procedure d'activation
1. Modifier les variables d'environnement de la cible (Vercel ou `.env.local`).
2. Redeployer l'app.
3. Executer le smoke test transversal (`/go`, dashboard chauffeur, compte client, organisation, conformite, stats).
4. Surveiller taux d'erreur API et regressions UX.

## Rollback rapide
- Revenir a `0` sur le flag fautif.
- Redeployer.
- Verifier que le fallback local prend bien le relais.
