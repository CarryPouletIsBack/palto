# Monitoring beta — plans gratuits Vercel + Supabase

Guide pour le **premier test grand public** de Palto ([palto-six.vercel.app](https://palto-six.vercel.app)) hébergé sur **Vercel Hobby** et **Supabase Free**.

> Les quotas exacts évoluent chez Vercel et Supabase : **vérifie toujours** les dashboards officiels avant une campagne. Ce document donne des **seuils pratiques** pour Palto, pas un contrat de capacité.

## Ce qui consomme le plus (spécifique Palto)

| Source | Fréquence | Impact |
|--------|-----------|--------|
| Heartbeat chauffeur GPS | ~1 POST / 20 s par chauffeur connecté | Vercel invocations + écritures `chauffeur_presence` |
| Dashboard chauffeur (courses) | toutes les 25–60 s | `GET /api/chauffeur?resource=rides` |
| Dashboard chauffeur (stats) | toutes les 30 s | `GET /api/chauffeur?resource=stats` |
| Page Go — chauffeurs proches | toutes les ~20 s (carte ouverte) | `GET /api/client/rides?mode=nearby` |
| Realtime (si activé) | connexions persistantes | Connexions Supabase Realtime |
| Première visite PWA | 1× par appareil | Bande passante (~3–4 Mo precache) |

**Conclusion** : la limite n’est pas le nombre d’inscriptions, mais les **chauffeurs en ligne en parallèle** et les **pics de trafic simultané**.

---

## Capacité indicative (beta La Réunion)

| Profil | Inscrits / mois | Simultané (pic) | Chauffeurs GPS actifs | Verdict free |
|--------|-----------------|-----------------|------------------------|--------------|
| **Confortable** | 20–80 | 5–15 | 2–5 | OK |
| **À surveiller** | 80–200 | 15–40 | 5–12 | OK avec monitoring quotidien |
| **Limite** | 200+ | 40–80 | 12–20 | Ralentissements probables |
| **Hors free** | 500+ | 100+ | 20+ | Passer Pro ou réduire le polling |

Recommandation pour le **lien partagé initial** : viser **≤ 50 testeurs actifs la 1ʳᵉ semaine** et **≤ 5 chauffeurs connectés en même temps**.

---

## Quotas officiels (référence — mai 2026)

### Vercel Hobby

| Métrique | Ordre de grandeur |
|----------|-------------------|
| Bande passante | ~100 Go / mois |
| Exécution fonctions | fair use (durée max ~10 s / invocation) |
| Builds | 1 concurrent |
| Fonctions serverless | **9** routes dans ce repo (limite Hobby : 12 fichiers `api/`) |

**Dashboard** : [vercel.com](https://vercel.com) → projet **palto-six** → **Usage** / **Observability** / **Logs**.

### Supabase Free

| Métrique | Ordre de grandeur |
|----------|-------------------|
| Base de données | ~500 Mo |
| Egress (sortie DB) | ~5 Go / mois |
| Stockage fichiers | ~1 Go |
| Auth MAU | très large sur free (souvent 50k+) — rarement le goulot en beta |
| Realtime | connexions simultanées limitées |
| Inactivité | projet **en pause** après ~7 jours sans activité sur la DB |

**Dashboard** : [supabase.com/dashboard](https://supabase.com/dashboard) → projet Palto → **Reports** / **Database** → **Settings** → **Usage**.

---

## Checklist monitoring (quotidienne en beta)

Cocher ou noter la date à chaque contrôle (surtout les 2 premières semaines après partage du lien).

### Vercel

- [ ] **Usage → Bandwidth** : &lt; 50 % du quota mensuel en milieu de mois (alerte si &gt; 70 %).
- [ ] **Logs** (`/api/chauffeur`, `/api/client/rides`, `/api/rides/create`) : pas de pic continu de **5xx** ou **TIMEOUT**.
- [ ] **Functions** : durée moyenne &lt; 3 s ; pics isolés OK, pics constants sur `presence` = investiguer.
- [ ] **Deployments** : dernier déploiement prod OK ; variables d’env critiques présentes (`SUPABASE_*`, `STRIPE_*` si besoin).
- [ ] **Cron** : `/api/cron/expire-instant-pending` (02:00 UTC) — au moins 1 exécution réussie / jour dans les logs (si plan Hobby autorise le cron).

### Supabase

- [ ] **Database → Usage** : **Disk** &lt; 60 % (~300 Mo utilisés).
- [ ] **Egress** : &lt; 50 % du quota en milieu de mois (souvent le 1er plafond atteint).
- [ ] **Realtime** (si utilisé) : connexions actives cohérentes avec le nombre d’utilisateurs (pas de fuite).
- [ ] **Auth** : pas de pic anormal d’échecs login (brute force / mauvaise config).
- [ ] Projet **actif** (pas en pause) : une requête SQL ou ouvrir le dashboard suffit à réveiller.

### Application (smoke manuel — 5 min)

- [ ] `GET https://palto-six.vercel.app/` → **200**
- [ ] `GET https://palto-six.vercel.app/api/geocode?mode=search&q=Saint-Denis` → **200** + JSON
- [ ] Parcours **Go** : recherche adresse, liste chauffeurs (ou message clair si aucun)
- [ ] **Compte client** : connexion, liste courses
- [ ] **Dashboard chauffeur** : connexion, planning sans fausses stats sur compte neuf (demandes en attente ≠ km parcourus)
- [ ] Bandeau beta / modales mobile : notifications et options **devant** le menu (z-index)

### Variables beta recommandées (prod)

```env
# Phase test public — paiement espèces uniquement (réduit charge Stripe)
VITE_CASH_ONLY_PAYMENTS=true
```

Voir [STRIPE-SETUP.md](./STRIPE-SETUP.md). Retirer ou passer à `false` au go-live carte.

---

## Seuils d’alerte → actions

| Signal | Seuil | Action |
|--------|-------|--------|
| Bande passante Vercel | &gt; 70 % du mois | Limiter diffusion du lien ; vérifier assets / cache PWA |
| Egress Supabase | &gt; 70 % du mois | Réduire polling ; limiter `limit` sur listes courses ; envisager **Pro** |
| Erreurs 5xx API | &gt; 1 % des requêtes sur 1 h | Logs Vercel + Supabase ; cold starts vs bug |
| DB Supabase | &gt; 400 Mo | Nettoyer données test ; archiver courses ; **Pro** |
| Chauffeurs simultanés | &gt; 10 avec GPS | Prévoir **Pro** ou augmenter `HEARTBEAT_MS` (ex. 45 s) |
| Projet Supabase en pause | email Supabase | Ouvrir dashboard / exécuter requête ; upgrade si récurrent |
| Temps réponse API | &gt; 5 s médian | Vérifier région Vercel vs Supabase ; index SQL manquants |

---

## Quand passer en payant ?

### Rester en free si

- Moins de ~15 utilisateurs **en même temps**
- Moins de ~5 chauffeurs avec app ouverte + GPS
- Egress et bandwidth &lt; 50 % à mi-mois
- Pas d’incidents métier bloquants (juste lenteur occasionnelle)

### Envisager **Supabase Pro** (~25 $/mois) si

- Egress ou connexions Realtime proches du plafond **deux mois de suite**
- Base &gt; 400 Mo ou besoin de backups / support
- Projet mis en pause pendant la beta (inacceptable pour les testeurs)

### Envisager **Vercel Pro** si

- Bande passante &gt; 80 Go / mois de façon récurrente
- Besoin d’équipe, analytics avancées, SLA
- Limites de durée / concurrence des fonctions atteintes en heure de pointe

Ordre typique pour Palto : **Supabase Pro d’abord** (DB + egress + Realtime), puis **Vercel Pro** si le trafic front/API explose.

---

## Optimisations sans upgrade (rapides)

1. **Beta** : `VITE_CASH_ONLY_PAYMENTS=true` (moins d’appels Stripe).
2. **Communication** : ne pas envoyer le lien à des milliers de personnes d’un coup.
3. **Chauffeurs** : fermer l’app / désactiver GPS quand pas en service (arrête le heartbeat).
4. **Realtime** : si non indispensable en beta, désactiver `VITE_SUPABASE_*` côté clients qui n’en ont pas besoin (réduit connexions — à évaluer selon parcours).
5. **Code** (chantier dédié) : augmenter intervalles polling dashboard / présence ; pagination stricte sur `GET rides` (déjà `limit` côté API — vérifier les appels).

---

## Contacts & liens utiles

| Ressource | URL |
|-----------|-----|
| Prod | https://palto-six.vercel.app |
| Vercel Usage | Dashboard projet → Usage |
| Supabase Usage | Dashboard projet → Reports |
| Connexion Supabase | [SUPABASE-CONNEXION.md](./SUPABASE-CONNEXION.md) |
| Déploiement | [DEPLOY.md](../DEPLOY.md) |
| Stripe / cash-only | [STRIPE-SETUP.md](./STRIPE-SETUP.md) |

---

*Dernière révision : mai 2026 — aligné sur le code Palto (heartbeat 20 s, polling dashboard 25–60 s, 9 fonctions `/api`).*
