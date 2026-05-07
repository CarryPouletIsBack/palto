# Strategie de migration progressive

## Principes
- Pas de big-bang.
- Migration par domaine fonctionnel.
- Dual-read/dual-write temporaire.
- Feature flags pour activer progressivement.

## Feature flags cibles
- `VITE_CHAUFFEUR_RIDES_PERSIST` (deja existant): rides API vs local.
- `VITE_USE_PRICING_API`: prefs tarifs depuis API (fallback localStorage).
- `VITE_USE_ORG_API`: organisation/invites depuis API (fallback localStorage).
- `VITE_USE_COMPLIANCE_API`: conformite backend (fallback localStorage).
- `VITE_USE_CLIENT_RIDES_API`: compte client sur vraies courses.
- `VITE_USE_STATS_API`: heatmap/KPI depuis backend.

Voir aussi la matrice d'activation par environnement:
- `docs/reperes-palto/ROLLOUT-FLAGS-ENVIRONNEMENTS.md`

## Vague A — Stabiliser rides (socle)
1. Garder rides API en source de verite en staging/prod.
2. Uniformiser tous les calculs montant front sur une formule unique partagee.
3. Ajouter telemetry sur transitions de statut (`accept/start/complete/cancel`).

## Vague B — Tarifs chauffeur (dual)
1. **Read path**:
   - lire d'abord API pricing,
   - fallback localStorage si indisponible.
2. **Write path**:
   - ecrire API + localStorage en parallele (dual-write),
   - log des ecarts.
3. Quand stabilise:
   - lecture API only,
   - localStorage conserve en cache read-through.

## Vague C — Organisation/invites (dual)
1. Backfill initial depuis snapshots locaux (outil de migration admin).
2. Dual-read API puis local.
3. Dual-write API + local pendant 1 cycle de release.
4. Cutover API only + purge progressive des stores locaux.

## Vague D — Conformite documents
1. Introduire statut compliance serveur sans bloquer l'UI legacy.
2. Dual-read pour la decision `isRideAllowed`.
3. Basculer le blocage courses sur la source serveur.
4. Deprecier checklist locale.

## Vague E — Compte client + stats
1. Brancher `/api/client/rides` pour mes courses.
2. Basculer stats sur `/api/chauffeur/stats`.
3. Garder fallback local en cas de panne API (lecture seule).

## Strategie de compatibilite data
- Conserver temporairement `driver_external_key` tant que `driver_id` n'est pas generalise.
- Mapper explicitement les champs legacy dans un adapter layer.
- Journaliser les mismatchs de contrats (schema drift).

## Criteres de passage de vague
- 0 erreur bloquante sur E2E critique pendant 7 jours.
- taux d'erreurs API < 1%.
- absence de divergence detectee entre source legacy et source cible.

## Rollback
- Chaque vague doit etre desactivable par feature flag.
- Revenir en lecture legacy en < 5 minutes (sans migration destructive).
