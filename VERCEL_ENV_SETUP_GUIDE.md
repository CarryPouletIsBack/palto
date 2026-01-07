# 🔧 Guide de Configuration des Variables d'Environnement Vercel

## ❌ Problème : Erreur 500 sur les endpoints API

Si vous voyez des erreurs `500` sur `/api/strava/*`, c'est que **les variables d'environnement ne sont pas configurées sur Vercel**.

## ✅ Solution : Configurer les Variables sur Vercel

### Étape 1 : Aller dans les paramètres Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous et sélectionnez votre projet
3. Allez dans **Settings** → **Environment Variables**

### Étape 2 : Ajouter les Variables (SANS le préfixe `VITE_`)

⚠️ **IMPORTANT** : Pour les API routes Vercel, utilisez les variables **SANS** le préfixe `VITE_`

Ajoutez ces 5 variables :

| Nom de la Variable | Valeur | Exemple |
|-------------------|--------|---------|
| `STRAVA_CLIENT_ID` | Votre Client ID Strava | `193706` |
| `STRAVA_CLIENT_SECRET` | Votre Client Secret Strava | `294ac27e59...` |
| `STRAVA_ACCESS_TOKEN` | Votre Access Token actuel | `a3ed62ea7c...` |
| `STRAVA_REFRESH_TOKEN` | Votre Refresh Token | `53474945fe...` |
| `STRAVA_TOKEN_EXPIRES_AT` | Timestamp Unix d'expiration | `1767740083` |

### Étape 3 : Sélectionner les Environnements

Pour chaque variable, cochez au minimum :
- ✅ **Production**
- ✅ **Preview** (optionnel, recommandé)
- ✅ **Development** (optionnel, pour `vercel dev`)

### Étape 4 : Redéployer

Après avoir ajouté les variables :
1. Allez dans **Deployments**
2. Cliquez sur les **3 points** (⋯) du dernier déploiement
3. Sélectionnez **Redeploy**

## 🔍 Vérifier que les Variables sont Configurées

### Méthode 1 : Vérifier dans les Logs Vercel

1. Allez dans **Deployments** → Cliquez sur un déploiement
2. Ouvrez l'onglet **Functions** → Cliquez sur une fonction API
3. Regardez les logs, vous devriez voir :
   ```
   [Strava API] 🔍 Diagnostic des variables d'environnement: { ... }
   [Strava API] ✅ Toutes les variables requises sont présentes
   ```

Si vous voyez :
```
[Strava API] ❌ Variables manquantes: ['STRAVA_CLIENT_ID', ...]
```

→ Les variables ne sont pas configurées correctement.

### Méthode 2 : Tester l'endpoint

Appelez l'endpoint directement :
```
https://votre-projet.vercel.app/api/strava/athlete
```

Si les variables sont manquantes, vous verrez :
```json
{
  "error": "Variables d'environnement manquantes sur Vercel",
  "missing": ["STRAVA_CLIENT_ID", ...],
  "hint": "Configurez ces variables dans Vercel → Settings → Environment Variables"
}
```

## ⚠️ Problème : Rate Limit Exceeded (429)

Si vous voyez une erreur `429` :
```
Rate Limit Exceeded - Trop de requêtes Strava
```

### Cause
Strava limite les appels API :
- **15 minutes** : 100 requêtes
- **1 jour** : 1000 requêtes

### Solution

1. **Attendez 15 minutes** avant de réessayer
2. Vérifiez vos limites sur : https://www.strava.com/settings/api
3. Le système de cache (5 minutes) devrait limiter les appels automatiquement

### Éviter le Rate Limit

- ✅ Le cache localStorage limite déjà les appels
- ✅ Ne rafraîchissez pas la page trop souvent
- ✅ Attendez que le cache expire avant de tester à nouveau

## 🔄 Synchroniser les Tokens depuis votre Projet Node.js

Quand vous rafraîchissez les tokens avec votre projet `strava-api-client` :

1. Récupérez les nouveaux tokens affichés
2. Mettez à jour les variables dans Vercel :
   - `STRAVA_ACCESS_TOKEN` → Nouveau access token
   - `STRAVA_REFRESH_TOKEN` → Nouveau refresh token (peut être le même)
   - `STRAVA_TOKEN_EXPIRES_AT` → Nouveau timestamp d'expiration
3. **Redéployez** le projet pour appliquer les changements

### Automatisation Future (Optionnel)

Pour automatiser ce processus, vous pourriez :
- Utiliser **Vercel KV** pour stocker les tokens rafraîchis
- Créer un endpoint `/api/refresh-token` qui met à jour automatiquement
- Utiliser un webhook Strava pour rafraîchir automatiquement

## 📋 Checklist de Configuration

Avant de tester, vérifiez :

- [ ] Toutes les 5 variables sont ajoutées dans Vercel
- [ ] Les variables n'ont **PAS** le préfixe `VITE_`
- [ ] Les variables sont cochées pour **Production**
- [ ] Le projet a été **redéployé** après l'ajout des variables
- [ ] Vous n'avez pas dépassé le Rate Limit Strava
- [ ] Les tokens ne sont pas expirés

## 🆘 En cas de Problème Persistant

1. Vérifiez les logs Vercel pour voir les messages d'erreur détaillés
2. Vérifiez que les variables sont bien présentes (méthode 2 ci-dessus)
3. Vérifiez que vous n'avez pas de Rate Limit actif
4. Assurez-vous que les tokens ne sont pas expirés

Les endpoints affichent maintenant des messages d'erreur détaillés pour faciliter le diagnostic !

