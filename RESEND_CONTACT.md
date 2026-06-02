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
