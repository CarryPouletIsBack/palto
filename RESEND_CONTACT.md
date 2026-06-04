# Formulaire de contact (Resend)

## Variables d'environnement (Vercel)

Dans le dashboard Vercel → Settings → Environment Variables, ajoute :

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Clé API Resend (obligatoire) |
| `RESEND_TO_EMAIL` | Email qui reçoit les messages contact (**obligatoire** pour `/api/send`) |
| `RESEND_FROM` | Expéditeur (ex. `Palto <noreply@votre-domaine.com>`) — reset mot de passe + courses |
| `APP_BASE_URL` | URL publique du site (ex. `https://palto-six.vercel.app`) — liens dans l’email « mot de passe oublié » |
| `CRON_SECRET` | Secret partagé pour protéger les endpoints cron (fortement recommandé) |

## Mot de passe oublié (client + chauffeur)

Flux déjà côté API : `POST /api/auth?role=client|chauffeur&action=forgot-password` puis page `/fr/reset-password?role=…&token=…`.

1. **Vercel** : `RESEND_API_KEY`, `RESEND_FROM` (domaine vérifié sur Resend), `APP_BASE_URL`, Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
2. **Local** : `npm run dev:api` (`vercel dev`) — `npm run dev` seul ne expose pas `/api/auth`.
3. Sur les modales **Connexion client** / **Connexion chauffeur** : saisir l’e-mail → **Mot de passe oublié ?** → message de confirmation (réponse neutre si l’e-mail n’existe pas).
4. L’utilisateur ouvre le lien reçu (30 min), définit un nouveau mot de passe, puis se reconnecte.

Test rapide :

```bash
curl -s -X POST "http://localhost:3000/api/auth?role=client&action=forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"votre@email.com"}'
```

Réponse attendue : `{"success":true}` (même si l’e-mail est inconnu, pour éviter l’énumération des comptes).

## Test en local

L’API `/api/send` tourne côté Vercel. En local, lance :

```bash
vercel dev
```

Puis ouvre le site et va sur la page Contact. Avec `npm run dev` seul, l’appel à `/api/send` échouera (pas de backend).

## Anti-spam

- **Honeypot** : champ invisible `website` dans le formulaire ; si un bot le remplit, l’API rejette.
- **Optionnel** : limite par IP ou CAPTCHA si besoin.

## Dépendances

- **resend** : envoi d’emails
- **react-hook-form** + **zod** + **@hookform/resolvers** : formulaire et validation
- **sonner** : toasts de succès/erreur

## Notifications courses (chauffeur/client)

- **Course immédiate ou programmée** : un seul email au **chauffeur choisi** par le client à la création (`POST /api/rides/create`).
- **Changement de statut** (`acceptée`, `en cours`, `terminée`, `annulée`, no-show) : email au **client** et au **chauffeur assigné** (si connu), selon qui a agi.
- Rappel client 30 min avant départ : endpoint cron `GET/POST /api/notifications/course-reminders` (voir plan Hobby ci-dessous).
- Anti-doublon : table `course_notifications_log` (unique par course + type + destinataire).

### Depannage : je ne recois aucun mail course

1. **Vercel** → Settings → Environment Variables (Production) :
   - `RESEND_API_KEY`, `RESEND_FROM` (ex. `Palto <team@palto.re>`)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - puis **Redeploy** (obligatoire apres changement d env).
2. **Supabase** : migration `0012_course_notifications.sql` executee (table `course_notifications_log`).
3. **Resend** → [Emails](https://resend.com/emails) : voir si les envois sont `delivered` ou `bounced`.
4. **Test API** (apres deploy) :
   ```bash
   curl -s "https://palto.re/api/notifications/email-health" \
     -H "Authorization: Bearer VOTRE_CRON_SECRET"
   ```
   Puis envoi test :
   ```bash
   curl -s -X POST "https://palto.re/api/notifications/email-health" \
     -H "Authorization: Bearer VOTRE_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"to":"votre@email.com"}'
   ```
5. **Vercel** → Logs → filtrer `rideEmailNotifications` ou `rides/create` apres une commande test.
6. Verifier que l **email du compte chauffeur** (table `app_accounts`) = la boite que vous ouvrez.
7. Pour une **annulation avant acceptation** : seul le client est notifie (pas de chauffeur assigne).

### Cron Vercel et plan Hobby

Sur le plan **Hobby**, Vercel n’accepte qu’**un cron par jour maximum** par projet ([doc officielle](https://vercel.com/docs/cron-jobs/usage-and-pricing)). Une expression du type `*/5 * * * *` **fait échouer le déploiement**.

Dans `vercel.json`, seul le cron quotidien d’expiration (`0 2 * * *`) est déclaré. Pour les rappels ~30 min avant course :

1. **Passer en Pro** puis remettre dans `vercel.json` :
   ```json
   { "path": "/api/notifications/course-reminders", "schedule": "*/5 * * * *" }
   ```
2. **Ou** déclencher l’endpoint depuis un cron externe (ex. [cron-job.org](https://cron-job.org)) toutes les 5–15 min :
   ```http
   GET https://palto.re/api/notifications/course-reminders
   Authorization: Bearer <CRON_SECRET>
   ```
