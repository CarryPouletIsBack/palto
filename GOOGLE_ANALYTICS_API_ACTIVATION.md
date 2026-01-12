# Activation de l'API Google Analytics Data API

## ⚠️ Erreur : "API has not been used in project before or it is disabled"

Si vous rencontrez cette erreur :
```
⚠️ Google Analytics Data API has not been used in project 416597900962 before or it is disabled. 
Enable it by visiting https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview?project=416597900962
```

Cela signifie que l'API Google Analytics Data API n'est pas activée dans votre projet Google Cloud Console.

## 🔧 Solution : Activer l'API

### Étape 1 : Accéder à Google Cloud Console

1. Ouvrez votre navigateur et allez sur : https://console.developers.google.com/
2. Connectez-vous avec votre compte Google (celui utilisé pour créer le projet OAuth2)

### Étape 2 : Sélectionner le projet

1. En haut de la page, cliquez sur le sélecteur de projet
2. Sélectionnez le projet avec l'ID `416597900962` (ou le nom de votre projet)

### Étape 3 : Activer l'API Google Analytics Data API

⚠️ **IMPORTANT** : Il y a deux APIs différentes avec des noms similaires :
- ❌ **Analytics Hub API** (`analyticshub.googleapis.com`) - Ce n'est PAS celle-ci
- ✅ **Google Analytics Data API** (`analyticsdata.googleapis.com`) - C'est celle-ci qu'il faut activer

**Option A : Via le lien direct**
1. Cliquez sur ce lien : https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview?project=416597900962
2. Vérifiez que le titre de la page est bien **"Google Analytics Data API"** (et non "Analytics Hub API")
3. Cliquez sur le bouton **"ACTIVER"** (ou **"ENABLE"** en anglais)

**Option B : Via le menu**
1. Dans le menu de gauche, cliquez sur **"APIs & Services"** → **"Library"** (Bibliothèque)
2. Dans la barre de recherche, tapez exactement : `Google Analytics Data API`
3. ⚠️ Assurez-vous de sélectionner **"Google Analytics Data API"** (pas "Analytics Hub API")
4. Vérifiez que l'URL contient `analyticsdata.googleapis.com` (pas `analyticshub.googleapis.com`)
5. Cliquez sur le bouton **"ACTIVER"** (ou **"ENABLE"**)

### Étape 4 : Vérifier l'activation

1. Après avoir cliqué sur "ACTIVER", vous devriez voir un message de confirmation
2. L'API devrait maintenant être listée dans **"APIs & Services"** → **"Enabled APIs"** (APIs activées)

### Étape 5 : Attendre la propagation

⚠️ **Important** : Après avoir activé l'API, attendez **2-5 minutes** pour que les changements se propagent dans les systèmes de Google.

### Étape 6 : Réessayer

1. Retournez sur votre dashboard
2. Cliquez sur **"Se connecter à Google Analytics"** si vous n'êtes pas encore connecté
3. Les données devraient maintenant se charger correctement

## 🔐 Vérification de l'authentification OAuth2

Si après avoir activé l'API, vous voyez toujours un message d'erreur concernant OAuth2 :

### Vérifier que vous êtes connecté

1. Dans le dashboard, vérifiez que vous voyez le bouton **"Déconnexion"** (et non "Se connecter à Google Analytics")
2. Si vous voyez "Se connecter", cliquez dessus et suivez le processus d'authentification

### Vérifier le token dans localStorage

1. Ouvrez la console du navigateur (F12)
2. Allez dans l'onglet **"Application"** (ou **"Storage"**)
3. Dans le menu de gauche, cliquez sur **"Local Storage"** → votre domaine
4. Vérifiez que vous avez :
   - `google_analytics_access_token` : doit contenir un token (commence par `ya29.`)
   - `google_analytics_token_expiry` : doit contenir un timestamp
   - `google_analytics_refresh_token` : doit contenir un token (commence par `1//`)

### Si le token est manquant ou expiré

1. Cliquez sur **"Déconnexion"** dans le dashboard
2. Cliquez sur **"Se connecter à Google Analytics"**
3. Suivez le processus d'authentification OAuth2
4. Après redirection, le token sera automatiquement sauvegardé

## 📋 Checklist de résolution

- [ ] API Google Analytics Data API activée dans Google Cloud Console
- [ ] Attendu 2-5 minutes après activation
- [ ] Connecté à Google Analytics via le bouton dans le dashboard
- [ ] Token présent dans localStorage (`google_analytics_access_token`)
- [ ] Token non expiré (vérifier `google_analytics_token_expiry`)

## 🆘 Si le problème persiste

1. **Vérifier les permissions OAuth2** :
   - Google Cloud Console → APIs & Services → Credentials
   - Vérifier que votre OAuth 2.0 Client ID est configuré avec les scopes :
     - `https://www.googleapis.com/auth/analytics.readonly`
     - `https://www.googleapis.com/auth/analytics`

2. **Vérifier les variables d'environnement** :
   - Vérifier que `VITE_GOOGLE_CLIENT_ID` est configuré dans `.env.local` (local) ou Vercel (production)
   - Vérifier que `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont configurés dans Vercel pour les API routes

3. **Vérifier les logs** :
   - Ouvrir la console du navigateur (F12)
   - Vérifier les erreurs dans l'onglet "Console"
   - Vérifier les requêtes réseau dans l'onglet "Network"

## 📚 Documentation supplémentaire

- [Google Analytics Data API Documentation](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [OAuth2 Setup Guide](./GOOGLE_ANALYTICS_SETUP.md)
- [Vercel Environment Variables](./VERCEL_ENV_VARS.md)
