# Connexion Google / Facebook (Palto)

Connexion sociale **distincte** de l’OAuth Google Analytics (dashboard admin).

## Modèle comptes

- Identifiant OAuth : `provider` + `provider_user_id` (sub Google / id Facebook).
- Contrainte métier : **un lien OAuth par rôle** (`client` et `chauffeur` = deux comptes `app_accounts` même Google).
- Le `role` est signé dans le `state` OAuth et validé côté serveur à chaque callback.

## Variables d’environnement (Vercel + `.env.local`)

```bash
# URL publique (callbacks + redirections) — sans slash final
APP_BASE_URL=https://palto.re

# Google — créer une app OAuth dédiée « Palto Login » (pas Analytics)
PALTO_GOOGLE_OAUTH_CLIENT_ID=....apps.googleusercontent.com
PALTO_GOOGLE_OAUTH_CLIENT_SECRET=...

# Facebook — app Meta « Facebook Login »
PALTO_FACEBOOK_APP_ID=...
PALTO_FACEBOOK_APP_SECRET=...

# Optionnel : secret HMAC pour le state (sinon SUPABASE_JWT_SECRET)
# OAUTH_STATE_SECRET=...
```

Scopes demandés :

- Google : `openid email profile`
- Facebook : `email, public_profile`

## URIs de redirection autorisées

**`APP_BASE_URL` sur Vercel** = le domaine seul (`https://palto.re`).  
**Google Console** = le chemin **complet** ci-dessous (pas seulement `https://palto.re`).

Dans Google Cloud → **Credentials** → ton client OAuth **Web** :

| Champ Google | Valeur |
|--------------|--------|
| **Authorized JavaScript origins** | `https://palto.re` |
| **Authorized redirect URIs** | voir URI complète ci-dessous |

URI à enregistrer **caractère par caractère** (prod) :

```text
https://palto.re/api/auth?action=oauth-callback&provider=google
```

Facebook (si activé plus tard) :

```text
https://palto.re/api/auth?action=oauth-callback&provider=facebook
```

**Vérifier ce que Palto envoie vraiment** (après déploiement) :

```text
GET https://palto.re/api/auth?action=oauth-providers
```

Réponse JSON : `redirectUris.google` = URI à coller dans Google Console. Si ce n’est pas `palto.re`, corrige `APP_BASE_URL` sur Vercel (Production) et redéploie.

Local avec `vercel dev` (port 3000) :

```text
http://localhost:3000/api/auth?action=oauth-callback&provider=google
http://localhost:3000/api/auth?action=oauth-callback&provider=facebook
```

## Migration base

Appliquer `supabase/migrations/0013_app_oauth_identities.sql` :

- table `app_oauth_identities`
- `app_accounts.password_hash` nullable (comptes OAuth-only)

## Parcours utilisateur

| Contexte | Comportement |
|----------|----------------|
| Client — connexion / inscription | Google ou Facebook crée ou connecte le compte **client** |
| Chauffeur — connexion | OAuth uniquement si compte chauffeur déjà lié ou e-mail existant |
| Chauffeur — inscription | Formulaire classique (pas d’OAuth : données véhicule obligatoires) |
| Même Google client + chauffeur | Deux comptes séparés, deux sessions |

## API (dans `/api/auth`, pas de nouvelle Serverless Function)

| Action | Méthode | Rôle |
|--------|---------|------|
| `oauth-providers` | GET | Liste des providers configurés |
| `oauth-start` | GET | Redirige vers Google/Facebook |
| `oauth-callback` | GET | Callback provider → échange court `oauth_exchange` |
| `oauth-exchange` | POST | Échange → token session Palto (30 j) |

## Test local

1. `npm run dev:api` (ou `npx vercel dev`)
2. `npm run dev`
3. Renseigner les variables ci-dessus dans `.env.local`
4. Ouvrir `/fr/compte` ou `/fr/dashboard` → boutons visibles si providers configurés

## Facebook en production

Meta exige une **revue d’app** pour `email` en usage public. Prévoir délai administratif (gratuit).
