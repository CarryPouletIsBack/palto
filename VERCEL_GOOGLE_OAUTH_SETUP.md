# Configuration Google OAuth2 dans Vercel

Ce guide vous explique comment configurer vos identifiants OAuth2 Google dans Vercel.

## 🔐 Identifiants OAuth2

Vos identifiants sont sauvegardés dans `GOOGLE_OAUTH_CREDENTIALS.txt` (fichier local, non versionné).

**⚠️ IMPORTANT :** 
- Ne jamais commiter ce fichier dans Git !
- Consultez `GOOGLE_OAUTH_CREDENTIALS.txt` pour vos identifiants réels
- Ce fichier est ignoré par Git (voir `.gitignore`)

## 📋 Configuration dans Vercel

### Étape 1 : Accéder aux Environment Variables

1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet `portfolio-react-anthony`
3. Allez dans **Settings** → **Environment Variables**

### Étape 2 : Ajouter les variables pour le client React (avec VITE_)

Ces variables sont utilisées par le code React côté client.

**Variable 1 :**
- **Key** : `VITE_GOOGLE_CLIENT_ID`
- **Value** : `votre_client_id_ici.apps.googleusercontent.com` (voir `GOOGLE_OAUTH_CREDENTIALS.txt`)
- **Environments** : ✅ Production, ✅ Preview, ✅ Development

**Variable 2 :**
- **Key** : `VITE_GOOGLE_REDIRECT_URI`
- **Value** : `https://portfolio-react-anthony-git-279166-carrypouletisbacks-projects.vercel.app/api/google-auth/callback`
- **Environments** : ✅ Production, ✅ Preview, ✅ Development

### Étape 3 : Ajouter les variables pour les API routes (sans VITE_)

Ces variables sont utilisées par les endpoints API Vercel côté serveur.

**Variable 1 :**
- **Key** : `GOOGLE_CLIENT_ID`
- **Value** : `votre_client_id_ici.apps.googleusercontent.com` (voir `GOOGLE_OAUTH_CREDENTIALS.txt`)
- **Environments** : ✅ Production, ✅ Preview, ✅ Development

**Variable 2 :**
- **Key** : `GOOGLE_CLIENT_SECRET`
- **Value** : `votre_client_secret_ici` (voir `GOOGLE_OAUTH_CREDENTIALS.txt`)
- **Environments** : ✅ Production, ✅ Preview, ✅ Development

**Variable 3 :**
- **Key** : `GOOGLE_REDIRECT_URI`
- **Value** : `https://portfolio-react-anthony-git-279166-carrypouletisbacks-projects.vercel.app/api/google-auth/callback`
- **Environments** : ✅ Production, ✅ Preview, ✅ Development

### Étape 4 : Sauvegarder et redéployer

1. Cliquez sur **Save** pour chaque variable
2. Vercel redéploiera automatiquement votre projet
3. Attendez la fin du déploiement

## ✅ Vérification

Après le redéploiement :

1. Allez sur votre site déployé
2. Connectez-vous au dashboard
3. Allez dans la section "Stats"
4. Le message "Configuration manquante" devrait avoir disparu
5. Cliquez sur "Se connecter à Google Analytics"
6. Vous devriez être redirigé vers Google pour autoriser l'accès

## 🔒 Sécurité

- ✅ Le `CLIENT_SECRET` est uniquement utilisé dans les API routes (côté serveur)
- ✅ Le `CLIENT_ID` peut être exposé côté client (c'est normal)
- ✅ Les tokens d'accès sont stockés dans le localStorage (pour la démo)
- ⚠️ En production, considérez utiliser des cookies httpOnly ou un système de session

## 📝 Configuration locale (Développement)

Pour le développement local, créez un fichier `.env.local` à la racine :

```env
# Client React (avec VITE_)
VITE_GOOGLE_CLIENT_ID=votre_client_id_ici.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/api/google-auth/callback

# API routes (sans VITE_) - si vous utilisez vercel dev
GOOGLE_CLIENT_ID=votre_client_id_ici.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre_client_secret_ici
GOOGLE_REDIRECT_URI=http://localhost:5173/api/google-auth/callback
```

**⚠️ Important :** Les identifiants réels sont stockés dans `GOOGLE_OAUTH_CREDENTIALS.txt` (fichier local, non versionné).

## 🐛 Dépannage

### Le message "Configuration manquante" persiste

1. Vérifiez que toutes les variables sont bien configurées dans Vercel
2. Vérifiez que le déploiement est terminé
3. Videz le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)
4. Vérifiez la console du navigateur pour les erreurs

### Erreur "redirect_uri_mismatch"

1. Vérifiez que l'URI de redirection dans Google Cloud Console correspond exactement à celle dans Vercel
2. Les URIs sont sensibles à la casse et aux trailing slashes
3. Pour Vercel : `https://portfolio-react-anthony-git-279166-carrypouletisbacks-projects.vercel.app/api/google-auth/callback`
4. Pour local : `http://localhost:5173/api/google-auth/callback`

---

*Dernière mise à jour : 12 janvier 2026*
