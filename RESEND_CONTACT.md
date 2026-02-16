# Formulaire de contact (Resend)

## Variables d'environnement (Vercel)

Dans le dashboard Vercel → Settings → Environment Variables, ajoute :

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Clé API Resend (obligatoire) |
| `RESEND_TO_EMAIL` | Email qui reçoit les messages (optionnel, défaut : merault.anthony@gmail.com) |
| `RESEND_FROM` | Expéditeur (optionnel, ex. `Portfolio <noreply@ton-domaine.com>`) |

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
