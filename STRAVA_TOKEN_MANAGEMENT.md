# 🔄 Gestion des tokens Strava

## 📋 Vue d'ensemble

Les tokens d'accès Strava expirent après **6 heures**. Pour garantir que votre application fonctionne correctement, vous devez renouveler les tokens régulièrement.

Ce projet utilise deux approches complémentaires :
1. **Script Node.js** (`C:\Users\Anthony\strava-api-client`) - Pour le renouvellement automatique des tokens
2. **Service TypeScript** (`src/services/stravaService.ts`) - Pour l'utilisation dans l'application React

## 🚀 Utilisation du script Node.js

Le script Node.js dans `C:\Users\Anthony\strava-api-client` gère automatiquement le rafraîchissement des tokens avant chaque requête API.

### Installation

```bash
cd C:\Users\Anthony\strava-api-client
npm install
```

### Configuration

1. Créez un fichier `.env` dans le dossier `strava-api-client` (vous pouvez copier `.env.example`)

2. Remplissez vos credentials Strava :
```env
STRAVA_CLIENT_ID=votre_client_id
STRAVA_CLIENT_SECRET=votre_client_secret
STRAVA_ACCESS_TOKEN=votre_access_token_initial
STRAVA_REFRESH_TOKEN=votre_refresh_token_initial
STRAVA_EXPIRES_AT=timestamp_unix_expiration
```

### Obtenir les tokens initiaux

Si vous n'avez pas encore de tokens :

1. Visitez cette URL (remplacez `YOUR_CLIENT_ID` par votre Client ID) :
```
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost&scope=activity:read_all
```

2. Après autorisation, vous serez redirigé vers `http://localhost?code=AUTHORIZATION_CODE`

3. Utilisez le script pour obtenir les tokens :
```bash
npm run get-tokens YOUR_AUTHORIZATION_CODE
```

4. Copiez les tokens affichés dans votre fichier `.env`

### Lancer le script

```bash
npm start
```

Le script :
- ✅ Vérifie automatiquement l'expiration des tokens
- ✅ Rafraîchit les tokens si nécessaire
- ✅ Affiche les informations de l'athlète et les dernières activités

## 🔗 Intégration avec le projet React

### Mise à jour des tokens dans le projet React

Après avoir obtenu de nouveaux tokens avec le script Node.js, mettez à jour votre fichier `.env` à la racine du projet React :

```env
VITE_STRAVA_CLIENT_ID=votre_client_id
VITE_STRAVA_CLIENT_SECRET=votre_client_secret
VITE_STRAVA_ACCESS_TOKEN=le_nouveau_access_token
VITE_STRAVA_REFRESH_TOKEN=le_nouveau_refresh_token
VITE_STRAVA_TOKEN_EXPIRES_AT=timestamp_unix_expiration
```

### Comment savoir quand renouveler les tokens ?

Le service TypeScript (`stravaService.ts`) vérifie automatiquement l'expiration des tokens. Si un token est expiré, vous verrez un avertissement dans la console du navigateur :

```
⚠️ Token Strava expiré !
📝 Pour renouveler le token, utilisez le script Node.js :
   cd C:\Users\Anthony\strava-api-client
   npm start
   (Puis mettez à jour VITE_STRAVA_ACCESS_TOKEN dans votre .env)
```

### Limitations du frontend

⚠️ **Important** : Le rafraîchissement automatique des tokens depuis le frontend (navigateur) n'est **pas possible** à cause de :
- Restrictions CORS de l'API Strava
- Sécurité : le `client_secret` ne doit pas être exposé côté client

C'est pourquoi le script Node.js est nécessaire pour gérer le renouvellement des tokens de manière sécurisée.

## 📝 Workflow recommandé

1. **Développement quotidien** :
   - Le token en cache devrait fonctionner pendant 6 heures
   - Si vous voyez des erreurs 401, vérifiez l'expiration

2. **Renouvellement des tokens** (quand nécessaire) :
   ```bash
   cd C:\Users\Anthony\strava-api-client
   npm start
   # Copier les nouveaux tokens dans le .env du projet React
   ```

3. **Automatisation future** (optionnel) :
   - Vous pourriez créer un script qui synchronise automatiquement les tokens
   - Ou utiliser un backend proxy pour gérer le refresh automatiquement

## 🔍 Fonctions disponibles

### Script Node.js (`strava.js`)
- `getValidToken()` - Récupère un token valide (refresh automatique)
- `getActivities(page, perPage)` - Récupère les activités
- `getAthlete()` - Récupère les infos de l'athlète
- `getAthleteStats(athleteId)` - Récupère les statistiques
- `getActivity(activityId)` - Récupère une activité spécifique

### Service TypeScript (`stravaService.ts`)
- `getStravaActivities(perPage, page)` - Récupère les activités
- `getStravaAthlete()` - Récupère les infos de l'athlète
- `getStravaAthleteStats(athleteId)` - Récupère les statistiques
- `getStravaActivityDetails(activityId)` - Récupère une activité avec détails
- `getValidAccessToken()` - Vérifie la validité du token (pas de refresh automatique côté frontend)

## 📚 Documentation API Strava

Pour plus d'informations sur l'API Strava :
- Documentation officielle : https://developers.strava.com/docs/reference/
- Authentification : https://developers.strava.com/docs/authentication/




