# SEO & indexation — Checklist humain / robot

## Déjà en place (côté code)

### Pour les robots (crawlers, Google, Bing)
- **Sitemap** (`public/sitemap.xml`) : toutes les URLs en `/fr` et `/en` (accueil, about, playdago, pedaboard, kaldera) avec balises hreflang.
- **robots.txt** : `Allow: /`, `Disallow: /api/`, `/dashboard`, `/fr/dashboard`, `/en/dashboard`, `/login` ; référence au sitemap.
- **Balise canonical** (dynamique) : chaque page a un `<link rel="canonical">` vers son URL propre (limite le duplicate content avec `?utm_*`, etc.).
- **hreflang + x-default** (dynamique) : dans le `<head>`, liens `alternate` pour FR, EN et x-default (anglais) pour que Google associe les versions linguistiques.
- **JSON-LD WebSite** (dans `index.html`) : schéma pour le site (nom, URL, description, langues).
- **Variable d’environnement** : en production, définir `VITE_SITE_URL=https://anthony-merault.fr` pour que canonical et hreflang utilisent la bonne URL absolue.

### Pour les humains (lisibilité, partage, réseaux)
- **Titre** : « Anthony Merault - Product Designer | Building Complex SaaS & Design Systems » ; mis à jour dynamiquement par page.
- **Meta description** (page d’accueil) : message court type “Amazon” adapté à ton activité (interfaces, design systems, projets, à propos, contact).
- **Image de partage** : `og:image`, `twitter:image` → `public/og-image.png` (renommer ton image en `og-image.png` et la placer dans `public/`).
- **Liens internes** (Hero) : bloc “Découvrez” avec liens vers Pedaboard, Playdago, Kaldera, À propos, Contact + courtes descriptions (favorise les sitelinks Google).
- **Page 404** : message clair, liens projets, bouton retour accueil.

### Pour les IA et crawlers qui ne peuvent pas exécuter JavaScript
Les pages projet sont rendues en JavaScript (SPA), donc un bot qui ne lance pas le JS ne « voit » pas le texte. Pour que les IA (Perplexity, ChatGPT, etc.) et les crawlers puissent quand même lire le contenu :

- **`/projects-content.json`** : fichier JSON (dans `public/`) qui contient le texte de chaque projet (titre, résumé, contexte, URLs FR/EN). Toute IA ou crawler peut faire un GET sur cette URL et lire le contenu sans exécuter de JS.
- **`/content-for-crawlers.html`** : page HTML statique avec le même contenu en texte (titres, paragraphes, liens). Idéal pour les systèmes qui préfèrent du HTML.
- **Lien de découverte** : dans `index.html`, un `<link rel="alternate" type="application/json" href=".../projects-content.json">` permet de signaler l’existence du JSON.
- **robots.txt** : commentaire indiquant que ces URLs existent pour les crawlers/IA.
- **JSON-LD CreativeWork** (dynamique) : sur chaque page projet, quand le JS s’exécute, un `<script type="application/ld+json">` est injecté avec le schéma schema.org (CreativeWork) du projet (nom, description, auteur, année, URLs). Les crawlers qui exécutent le JS (ex. Googlebot) voient donc aussi les données structurées.

**À faire** : si tu modifies le contenu des projets dans `src/data/projectsNew.ts`, mettre à jour à la main `public/projects-content.json` et `public/content-for-crawlers.html` pour garder le même texte (ou automatiser avec un script de génération).

---

## À faire manuellement (recommandé)

1. **Google Search Console**
   - Ajouter la propriété pour `https://anthony-merault.fr`.
   - Soumettre l’URL du sitemap : `https://anthony-merault.fr/sitemap.xml`.
   - Vérifier l’indexation (pages indexées, erreurs, couverture).

2. **Bing Webmaster Tools** (optionnel)
   - Ajouter le site et soumettre le même sitemap.

3. **Vérifier l’image de prévisualisation**
   - Fichier `Firefly_Gemini Flash-2.png` renommé en **`og-image.png`** et placé dans **`public/`**.
   - Tester le partage (Facebook Debugger, Twitter Card Validator, LinkedIn Post Inspector) avec l’URL absolue de l’image si besoin.

4. **Après déploiement**
   - Vérifier que `VITE_SITE_URL=https://anthony-merault.fr` est bien définie en production (Vercel / autre).
   - Tester une URL (ex. `/fr/playdago`) : “Afficher le code source” et contrôler la présence de `canonical`, `hreflang`, `og:image`.

---

## Optionnel (améliorations possibles)

- **Meta description par page** : adapter la meta description selon la page (accueil, about, chaque projet) pour des snippets encore plus pertinents.
- **Données structurées** : ajouter un schéma **Person** ou **ProfilePage** pour le profil auteur (nom, jobTitle, url) si tu veux renforcer le “E-E-A-T”.
- **Performance** : Core Web Vitals (LCP, FID, CLS) — déjà aidé par une SPA légère ; à surveiller dans Search Console.

---

## Résumé

| Élément              | Statut        |
|----------------------|---------------|
| Sitemap (FR/EN)      | OK            |
| robots.txt           | OK            |
| Canonical            | OK (dynamique)|
| hreflang + x-default | OK (dynamique)|
| Titre + meta desc    | OK            |
| og:image / Twitter   | OK (fichier à placer) |
| Liens internes       | OK            |
| Search Console       | À faire par toi |
| og-image.png         | À placer dans `public/` |
| Contenu pour IA/crawlers (JSON + HTML) | OK (`/projects-content.json`, `/content-for-crawlers.html`) |
| JSON-LD CreativeWork (pages projet)    | OK (injecté au chargement) |
