# Rollout et tests E2E transverses

## Objectif
Deployer la connexion totale sans regression visible chauffeur/client.

## Environnements
- **Dev**: validation rapide locale + mocks.
- **Staging**: source de verite API active sur toutes les features connectees.
- **Prod canary**: activation progressive par feature flag.
- **Prod global**: activation complete apres validation.

## Sequence de rollout
1. Activer en staging:
   - pricing API
   - org API
   - compliance API
   - client rides API
   - stats API
2. Executer campagne E2E complete.
3. Activer en prod canary (10% chauffeurs internes).
4. Surveiller 48h.
5. Monter a 50%, puis 100%.

## Checklist pre-release
- [ ] Contrats API valides (zod + types front).
- [ ] Feature flags configurés par environnement.
- [ ] Logs + requestId visibles dans observabilite.
- [ ] Dashboards erreurs API et taux de succes actifs.
- [ ] Plan rollback teste en staging.

## Matrice E2E critique

### Flux 1 — Client `/go` -> course instantanee -> chauffeur
1. Client saisit depart/destination.
2. Liste chauffeurs affichee avec prix recalcules.
3. Commande confirmee.
4. Course visible dans dashboard chauffeur cible.
5. Chauffeur accepte -> demarre -> termine.
6. Etat final visible cote client.

### Flux 2 — Tarifs chauffeur -> impact `/go`
1. Chauffeur change multiplicateur/rayon/options.
2. Enregistre.
3. Client ouvre `/go`.
4. Verifier impact:
   - rayon recherche,
   - prix affiches,
   - badges service.

### Flux 3 — Organisation flotte
1. Admin cree organisation.
2. Invite un membre.
3. Membre accepte.
4. Mise a jour zone/disponibilite.
5. Verifier visibilite coherente sur ecrans org.

### Flux 4 — Conformite
1. Chauffeur conforme -> courses autorisees.
2. Simuler doc expire -> blocage courses.
3. Soumettre renouvellement.
4. Validation -> deblocage.

### Flux 5 — Compte client + stats
1. Client voit ses courses reelles.
2. Chauffeur voit stats cohérentes avec historique.
3. Heatmap et ratios stables sur 7d/30d/365d.

## Verification non-fonctionnelle
- Temps de reponse P95 API < 500ms sur endpoints critiques.
- Aucune erreur JS bloquante sur dashboard/go.
- Coherence montants (go, recap, checkout, createRideOrder).

## Plan rollback
- Desactiver flags domaines en sens inverse:
  1. stats
  2. client rides
  3. compliance
  4. organisation
  5. pricing
- Conserver rides API active sauf incident majeur.
- Postmortem obligatoire si rollback prod.
