# Configuration des API Routes Vercel pour Strava

## 📋 Vue d'ensemble

Le projet utilise maintenant des **Vercel Serverless Functions** pour gérer l'API Strava côté serveur. Cela permet :
- ✅ Rafraîchissement automatique des tokens
- ✅ Pas de secrets exposés côté client
- ✅ Cache et rate limiting possibles
- ✅ Déploiement unifié sur Vercel

## 🚀 Développement Local

### Option 1 : Utiliser Vercel CLI (Recommandé)

1. Installer Vercel CLI :
```bash
npm install -g vercel
```

2. Lancer le projet avec Vercel :
```bash
vercel dev
```

Cela va :
- Démarrer le serveur Vite pour le frontend
- Servir les API routes depuis `/api`

### Option 2 : Utiliser uniquement Vite (pour tester le frontend)

Si vous voulez juste tester le frontend sans les API routes :
```bash
npm run dev
```

⚠️ **Note** : Les appels API Strava ne fonctionneront pas sans les API routes.

## 🔧 Configuration des Variables d'Environnement

### En Développement Local

Créez un fichier `.env.local` à la racine du projet :

```env
VITE_STRAVA_CLIENT_ID=193706
VITE_STRAVA_CLIENT_SECRET=votre_secret
VITE_STRAVA_ACCESS_TOKEN=votre_access_token
VITE_STRAVA_REFRESH_TOKEN=votre_refresh_token
VITE_STRAVA_TOKEN_EXPIRES_AT=timestamp_unix

# Ou sans le préfixe VITE_ pour les API routes :
STRAVA_CLIENT_ID=193706
STRAVA_CLIENT_SECRET=votre_secret
STRAVA_ACCESS_TOKEN=votre_access_token
STRAVA_REFRESH_TOKEN=votre_refresh_token
STRAVA_TOKEN_EXPIRES_AT=timestamp_unix
```

### Sur Vercel (Production)

1. Allez dans votre projet sur [vercel.com](https://vercel.com)
2. **Settings** → **Environment Variables**
3. Ajoutez ces variables (sans le préfixe `VITE_` car elles sont côté serveur) :

```
STRAVA_CLIENT_ID=193706
STRAVA_CLIENT_SECRET=votre_secret
STRAVA_ACCESS_TOKEN=votre_access_token
STRAVA_REFRESH_TOKEN=votre_refresh_token
STRAVA_TOKEN_EXPIRES_AT=timestamp_unix
```

## 🔄 Synchronisation des Tokens

Quand vous rafraîchissez les tokens avec le projet Node.js (`C:\Users\Anthony\strava-api-client`) :

1. Obtenez les nouveaux tokens :
```bash
cd C:\Users\Anthony\strava-api-client
npm start
```

2. Mettez à jour les variables d'environnement Vercel avec les nouveaux tokens

3. Redéployez (ou attendez le prochain refresh automatique)

## 📁 Structure des API Routes

```
api/
└── strava/
    ├── utils.ts              # Utilitaires (getValidToken, stravaRequest)
    ├── athlete.ts            # GET /api/strava/athlete
    ├── activities.ts         # GET /api/strava/activities
    └── activities/
        └── [id]/
            └── index.ts      # GET /api/strava/activities/:id
```

## 🧪 Tester les API Routes

Une fois `vercel dev` lancé, testez les endpoints :

```bash
# Athlète
curl http://localhost:3000/api/strava/athlete

# Activités
curl http://localhost:3000/api/strava/activities?per_page=5&page=1

# Détails d'une activité
curl http://localhost:3000/api/strava/activities/123456789
```

## 🔍 Dépannage

### Les API routes ne fonctionnent pas en local

- Vérifiez que vous utilisez `vercel dev` et non `npm run dev`
- Vérifiez que les variables d'environnement sont bien chargées
- Consultez les logs dans le terminal

### Erreur 401 (Unauthorized)

- Le token a probablement expiré
- Rafraîchissez les tokens avec le projet Node.js
- Mettez à jour les variables d'environnement

### Erreur 429 (Too Many Requests)

- Strava limite les requêtes (100 par 15 min, 1000 par jour)
- Attendez quelques minutes avant de réessayer
- Les API routes peuvent être améliorées pour gérer le cache

## 📝 Notes Importantes

1. **Les tokens sont rafraîchis automatiquement** par les API routes quand ils expirent
2. **En production**, les nouveaux tokens rafraîchis ne sont pas sauvegardés automatiquement dans Vercel
3. **Pour une solution complète**, vous pourriez utiliser Vercel KV ou une base de données pour stocker les tokens rafraîchis

## 🔗 Documentation

- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [API Strava Documentation](https://developers.strava.com/docs/reference/)

