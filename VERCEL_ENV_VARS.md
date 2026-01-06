# Variables d'environnement Vercel pour Strava

## Variables à configurer dans Vercel

Allez sur [vercel.com](https://vercel.com) → Votre projet → Settings → Environment Variables

Ajoutez ces **5 variables** (sans le préfixe `VITE_` pour les API routes) :

### Variables requises :

1. **STRAVA_CLIENT_ID**
   - Valeur : Votre Client ID Strava
   - Exemple : `193706`

2. **STRAVA_CLIENT_SECRET**
   - Valeur : Votre Client Secret Strava
   - Exemple : `294ac27e5949d20abedb6f3c54a50b4c848a2240`

3. **STRAVA_REFRESH_TOKEN**
   - Valeur : Votre Refresh Token Strava
   - Exemple : `04fff756dc055d1335b1936dda03f98cc25027dd`

4. **STRAVA_ACCESS_TOKEN**
   - Valeur : Votre Access Token Strava actuel
   - Exemple : `372e8b59c1825f8ff0d6dfa3a8635d44fe9abf96`
   - ⚠️ Note : Ce token expire après 6 heures, mais sera automatiquement rafraîchi

5. **STRAVA_TOKEN_EXPIRES_AT**
   - Valeur : Timestamp Unix de l'expiration du token
   - Exemple : `1767643565`
   - Format : Nombre de secondes depuis le 1er janvier 1970

## Important

- **N'utilisez PAS le préfixe `VITE_`** pour ces variables dans Vercel
- Les variables avec `VITE_` sont pour le client (navigateur)
- Les variables sans `VITE_` sont pour les API routes (serveur)
- Le code vérifie les deux formats pour compatibilité

## Après configuration

1. Relancez `vercel dev`
2. Répondez **Y** quand il demande de télécharger les variables
3. Vérifiez que le fichier `.vercel/.env.local` est créé

## Où trouver ces valeurs ?

Si vous avez un projet `strava-api-client` qui fonctionne, vous pouvez copier les valeurs depuis :
- Son fichier `.env` ou `.env.local`
- Ou depuis votre compte Strava : https://www.strava.com/settings/api


