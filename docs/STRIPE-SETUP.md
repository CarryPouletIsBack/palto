# Stripe — Palto (MVP juin)

## Compte test

Compte MCP connecté : **environnement de test Palto** (`acct_1TZUnV96s2Jp6YkI`).

## Variables d’environnement

### Local (`.env.local`) — minimum pour payer sur Go

```env
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Optionnel (même clé côté API) :

```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Mode test public : espèces uniquement

Pour une phase de test grand public sans paiement in-app, active :

```env
VITE_CASH_ONLY_PAYMENTS=true
```

Effets attendus :
- Le checkout n'affiche plus l'option carte.
- Les commandes partent avec `paymentMethod: cash`.
- Le flux Stripe (PaymentIntent / Elements) ne se lance pas.

Pour réactiver la carte ensuite (branche paiement ou go-live), repasse `VITE_CASH_ONLY_PAYMENTS=false` (ou supprime la variable) puis redeploy.

### Webhook : **pas obligatoire en dev**

Ne mets **pas** `STRIPE_WEBHOOK_SECRET=whsec_...` dans `.env.local` : ce n’est pas une clé du Dashboard, c’est un **secret de signature** généré uniquement quand tu configures un endpoint webhook (CLI ou Dashboard).

Sans cette variable, le paiement fonctionne quand même :

1. `POST /api/rides/create` crée la course + PaymentIntent
2. Le client confirme la carte (Stripe Elements)
3. `POST /api/stripe?action=confirm-authorized` synchronise l’autorisation en base

Le webhook sert surtout à resynchroniser si le navigateur se ferme avant l’étape 3.

### Vercel (production / preview)

Mêmes clés en mode **test** puis **live** au go-live.  
`STRIPE_WEBHOOK_SECRET` uniquement si tu exposes `?action=webhook` en prod (voir ci-dessous).

---

## Migration Supabase (sans `supabase db push`)

`supabase db push` exige la **CLI Supabase** installée et le projet **lié** (`supabase link`). Si la commande est introuvable ou échoue, utilise l’une de ces méthodes :

### Méthode A — SQL Editor (recommandé, 2 min)

1. Ouvre [SQL Editor — projet palto](https://supabase.com/dashboard/project/uzjplpdpbxvzhisxgwfz/sql/new)
2. Colle le contenu de `scripts/apply-migration-0008.sql` (identique à `supabase/migrations/0008_stripe_course_payments.sql`)
3. **Run**

Vérification : Table Editor → `courses` → colonnes `palto_fee_eur`, `stripe_payment_intent_id`, etc.

**Profil chauffeur multi-appareils (obligatoire si `/api/chauffeur?resource=profile` renvoie 500)** :

1. Même SQL Editor
2. Colle le contenu de `scripts/apply-migration-0010.sql` (table `chauffeur_profile_data`)
3. **Run**

Vérification : Table Editor → table `chauffeur_profile_data` visible.

### Méthode B — CLI Supabase (si tu veux `db push` plus tard)

```bash
brew install supabase/tap/supabase
cd /chemin/vers/palto
supabase login
supabase link --project-ref uzjplpdpbxvzhisxgwfz
supabase db push
```

---

## Webhook Stripe (optionnel)

URL : `https://<domaine>/api/stripe?action=webhook`  
Événements utiles : `payment_intent.amount_capturable_updated`, `payment_intent.canceled`

### Récupérer `STRIPE_WEBHOOK_SECRET` (`whsec_...`)

| Source | Comment |
|--------|---------|
| **Stripe CLI** (`stripe listen`) | Affiche `Ready! Your webhook signing secret is whsec_...` au démarrage |
| **Dashboard Stripe** | [Developers → Webhooks](https://dashboard.stripe.com/test/webhooks) → Add endpoint → URL ci-dessus → **Reveal** signing secret |

Colle ensuite dans `.env.local` / Vercel :

```env
STRIPE_WEBHOOK_SECRET=whsec_VRAIE_VALEUR
```

### Local avec Stripe CLI

Prérequis : API locale sur le port **3000** :

```bash
npm run dev:api
```

Installer la CLI (macOS) :

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to "http://localhost:3000/api/stripe?action=webhook"
```

Copie le `whsec_...` affiché par `listen` dans `.env.local`, redémarre `dev:api`.

**Si `brew install stripe/...` échoue** : installe [Stripe CLI](https://docs.stripe.com/stripe-cli#install) (binaire macOS) ou utilise uniquement le **Dashboard** + URL de preview Vercel (pas besoin de CLI pour le secret).

**Attention** : `npx stripe` installe le **SDK Node**, pas la CLI — ce n’est pas `stripe listen`.

`stripe apps upload` concerne les **Stripe Apps** (extensions Dashboard), pas ce flux Checkout.

---

## Logique métier

| Élément | Montant |
|--------|---------|
| Tarif chauffeur | Fixé par le chauffeur (page Go) |
| Commission Palto | **2 €** |
| Total autorisé | chauffeur + 2 € |

### Annulations

| Scénario | Stripe | Client |
|----------|--------|--------|
| A — Annulation juste après acceptation (< 3 min, pas en route) | `cancel` PI (release) | 0 € |
| B — Client annule en route (> 5 min ou `in_progress`) | `capture` **5 €** | 5 € (4 € chauffeur*, 1 € Palto) |
| C — No-show chauffeur | `capture` **5 €** | idem |
| Chauffeur annule tôt | `cancel` PI | 0 € |
| Fin de course | `capture` total | Débit course + 2 € |

\* Versement chauffeur : enregistré en `course_events` ; Stripe Connect en phase 2.

## Fichiers principaux

- `server/lib/stripeConfig.ts` — constantes
- `server/lib/rideStripePayments.ts` — autorisation / capture / annulation
- `api/rides/create.ts` — crée course + PaymentIntent
- `api/stripe/index.ts` — webhook + confirm-authorized
- `api/client/rides.ts` — annulation client
- `api/chauffeur/index.ts` — complete / cancel / **no_show**

## Chauffeur : client absent

Action API : `POST /api/chauffeur?resource=rides` body `{ courseId, action: "no_show" }`.

---

## Ce qui est branché (MVP)

| Zone | Stripe | Détail |
|------|--------|--------|
| **Page Go — checkout** | Oui | `PaymentIntent` + Elements ; **cartes enregistrées** si client connecté (Bearer + `customer` Stripe) |
| **Compte passager — carte + portefeuille** | Oui (si clés Stripe) | `SetupIntent` (carte enregistrée) + recharge portefeuille (`wallet_topup`) ; carte test `4242…` |
| **Dashboard chauffeur — IBAN / virement** | Non | Données locales (mock) |
| **Fin de course chauffeur** | Oui (si PI créé) | `capture` via API chauffeur |
| **Annulation / no-show** | Oui (si PI créé) | `cancel` / capture 5 € |

### Compte passager (carte + portefeuille)

1. Appliquer la migration **`0009`** : `scripts/apply-migration-0009.sql` dans le SQL Editor Supabase (`stripe_customer_id`, `wallet_balance_cents`, table `client_wallet_topups`).
2. **Gérer mon compte → Paiement → Ajouter un mode de paiement** : Stripe Elements + `SetupIntent` — carte test `4242…`, **adresse de facturation obligatoire** dans le formulaire.
3. **Portefeuille** : montant 5 / 10 / 20 € → **Continuer vers le paiement** → ouvre **Gérer le compte → Paiement** (ajout carte si besoin, puis paiement de la recharge). Pas de saisie carte directement sur l’onglet Portefeuille.

Actions API (`POST`, header `Authorization: Bearer <token client>`) :

- `?action=setup-intent`
- `?action=list-payment-methods`
- `?action=wallet-balance`
- `?action=wallet-topup-create` body `{ "amountEur": 10 }`
- `?action=wallet-topup-confirm` body `{ "paymentIntentId": "pi_…" }`

### Erreur 502 « Impossible de preparer le paiement Stripe »

Vérifier sur Vercel : `STRIPE_SECRET_KEY` (sk_test_…), pas seulement la clé publishable.  
Si Stripe échoue, la commande est **quand même enregistrée** (fallback) avec message `stripeSetupWarning` — le passager règle avec le chauffeur.

---

## « Ça ne fait rien » — diagnostic

### `supabase db push` sans effet visible

C’est **normal** si tu as déjà exécuté le SQL dans l’éditeur : les colonnes existent, il n’y a plus rien à appliquer. `db push` ne « répare » pas l’UI.

Pour que la CLI fonctionne quand même (historique des migrations) :

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
supabase login          # ouvre le navigateur — obligatoire une fois
cd ~/palto
supabase link --project-ref uzjplpdpbxvzhisxgwfz
supabase db push        # peut afficher « up to date » ou réappliquer sans erreur (IF NOT EXISTS)
```

Sans `supabase login`, tu auras : `Access token not provided`.

### Webhook sur Vercel : le secret ne suffit pas

1. **Deux secrets différents**
   - `whsec_...` affiché par **`stripe listen`** → uniquement pour le **local** (`localhost:3000`).
   - **Vercel** → secret du webhook créé dans le [Dashboard Stripe](https://dashboard.stripe.com/test/webhooks) pour l’URL **de production** :
     `https://palto-six.vercel.app/api/stripe?action=webhook`  
     (remplace par ton domaine Vercel réel.)

2. **Variables Vercel minimales** (Production + Preview), puis **Redeploy** :
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (celui du Dashboard pour cette URL, pas celui de `listen`)
   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (déjà en place)

3. **Le webhook ne change pas l’écran** : il met à jour la base en arrière-plan. Le parcours visible reste : formulaire carte → `confirm-authorized`.

4. **Vérifier dans Stripe** : Webhooks → ton endpoint → onglet **Attempts** : statut **200** = OK, **400** = mauvais secret ou corps invalide (corrigé côté code avec `bodyParser: false`).

5. **Code pas en prod** : si `git push` a échoué (auth GitHub), le déploiement Vercel n’a peut‑être pas le dossier `api/stripe/`. Il faut pousser le repo ou redéployer depuis le dashboard Vercel avec le dernier code.
