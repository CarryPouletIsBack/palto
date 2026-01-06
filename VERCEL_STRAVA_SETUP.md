# Configuration Strava sur Vercel - Guide de Vérification

## 🔍 Problème : Les données Strava ne s'affichent pas en production

Si les données Strava ne s'affichent pas sur Vercel en production, voici comment vérifier et corriger :

## ✅ Étape 1 : Vérifier les Variables d'Environnement sur Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Sélectionnez votre projet `portfolio-react-anthony`
3. Allez dans **Settings** → **Environment Variables**
4. Vérifiez que ces **5 variables** sont bien configurées :

### Variables REQUISES (avec préfixe `VITE_` pour le frontend) :

```
VITE_STRAVA_CLIENT_ID=193706
VITE_STRAVA_CLIENT_SECRET=votre_client_secret
VITE_STRAVA_ACCESS_TOKEN=votre_access_token
VITE_STRAVA_REFRESH_TOKEN=votre_refresh_token
VITE_STRAVA_TOKEN_EXPIRES_AT=timestamp_unix
```

⚠️ **IMPORTANT** : 
- Ces variables doivent avoir le préfixe `VITE_` car elles sont utilisées côté client (frontend)
- Les valeurs doivent être les mêmes que dans votre fichier `.env.local` local

## ✅ Étape 2 : Vérifier l'Environnement de Déploiement

Assurez-vous que les variables sont configurées pour **Production** :
- Cochez la case **Production** lors de l'ajout des variables
- Optionnellement, cochez aussi **Preview** et **Development** si vous voulez les utiliser partout

## ✅ Étape 3 : Redéployer après Ajout des Variables

Après avoir ajouté/modifié les variables d'environnement :

1. Allez dans **Deployments**
2. Cliquez sur les **3 points** (⋯) du dernier déploiement
3. Sélectionnez **Redeploy**
4. Ou faites un nouveau commit et push sur GitHub (Vercel redéploiera automatiquement)

## ✅ Étape 4 : Vérifier les Tokens Strava

Les tokens Strava expirent après **6 heures**. Si les données ne s'affichent pas :

1. Vérifiez que vos tokens sont à jour :
   ```bash
   cd C:\Users\Anthony\strava-api-client
   npm start
   ```

2. Copiez les nouveaux tokens depuis le fichier `.env` du projet `strava-api-client`

3. Mettez à jour les variables sur Vercel avec les nouveaux tokens

## ✅ Étape 5 : Vérifier les Logs Vercel

1. Allez dans **Deployments** → Sélectionnez le dernier déploiement
2. Cliquez sur **Functions** ou **Logs**
3. Cherchez les erreurs liées à Strava :
   - `401 Unauthorized` → Token expiré ou invalide
   - `429 Too Many Requests` → Trop d'appels API
   - `Missing environment variable` → Variable non configurée

## 🔧 Solution Rapide : Vérifier depuis le Code

Le service Strava utilise des valeurs par défaut (fallback) si les variables d'environnement ne sont pas trouvées. Vérifiez dans `src/services/stravaService.ts` :

```typescript
const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID || '193706';
const STRAVA_ACCESS_TOKEN = import.meta.env.VITE_STRAVA_ACCESS_TOKEN || '...';
```

Si les variables d'environnement ne sont pas chargées, le code utilisera les valeurs par défaut (qui peuvent être expirées).

## 🐛 Debug en Production

Pour vérifier si les variables sont bien chargées en production :

1. Ouvrez la console du navigateur sur votre site Vercel
2. Les logs du service Strava devraient afficher :
   - `✅ Token Strava chargé depuis l'environnement`
   - Ou `⚠️ Token Strava chargé depuis le cache`

Si vous voyez des erreurs `401` ou `Token rejeté`, c'est que :
- Le token a expiré (rafraîchissez-le)
- Les variables d'environnement ne sont pas chargées (vérifiez Vercel)

## 📝 Checklist de Vérification

- [ ] Les 5 variables `VITE_STRAVA_*` sont configurées sur Vercel
- [ ] Les variables sont activées pour **Production**
- [ ] Les tokens sont à jour (pas expirés depuis plus de 6h)
- [ ] Un redéploiement a été fait après l'ajout des variables
- [ ] Les logs Vercel ne montrent pas d'erreurs 401/429
- [ ] La console du navigateur ne montre pas d'erreurs CORS

## 🚀 Après Configuration

Une fois les variables configurées et le site redéployé :
1. Attendez 1-2 minutes pour que le déploiement se termine
2. Rafraîchissez votre site Vercel
3. Les données Strava devraient s'afficher automatiquement

Si ça ne fonctionne toujours pas, vérifiez les logs de la console du navigateur pour voir les erreurs exactes.

