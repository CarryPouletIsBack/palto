# 🚀 Guide de Déploiement

Ce guide explique comment déployer le portfolio sur différentes plateformes.

## Vercel (Recommandé) ⚡

Vercel est la solution la plus simple et rapide pour déployer ce projet React/Vite.

### Option 1 : Connexion GitHub (Automatique)

1. **Créer un compte Vercel**
   - Aller sur [vercel.com](https://vercel.com)
   - S'inscrire avec ton compte GitHub

2. **Importer le projet**
   - Cliquer sur "New Project"
   - Sélectionner le dépôt `portfolio-react-anthony`
   - Vercel détectera automatiquement les paramètres :
     - Framework: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

3. **Déployer**
   - Cliquer sur "Deploy"
   - Le déploiement se fera automatiquement
   - Une URL sera générée (ex: `portfolio-react-anthony.vercel.app`)

4. **Déploiements automatiques**
   - Chaque push sur `main` déclenchera un nouveau déploiement
   - Les Pull Requests créeront des preview deployments

### Option 2 : CLI Vercel

```bash
# Installer Vercel CLI globalement
npm i -g vercel

# Se connecter à Vercel
vercel login

# Déployer
vercel

# Déployer en production
vercel --prod
```

## Netlify 🌐

1. **Créer un compte**
   - Aller sur [netlify.com](https://netlify.com)
   - S'inscrire avec GitHub

2. **Nouveau site depuis Git**
   - Cliquer sur "New site from Git"
   - Sélectionner le dépôt
   - Configurer :
     - Build command: `npm run build`
     - Publish directory: `dist`

3. **Déployer**
   - Cliquer sur "Deploy site"

## GitHub Pages 📄

### Via GitHub Actions (Automatique)

1. **Créer un workflow GitHub Actions**
   - Le fichier `.github/workflows/deploy.yml` sera créé automatiquement
   - Ou créer manuellement : `.github/workflows/deploy.yml`

2. **Configurer GitHub Pages**
   - Aller dans Settings → Pages
   - Source: GitHub Actions

3. **Créer un Personal Access Token** (si nécessaire)
   - Settings → Developer settings → Personal access tokens
   - Générer un token avec les permissions `repo`

### Configuration Vite pour GitHub Pages

Si le projet est dans un sous-dossier (ex: `/portfolio`), ajouter dans `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/portfolio-react-anthony/', // Remplacer par le nom du repo
  // ... reste de la config
})
```

## Variables d'environnement 🔐

Si tu as des variables d'environnement :

### Vercel
- Settings → Environment Variables
- Ajouter les variables nécessaires

### Netlify
- Site settings → Build & deploy → Environment
- Ajouter les variables

## Domaine personnalisé 🌍

### Vercel
1. Aller dans Project Settings → Domains
2. Ajouter ton domaine
3. Suivre les instructions DNS

### Netlify
1. Domain settings → Add custom domain
2. Configurer les DNS selon les instructions

## Checklist de déploiement ✅

- [ ] Tous les tests passent (`npm run build` fonctionne)
- [ ] Les variables d'environnement sont configurées
- [ ] Le domaine personnalisé est configuré (optionnel)
- [ ] Les redirections SPA sont configurées (déjà dans `vercel.json`)
- [ ] Les assets statiques sont accessibles
- [ ] Le site fonctionne sur mobile et desktop

## Résolution de problèmes 🔧

### Erreur 404 sur les routes
- Vérifier que les rewrites SPA sont configurées (déjà fait dans `vercel.json`)

### Build échoue
- Vérifier les logs de build dans la console
- Tester en local avec `npm run build`

### Assets non chargés
- Vérifier les chemins relatifs dans le code
- Vérifier que le dossier `public` est bien à la racine

## Support 📞

Pour plus d'aide :
- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Netlify](https://docs.netlify.com)
- [Documentation GitHub Pages](https://docs.github.com/en/pages)







