# Formulaire de contact (Resend)

## Variables d'environnement (Vercel)

Dans le dashboard Vercel → Settings → Environment Variables, ajoute :

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Clé API Resend (obligatoire) |
| `RESEND_TO_EMAIL` | Email qui reçoit les messages (**obligatoire** côté API) |
| `RESEND_FROM` | Expéditeur (optionnel, ex. `Palto <noreply@votre-domaine.com>`) |
| `CRON_SECRET` | Secret partagé pour protéger les endpoints cron (fortement recommandé) |

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

- Notification chauffeur à la création (course instantanée ciblée) : envoyée dans `POST /api/rides/create`.
- Rappel client 30 min avant départ : endpoint cron `GET/POST /api/notifications/course-reminders`.
- Anti-doublon : table `course_notifications_log` (unique par course + type + destinataire).

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
