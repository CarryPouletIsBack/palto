# Configuration Google Cloud Console - OAuth2

Ce guide explique comment configurer les origines JavaScript et les URI de redirection dans Google Cloud Console.

## 📍 Accès à la configuration

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** → **Credentials**
4. Trouvez votre OAuth 2.0 Client ID
5. Cliquez sur l'icône de crayon (modifier) ou sur le nom du Client ID

## 🔧 Configuration des origines et redirections

### Origines JavaScript autorisées
**À utiliser avec les requêtes provenant d'un navigateur**

Ajoutez l'origine de votre site (sans le chemin, juste le domaine) :

**Pour Vercel (Production) :**
```
https://nom-du-projet.vercel.app
```

**Pour le développement local :**
```
http://localhost:5173
```

**Note :** 
- Pas de trailing slash (`/`)
- Pas de chemin après le domaine
- Juste le protocole + domaine + port (si nécessaire)

### URI de redirection autorisés
**À utiliser avec les requêtes provenant d'un serveur Web**

Ajoutez l'endpoint de callback complet :

**Pour Vercel (Production) :**
```
https://nom-du-projet.vercel.app/api/google-auth/callback
```

**Pour le développement local :**
```
http://localhost:5173/api/google-auth/callback
```

**Note :**
- Inclut le chemin complet (`/api/google-auth/callback`)
- Doit correspondre exactement à l'URI configurée dans Vercel
- Sensible à la casse et aux trailing slashes

## ✅ Configuration complète recommandée

Pour un environnement de développement et production, ajoutez les deux :

### Origines JavaScript autorisées :
```
http://localhost:5173
https://nom-du-projet.vercel.app
```

### URI de redirection autorisés :
```
http://localhost:5173/api/google-auth/callback
https://nom-du-projet.vercel.app/api/google-auth/callback
```

## 🔍 Vérification

Après avoir ajouté les URIs :

1. Cliquez sur **Save** (Enregistrer)
2. Attendez quelques secondes pour que les changements soient propagés
3. Testez la connexion OAuth2 sur votre site

## ⚠️ Erreurs courantes

### "redirect_uri_mismatch"
- Vérifiez que l'URI dans Google Cloud Console correspond **exactement** à celle dans votre code
- Vérifiez les trailing slashes (ne pas en mettre à la fin)
- Vérifiez le protocole (http vs https)
- Vérifiez la casse (minuscules/majuscules)

### "origin_mismatch"
- Vérifiez que l'origine dans Google Cloud Console correspond au domaine de votre site
- N'incluez pas le chemin, juste le domaine

## 📝 Exemple de configuration complète

**Client ID :** `416597900962-pt4343g4qtrgeo614nket10r7u83kqj7.apps.googleusercontent.com`

**Origines JavaScript autorisées :**
- `http://localhost:5173`
- `https://nom-du-projet.vercel.app`

**URI de redirection autorisés :**
- `http://localhost:5173/api/google-auth/callback`
- `https://nom-du-projet.vercel.app/api/google-auth/callback`

---

*Dernière mise à jour : 12 janvier 2026*
