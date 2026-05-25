# Guide de configuration OAuth2 pour Google Analytics

Ce guide vous explique comment configurer l'authentification OAuth2 pour utiliser l'API Google Analytics Data dans votre dashboard.

## 📋 Prérequis

- Un compte Google avec accès à Google Analytics
- Un projet Google Cloud Platform
- Votre site déployé (ou en développement local)

## 🔧 Étapes de configuration

### 1. Créer un projet dans Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Cliquez sur le sélecteur de projet en haut
3. Cliquez sur **"Nouveau projet"**
4. Donnez un nom à votre projet (ex: « Palto Analytics »)
5. Cliquez sur **"Créer"**

### 2. Activer l'API Google Analytics Data API

1. Dans votre projet, allez dans **"APIs & Services"** > **"Library"**
2. Recherchez **"Google Analytics Data API"**
3. Cliquez sur **"Enable"** (Activer)

### 3. Créer des identifiants OAuth 2.0

1. Allez dans **"APIs & Services"** > **"Credentials"**
2. Cliquez sur **"+ CREATE CREDENTIALS"** > **"OAuth client ID"**
3. Si c'est la première fois, configurez l'écran de consentement OAuth :
   - Choisissez **"External"** (ou "Internal" si vous avez un compte Google Workspace)
   - Remplissez les informations requises :
     - **App name** : Nom de votre application
     - **User support email** : Votre email
     - **Developer contact information** : Votre email
   - Cliquez sur **"Save and Continue"** pour chaque étape
4. Créez l'OAuth client ID :
   - **Application type** : **"Web application"**
   - **Name** : « Palto Dashboard » (ou un nom de votre choix)
   - **Authorized JavaScript origins** :
     - Pour le développement local : `http://localhost:5173` (ou le port de Vite)
     - Pour la production : `https://votre-domaine.com`
   - **Authorized redirect URIs** :
     - Pour le développement local : `http://localhost:5173/dashboard`
     - Pour la production : `https://votre-domaine.com/dashboard`
     - Pour Vercel : `https://votre-projet.vercel.app/api/google-auth/callback`
   - Cliquez sur **"Create"**
5. **Copiez le Client ID et le Client Secret** (vous en aurez besoin)
   - ⚠️ **IMPORTANT** : Le Client Secret ne s'affiche qu'**une seule fois** lors de la création
   - Si vous l'avez perdu, vous devrez créer un nouveau Client ID
   - Notez-le immédiatement dans un endroit sûr

### 4. Configurer les variables d'environnement

#### Pour le développement local

Créez un fichier `.env.local` à la racine du projet :

```env
# Google OAuth2
VITE_GOOGLE_CLIENT_ID=votre_client_id_ici
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/dashboard
```

⚠️ **IMPORTANT** : Ne jamais exposer le `CLIENT_SECRET` côté client !

#### Pour Vercel (Production)

⚠️ **IMPORTANT** : Dans Vercel, vous devez configurer **DEUX TYPES** de variables d'environnement :

1. **Variables pour le client React** (avec préfixe `VITE_`) :
   - Ces variables sont injectées dans le code JavaScript au moment du build
   - Accessibles via `import.meta.env.VITE_*` dans votre code React

2. **Variables pour les API routes** (sans préfixe `VITE_`) :
   - Ces variables sont utilisées côté serveur dans les endpoints Vercel
   - Accessibles via `process.env.*` dans vos API routes

**Configuration dans Vercel :**

1. Allez dans votre projet Vercel
2. Allez dans **Settings** > **Environment Variables**
3. Ajoutez **TOUTES** les variables suivantes :

**Pour le client React (avec VITE_) :**
```
VITE_GOOGLE_CLIENT_ID=votre_client_id_ici
VITE_GOOGLE_REDIRECT_URI=https://votre-projet.vercel.app/api/google-auth/callback
```

**Pour les API routes (sans VITE_) :**
```
GOOGLE_CLIENT_ID=votre_client_id_ici
GOOGLE_CLIENT_SECRET=votre_client_secret_ici
GOOGLE_REDIRECT_URI=https://votre-projet.vercel.app/api/google-auth/callback
```

**Résumé :**
- ✅ `VITE_GOOGLE_CLIENT_ID` → utilisé dans `googleAuthService.ts` (côté client)
- ✅ `VITE_GOOGLE_REDIRECT_URI` → utilisé dans `googleAuthService.ts` (côté client, optionnel car il y a un fallback)
- ✅ `GOOGLE_CLIENT_ID` → utilisé dans `api/google-auth/callback.ts` (côté serveur)
- ✅ `GOOGLE_CLIENT_SECRET` → utilisé dans `api/google-auth/callback.ts` (côté serveur)
- ✅ `GOOGLE_REDIRECT_URI` → utilisé dans `api/google-auth/callback.ts` (côté serveur)

**Note :** Vous pouvez utiliser le même `CLIENT_ID` pour les deux (avec et sans `VITE_`), mais vous devez le configurer deux fois car Vercel les traite différemment.

### 5. Déployer les endpoints API sur Vercel

Les fichiers suivants doivent être déployés sur Vercel :
- `api/google-auth/callback.ts` - Gère le callback OAuth2
- `api/google-auth/refresh.ts` - Rafraîchit les tokens expirés

Ces endpoints sont nécessaires car ils utilisent le `CLIENT_SECRET` qui ne doit jamais être exposé côté client.

### 6. Tester l'authentification

1. Démarrez votre application en développement :
   ```bash
   npm run dev
   ```

2. Allez sur la page Dashboard > Stats
3. Cliquez sur **"Se connecter à Google Analytics"**
4. Vous serez redirigé vers Google pour autoriser l'accès
5. Après autorisation, vous serez redirigé vers le dashboard avec vos données

## 🔐 Sécurité

### ⚠️ Points importants :

1. **Ne jamais exposer le CLIENT_SECRET côté client**
   - Le `CLIENT_SECRET` doit uniquement être utilisé dans les endpoints backend (Vercel Functions)

2. **Utiliser HTTPS en production**
   - Les redirections OAuth2 doivent toujours utiliser HTTPS

3. **Limiter les scopes**
   - Utilisez uniquement les scopes nécessaires :
     - `https://www.googleapis.com/auth/analytics.readonly` (lecture seule)
     - `https://www.googleapis.com/auth/analytics` (lecture/écriture, si nécessaire)

4. **Gérer les tokens de manière sécurisée**
   - Les tokens sont stockés dans `localStorage` (configuration actuelle)
   - En production, considérez utiliser des cookies httpOnly ou un système de session

## 🐛 Dépannage

### Erreur : "redirect_uri_mismatch"

- Vérifiez que l'URI de redirection dans Google Cloud Console correspond exactement à celle utilisée dans votre code
- Les URIs sont sensibles à la casse et aux trailing slashes

### Erreur : "invalid_client"

- Vérifiez que le `CLIENT_ID` est correct
- Vérifiez que le `CLIENT_SECRET` est correct (si vous l'avez perdu, créez un nouveau Client ID)
- Vérifiez que l'API Google Analytics Data API est activée

### Où trouver le Client Secret si je l'ai perdu ?

Si vous avez perdu le `CLIENT_SECRET`, vous ne pouvez pas le récupérer. Vous devez :
1. Aller dans Google Cloud Console > APIs & Services > Credentials
2. Trouver votre OAuth 2.0 Client ID
3. Cliquer sur l'icône de crayon (modifier) ou supprimer l'ancien
4. Créer un nouveau Client ID (le secret s'affichera une seule fois)
5. Mettre à jour les variables d'environnement dans Vercel avec le nouveau secret

### Erreur : "access_denied"

- L'utilisateur a refusé l'autorisation
- Réessayez et acceptez toutes les permissions demandées

### Les données ne se chargent pas

- Vérifiez que le token est valide dans le localStorage
- Vérifiez la console du navigateur pour les erreurs
- Vérifiez que votre ID de propriété Google Analytics est correct (G-XXXXXXXXXX)

## 📚 Ressources

- [Documentation Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Guide OAuth2 Google](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

## ✅ Checklist de configuration

- [ ] Projet créé dans Google Cloud Console
- [ ] API Google Analytics Data API activée
- [ ] Écran de consentement OAuth configuré
- [ ] OAuth 2.0 Client ID créé
- [ ] URIs de redirection configurées
- [ ] Variables d'environnement configurées
- [ ] Endpoints API déployés sur Vercel
- [ ] Test d'authentification réussi
- [ ] Données Analytics affichées dans le dashboard
