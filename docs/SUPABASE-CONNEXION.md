# Connexion Supabase — Palto

## État du projet Supabase

| Élément | Valeur |
|--------|--------|
| Projet | **palto** |
| Référence | `uzjplpdpbxvzhisxgwfz` |
| URL API | `https://uzjplpdpbxvzhisxgwfz.supabase.co` |
| Dashboard | [Ouvrir le projet](https://supabase.com/dashboard/project/uzjplpdpbxvzhisxgwfz) |

Tables principales déjà en place : `app_accounts`, `app_sessions`, `clients`, `courses`, `course_events`, `client_profile_data`, `chauffeur_presence` (GPS chauffeurs en ligne pour la page Go).

## Chauffeurs en ligne (page Go)

- **Heartbeat chauffeur** : `POST /api/chauffeur?resource=presence` (même fonction Vercel `api/chauffeur/index.ts`, pas de 13ᵉ route).
- **Liste à proximité** : `GET /api/client/rides?mode=nearby&lat=…&lng=…&radiusKm=20` (même fonction `api/client/rides.ts`).
- Le dashboard chauffeur envoie le GPS toutes les ~20 s tant que la page est ouverte (indépendant de `VITE_CHAUFFEUR_RIDES_PERSIST`). La dernière position reste visible sur Go **2 h** après le dernier envoi (fermeture du dashboard incluse). Bouton **« Actualiser ma localisation »** pour forcer une mise à jour.
- Si la liste Go est vide : vérifier dans Supabase que `chauffeur_presence` a une ligne de moins de 2 h pour le compte chauffeur (sinon **Actualiser ma localisation** sur le dashboard).

**La production** (`palto-six.vercel.app`) utilise Supabase via les variables Vercel `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (les routes `/api/*` répondent, ex. `/api/client/profile` → 401 sans token = base joignable).

**Le dev local** ne parle pas à la base tant que `.env.local` n’a pas ces variables **et** que tu lances `npm run dev:api` (Vercel CLI via `npx`).

---

## 1. Compléter `.env.local` (racine du repo)

Copie les clés depuis [Settings → API](https://supabase.com/dashboard/project/uzjplpdpbxvzhisxgwfz/settings/api) :

- **Project URL** → `SUPABASE_URL` et `VITE_SUPABASE_URL`
- **anon / publishable** → `VITE_SUPABASE_ANON_KEY` (côté navigateur uniquement)
- **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY` (serveur / `vercel dev` uniquement, jamais en `VITE_`)

Exemple (à adapter avec ta vraie service role) :

```env
SUPABASE_URL=https://uzjplpdpbxvzhisxgwfz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6anBscGRwYnh2emhpc3hnd2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE1NjAyNSwiZXhwIjoyMDkzNzMyMDI1fQ.YYNLbtGCeRbMPi_i80XBN7DkkT81wrEcOciIW_CEvlc

VITE_SUPABASE_URL=https://uzjplpdpbxvzhisxgwfz.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_j79OVGm9c3V8paiL0L6eMQ_s4QhVWC8

VITE_API_BASE_URL=/api
```

Optionnel : `SUPABASE_JWT_SECRET` (Settings → API → JWT Secret) pour Realtime ; `VITE_USE_CLIENT_RIDES_API=1` (défaut activé).

---

## 2. Lancer le stack local (front + API + base)

```bash
# Front + API (charge .env.local pour les routes /api)
npm run dev:api
```

Équivalent : `npx vercel dev` (pas besoin d’installer Vercel globalement).

`npm run dev` seul = **Vite sur :5173** (pas d’API).  
**`npm run dev:api`** = Vite **:5173** + API Vercel **:3000** (script `scripts/dev-with-api.mjs`) → ouvre **http://localhost:5173/fr/dashboard**.

Vérifier :

```bash
npm run check:supabase
```

---

## 3. Skills Supabase (`npx skills add supabase/agent-skills`)

Ça installe des **guides pour l’assistant Cursor** (bonnes pratiques Postgres, etc.).  
Ce n’est **pas** la connexion de l’app : la connexion = `.env.local` + `vercel dev` + variables Vercel en prod.

Pour que Cursor interroge ton projet via MCP : authentifier le serveur **Supabase** dans Cursor (Settings → MCP) — le plugin peut lister tables et appliquer des migrations.

### Migrations SQL sans CLI

Si `supabase db push` n’est pas disponible (CLI non installée ou projet non lié) :

1. [SQL Editor](https://supabase.com/dashboard/project/uzjplpdpbxvzhisxgwfz/sql/new)
2. Exécuter le fichier concerné dans `supabase/migrations/` ou `scripts/` (ex. `scripts/apply-migration-0008.sql` pour Stripe)

Installer la CLI plus tard : `brew install supabase/tap/supabase`, puis `supabase link --project-ref uzjplpdpbxvzhisxgwfz`.

---

## 4. Vercel (production)

Dans [Vercel → palto → Settings → Environment Variables](https://vercel.com), vérifier que pour **Production** et **Preview** :

- `SUPABASE_URL` = URL du projet
- `SUPABASE_SERVICE_ROLE_KEY` = service role (non vide)

Puis redéployer. Si une variable est vide, les API renvoient `503 Service indisponible`.

---

## Connexion (email / mot de passe)

- Saisir **email + mot de passe** (pas l’UUID compte).
- Depuis **n’importe quel** bouton « Se connecter » (accueil, Go, dashboard), Palto essaie le type de compte adapté à la page puis l’autre si besoin, et **redirige** vers `/compte` (passager) ou `/dashboard` (chauffeur).
- Même email pour passager et chauffeur = souvent **deux mots de passe différents** (deux inscriptions). Le dashboard chauffeur n’accepte que le mot de passe **chauffeur** (reconnexion même email OK).

Réinitialiser un mot de passe (local, avec `.env.local` + service role) :

```bash
npm run reset-password -- chauffeur pauzatoceane@gmail.com NouveauMotDePasse
npm run reset-password -- client pauzatnathan980@gmail.com NouveauMotDePasse
```

## GPS chauffeur iOS (à reprendre)

Sur iPhone, la position dashboard peut rester bloquée après autorisation dans Réglages : il faut souvent **réappuyer** sur « Activer ma position » (geste utilisateur obligatoire). Ce n’est en général **pas** lié à l’URL Vercel preview ni au mode privé seul. Voir fil de debug session 2026-05.

---

## Dépannage rapide

| Symptôme | Cause probable |
|----------|----------------|
| « Service indisponible » / impossible de joindre l’API | Local : `npm run dev` seul (pas d’API). Lancer `npm run dev:api` ; si timeout Vercel, fermer les autres Vite et réessayer |
| « Mot de passe incorrect » en prod | Bon email mais mauvais mot de passe, ou écran client vs chauffeur inversé |
| « Email incorrect » | Email inconnu pour ce **rôle** (ex. Nathan sur écran chauffeur) |
| Profil / lieux OK en prod, vides en local | `.env.local` sans Supabase ou seulement `npm run dev` |
| `503` sur `/api/client/profile` | `SUPABASE_*` manquant sur Vercel ou en local |
| Realtime courses ne bouge pas | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` + `SUPABASE_JWT_SECRET` |
| MCP Supabase « read-only » sur migrations | Utiliser le dashboard SQL ou CLI liée au projet |
