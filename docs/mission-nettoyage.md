# Mission nettoyage Palto

Ce document sert de registre de reprise pour l'audit produit, SEO et analytics. Il distingue ce qui est corrigeable côté front maintenant de ce qui nécessite une vraie donnée backend.

## Routes applicatives

| Route | Page | Composant principal | SEO attendu | Statut nettoyage |
| --- | --- | --- | --- | --- |
| `/fr`, `/en` | Accueil passager | `Hero` | index | A vérifier : copies, search, popup localisation |
| `/fr/chauffeur`, `/en/chauffeur` | Accueil chauffeur | `HeroChauffeur` | index | A vérifier : CTA auth et copies métier |
| `/fr/go`, `/en/go` | Réservation Go | `Project` -> `SingleProjectNew` | index | Critique : paiement, invité, SEO service |
| `/fr/lieu/:id`, `/en/lieu/:id` | Destination | `DestinationSpotlight` | index | SEO dynamique par destination |
| `/fr/contact`, `/en/contact` | Contact | `Contact` | index | Formulaire + meta dédiées |
| `/fr/menu`, `/en/menu` | Menu | `Menu` | index faible | Peut rester indexé si contenu utile |
| `/fr/compte`, `/en/compte` | Compte client / auth | `ClientCompteDashboard` ou `ClientAuthPage` | noindex | Données privées, non pertinent SEO |
| `/fr/compte/course`, `/en/compte/course` | Suivi rencontre chauffeur | `ClientMeetDriverPage` | noindex | Données privées |
| `/fr/dashboard`, `/en/dashboard` | Dashboard chauffeur / auth | `Dashboard` ou `ChauffeurAuthPage` | noindex | Données privées |
| `/fr/dashboard/navigation/:id`, `/en/dashboard/navigation/:id` | Navigation course chauffeur | `DriverNavigationView` | noindex | Données privées |
| fallback | 404 | `ErrorPage` | noindex | Meta 404 propre |

## Routes API

| Route fichier | Usage | Points d'attention |
| --- | --- | --- |
| `api/rides/create.ts` | Création course Go | Le commentaire `mock` correspond au mapping legacy d'id chauffeur ; à documenter, pas visible utilisateur. |
| `api/client/rides.ts` | Courses client / nearby | Vérifier que les réponses n'inventent pas de données si l'API est vide. |
| `api/client/profile.ts` | Profil client | Source de persistance compte client. |
| `api/chauffeur/index.ts` | Dashboard chauffeur, stats, présence, profil | Contient des stats encore hardcodées (`rating`, `onlineHoursWeek`, `lastPayout`). |
| `api/stripe/index.ts` | Stripe setup / payment | OK côté prod si env configurées. |
| `api/geocode.ts` | Géocodage | OK, proxy BAN/Nominatim. |
| `api/send.ts` | Contact Resend | Dépend des env Resend. |
| `api/auth/index.ts` | Auth locale/API | A surveiller avec les sessions. |
| `api/google-auth/[action].ts` | Ancien OAuth Google Analytics | A garder seulement si toujours utilisé côté admin analytics. |

## Incohérences visibles à corriger

| Zone | Fichier | Problème | Action |
| --- | --- | --- | --- |
| Stats chauffeur | `src/components/DashboardStats.tsx` | `dernier versement : —` ou valeurs inventées affichées dans la carte Note. | Masquer/remplacer par un état indisponible quand la donnée n'est pas réelle. |
| Stats API chauffeur | `api/chauffeur/index.ts` | `rating: 4.92`, `onlineHoursWeek: 36`, `lastPayout: '1 125 EUR · vendredi'` sont hardcodés. | Retourner `null` quand la donnée n'existe pas et laisser le front formater. |
| Heatmap stats | `src/components/DashboardStats.tsx` | Badge "Non branché" et valeurs `—` visibles. | Remplacer par une copie propre "Données annuelles indisponibles" et éviter les tirets isolés. |
| Compte client | `src/contexts/LanguageContext.tsx` | Mentions "fictives", "simulation locale", "stored locally" visibles en production. | Reformuler en termes produit ou masquer en mode dev. |
| Organisation chauffeur | `src/contexts/LanguageContext.tsx`, `src/components/Dashboard.tsx` | Avis `sample-review-*` et mention "exemples illustratifs". | Présenter comme aperçu non publié ou masquer les avis si pas de données réelles. |
| Wallet client | `src/contexts/LanguageContext.tsx` | Mouvements fictifs / recharge simulée. | Renommer en historique indisponible ou afficher uniquement les vrais mouvements. |
| Images SEO | `index.html`, `src/constants/imagePlaceholders.ts` | `placeholder-*` pour icône/OG. | Centraliser un fallback Palto propre et ne plus exposer "placeholder" dans les metas. |

## SEO

Etat actuel :
- `App.tsx` gère `document.title`, canonical et hreflang.
- `index.html` contient description, OG/Twitter et JSON-LD génériques.
- `SingleProjectNew.tsx` ajoute un JSON-LD projet, mais la stratégie n'est pas centralisée.

Décision :
- Créer un registre `src/seo/pageSeo.ts`.
- Appliquer par page : title, description, robots, canonical, OG/Twitter, JSON-LD.
- Mettre `noindex,nofollow` sur les pages compte, dashboard et navigation course.
- Garder `index,follow` sur accueil, chauffeur, Go, destinations, contact et 404 avec `noindex` pour 404.

## Analytics et détection navigateur

Etat actuel :
- `AnalyticsGuard.tsx` charge Vercel Analytics, Speed Insights et RB2B avec clé hardcodée.
- `googleAnalyticsTracking.ts` initialise GA4 avec un ID par défaut hardcodé.
- `index.html` injecte GTM avec un ID hardcodé.
- `LanguageContext.tsx` détecte déjà la langue navigateur.
- Quelques composants lisent `navigator.userAgent` localement.

Décision :
- Créer `src/services/analytics/index.ts` comme façade unique.
- Les providers doivent être activés uniquement via env publiques (`VITE_ANALYTICS_*`).
- Ajouter un contexte device/browser minimal : navigateur, OS, viewport, touch, langue, timezone.
- Ne pas créer de fingerprint persistant ; pas d'identification personnelle sans appel explicite futur.
- Conserver l'exclusion admin via `exclude_analytics`.

## Validation

Commandes à lancer après corrections :
- `npm run typecheck`
- `npm run lint`
- `npm run build` si les changements SEO/analytics touchent le shell.

Routes à vérifier manuellement :
- `/fr`
- `/fr/chauffeur`
- `/fr/go`
- `/fr/lieu/saint-denis-centre`
- `/fr/contact`
- `/fr/compte`
- `/fr/dashboard`
- `/fr/dashboard/navigation/:id`

## Corrections appliquees

- Stats chauffeur : les valeurs non disponibles (`rating`, temps en ligne, dernier versement) ne sont plus inventees. L'API renvoie `null` quand aucune source fiable n'est disponible, et l'UI affiche un etat explicite.
- Heatmap annuelle : les tirets isoles et le badge "Non branche" sont remplaces par un etat "historique a venir".
- Organisation chauffeur : les avis client d'exemple ne sont plus affiches ; la zone reste prete pour de vrais avis.
- Copies compte client et chauffeur : les mentions visibles "fictif", "simulation locale", "exemples illustratifs" et "stored locally" ont ete reformulees en etats produit.
- SEO : `src/seo/pageSeo.ts` centralise les metadonnees par page, canonical, hreflang, robots, OG/Twitter et JSON-LD.
- Analytics : `src/services/analytics/index.ts` centralise GA4, GTM, RB2B, Vercel Analytics et Speed Insights via variables d'environnement, avec exclusion admin et contexte navigateur/device minimal.
- Assets : les metas et fallbacks publics utilisent des assets Palto (`palto-og.svg`, `palto-app-icon.svg`) au lieu d'assets placeholder.

## Validation executee

- `npm run typecheck` : OK.
- `npm run lint` : OK avec avertissements React Hooks preexistants.
- `npm run build` : OK.
- `npm run typecheck:full` : echoue encore sur des erreurs strictes existantes dans plusieurs composants (types React DOM manquants, unions Dashboard/ClientCompte, noUnusedLocals). Le blocage initial `baseUrl` deprecie a ete neutralise avec `ignoreDeprecations`.
