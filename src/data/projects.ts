import { PLACEHOLDER_COVER, PLACEHOLDER_MEDIA } from '../constants/imagePlaceholders';

export interface ProjectData {
  // 1. Titre principal
  title: string;
  subtitle?: string;
  badges?: string[];
  
  // 2. Résumé / Introduction
  summary: string;
  
  /** Objectifs (liste, pour section Contexte du projet Figma) */
  objectifs?: string[];
  /** Note sous le tableau équipe (Figma) */
  teamNote?: string;
  /** Problématique (Figma) */
  problematique?: string;
  /** Solution (Figma) */
  solution?: string;
  /** Audit / Analyse (Figma) */
  auditLead?: string;
  auditBody?: string;
  /** Colonne gauche sous le carrousel audit (si absent : repli sur auditLead) */
  auditLeadAfterCarousel?: string;
  /** Colonne droite sous le carrousel audit (si absent : repli sur auditBody) */
  auditBodyAfterCarousel?: string;
  /** Section Architecture & Flux — 1er paragraphe (optionnel ; sinon libellé global) */
  archLead?: string;
  /** Teaser Design system (2 colonnes) sous l’arbre user flow — ex. Palto */
  architectureDsDuplicateLead?: string;
  architectureDsDuplicateBody?: string;
  /** 1er paragraphe section « Conception & Itération » (Palto) — distinct du teaser Design system */
  conceptionDuplicateLead?: string;
  /** H3 + corps sous le lead (Conception uniquement) — si absent, repli sur architectureDsDuplicatePivotH3 / Body */
  conceptionDuplicatePivotH3?: string;
  conceptionDuplicateBody?: string;
  /** H3 au-dessus du 2e paragraphe (bloc Conception dupliqué Palto uniquement) */
  architectureDsDuplicatePivotH3?: string;
  /** Matrice de positionnement (Figma 97-50) : scatter X=Effort, Y=Valeur */
  positionnementMatrix?: {
    xAxisLabel: string;
    yAxisLabel: string;
    xMinLabel: string;
    xMaxLabel: string;
    yMinLabel: string;
    yMaxLabel: string;
    points: Array<{ name: string; description: string; x: number; y: number }>;
  };
  /** 1er/2e/3e/4e réunion pour Processus détaillé (Figma) */
  processReunions?: Array<{ label: string; title: string; subtitle?: string; description: string }>;
  /** User flow (Figma 100-148) : Organization chart Highcharts */
  userFlow?: {
    title?: string;
    nodes: Array<{ id: string; name?: string; title?: string }>;
    links: Array<{ from: string; to: string }>;
  };
  
  // 3. Contexte & Problématique
  context: {
    title: string;
    content: string;
  };
  
  // 4. Contexte & Problématique (optionnel)
  contextProblem?: {
    title: string;
    content: string;
  };
  
  // 5. Démarche & Approche
  approach: {
    title: string;
    sections: Array<{
      subtitle: string;
      content: string;
    }>;
  };
  
  // 6. Wireframes / Maquettes
  wireframes?: {
    title: string;
    items: Array<{
      image: string;
      description: string;
    }>;
  };
  
  // 6. Design System
  designSystem: {
    colorPalette: {
      title: string;
      description: string;
      categories: {
        neutrals: {
          title: string;
          colors: Array<{
            role: string;
            token: string;
            color: string;
            usage: string;
          }>;
        };
        primary: {
          title: string;
          colors: Array<{
            role: string;
            token: string;
            color: string;
          }>;
        };
        secondary: {
          title: string;
          colors: Array<{
            role: string;
            token: string;
            color: string;
          }>;
        };
        accent: {
          title: string;
          colors: Array<{
            role: string;
            token: string;
            color: string;
          }>;
        };
        error: {
          title: string;
          colors: Array<{
            role: string;
            token: string;
            color: string;
          }>;
        };
      };
    };
    typography: {
      title: string;
      description: string;
      items: Array<{
        style: string;
        font: string;
        size: string;
        lineHeight: string;
      }>;
    };
    iconography?: {
      title: string;
      description: string;
    };
  };
  
  // 7. Implémentation & Technologies
  implementation?: {
    title: string;
    technologies: string[];
    architecture?: string;
  };
  
  // 8. Impacts & Résultats
  results?: {
    title: string;
    metrics?: Array<{
      label: string;
      value: string;
    }>;
    feedback?: string;
    improvements?: string;
  };
  
  // 9. Conclusion / Next Steps
  conclusion?: {
    title: string;
    content: string;
    nextSteps?: string[];
  };
  
  // Métadonnées générales
  year: string;
  image: string;
  skills: string[];
  duration: string;
  type: string;
  team: string[];
  /** URL du projet (site en ligne) – ouvre dans un nouvel onglet */
  projectUrl?: string;

  /** Traductions EN (optionnel) */
  translations?: {
    en?: {
      subtitle?: string;
      summary?: string;
      team?: string[];
      objectifs?: string[];
      teamNote?: string;
      problematique?: string;
      solution?: string;
      auditLead?: string;
      auditBody?: string;
      auditLeadAfterCarousel?: string;
      auditBodyAfterCarousel?: string;
      archLead?: string;
      architectureDsDuplicateLead?: string;
      architectureDsDuplicateBody?: string;
      architectureDsDuplicatePivotH3?: string;
      conceptionDuplicateLead?: string;
      conceptionDuplicatePivotH3?: string;
      conceptionDuplicateBody?: string;
      year?: string;
      /** Neutrals palette: role + usage par index */
      designSystemNeutrals?: Array<{ role: string; usage: string }>;
      /** Matrice de positionnement */
      positionnementMatrix?: {
        xAxisLabel: string;
        yAxisLabel: string;
        xMinLabel: string;
        xMaxLabel: string;
        yMinLabel: string;
        yMaxLabel: string;
        points: Array<{ name: string; description: string; x: number; y: number }>;
      };
      /** Processus détaillé */
      processReunions?: Array<{ label: string; title: string; subtitle?: string; description: string }>;
      /** User flow */
      userFlow?: {
        title?: string;
        nodes: Array<{ id: string; name?: string; title?: string }>;
        links: Array<{ from: string; to: string }>;
      };
    };
  };
}

export const defaultProjectsData: { [key: string]: ProjectData } = {
  'Go': {
    // 1. Titre principal (slug URL : /go)
    title: 'Go',
    subtitle: 'Réservation de courses Palto sur La Réunion',
    badges: ['Mobilité', '2025', 'OpenStreetMap', 'Application'],
    
    // 2. Résumé / Introduction
    summary:
      'Go est le parcours passager Palto : départ et arrivée sur l’île, estimation temps et distance, course immédiate ou planifiée, chauffeurs à proximité, puis confirmation.\n\nL’enjeu est de rendre le trajet lisible (carte + texte), de limiter les erreurs d’adresse et de clarifier ce qui se passe avant, pendant et après la demande de course.',

    // Contexte du projet
    objectifs: [
      'Réduire la friction : saisir un trajet rapidement, avec suggestions d’adresses et repli sur la carte.',
      'Rassurer : afficher estimation, itinéraire et étapes avant d’envoyer la demande de course.',
      'Préparer l’échelle : interface prête pour persistance API / Supabase et suivi côté chauffeur (dashboard).',
    ],

    teamNote:
      'Contenu produit de démonstration : les libellés et métriques illustrent le positionnement Palto (moto-taxi, La Réunion) sans reprendre d’anciens cas clients.',
    
    // 3. Contexte & Problématique
    context: {
      title: 'Contexte & besoin',
      content:
        'Les usagers combinent souvent plusieurs canaux (appel, message, applis généralistes) pour se déplacer sur l’île. Palto vise une expérience locale : priorités à la carte, aux adresses précises et à la clarté du créneau (maintenant / plus tard).',
    },

    // 4. Problématique / Solution
    problematique:
      'Comment proposer une réservation courte et compréhensible sur mobile, tout en restant honnête sur ce qui est estimé (temps, distance, disponibilité chauffeurs) et sur ce qui dépend encore du règlement métier (paiement hors ligne, confirmation réelle) ?',
    solution:
      'Go structure le parcours en étapes : lieux → carte / itinéraire → mode de course → chauffeurs → récap → envoi. Les textes et états guident l’usager ; l’activation API permet ensuite de relier ce flux au planning chauffeur.',
    auditLead:
      'Analyse des usages locaux : trajets courts, besoin d’adresses fiables, hésitation sur l’horaire, et lecture rapide en extérieur (luminosité, interruptions).',

    auditBody: `Les usages observés sur d’autres services de mobilité ont surtout servi de repères : clarté du point de prise en charge, visibilité du prix ou de l’estimation, et réduction des allers-retours entre carte et formulaire. L’objectif n’est pas de copier une app globale, mais d’adapter le flux à La Réunion (réseau, vocabulaire, lieux).`,

    auditLeadAfterCarousel: `Le positionnement Palto reste volontairement pragmatique : priorité à la compréhension du trajet et du créneau, puis à la mise en relation. Les contenus « marketing » sont limités au profit d’actions explicites (rechercher, confirmer, contacter).`,

    auditBodyAfterCarousel: `Les intégrations (géocodage / directions OpenStreetMap, persistance Supabase optionnelle) sont présentées comme des extensions du même parcours, pas comme une refonte du produit : l’UI reste stable quand le backend s’active.`,

    archLead:
      'Côté produit, le flux est découpé en blocs indépendants : saisie des lieux, carte & itinéraire, sélection du mode (maintenant / plus tard), liste chauffeurs, récapitulatif — pour pouvoir activer l’API sans casser l’UI.',

    architectureDsDuplicateLead: `L’interface reste sobre pour laisser la priorité à la carte et aux adresses.

Le système de couleurs et de surfaces reprend des principes proches de Material Design pour assurer contraste et hiérarchie sur mobile.`,

    conceptionDuplicateLead: `Le défi principal est la densité d’information : carte, champs d’adresse, suggestions, estimation et CTA doivent coexister sans se masquer mutuellement, surtout sur petit écran.`,

    conceptionDuplicatePivotH3: 'Carte & formulaire',

    conceptionDuplicateBody: `Plusieurs dispositions ont été testées : carte pleine largeur avec panneau réservation repliable, puis colonnes sur desktop. L’objectif constant est de garder le trajet visible pendant que l’utilisateur corrige une adresse ou change l’horaire.

Les transitions d’étape (chargement recherche, erreur réseau, service cartographique indisponible) ont des libellés explicites pour éviter les impasses.`,

    architectureDsDuplicateBody: `Palette neutre : fonds clairs / sombres selon le thème, surfaces cartes distinctes du fond carte.

Hiérarchie : niveaux d’élévation pour modales, encarts d’estimation et listes chauffeurs.

Grille 4 px : alignements pour boutons, champs et badges de statut sur le flux de réservation.`,

    architectureDsDuplicatePivotH3: 'Lisibilité & thèmes',

    positionnementMatrix: {
      axisHorizontalPrefix: 'Axe X (Horizontal) ',
      axisVerticalPrefix: 'Axe Y (Vertical) ',
      xAxisLabel: 'Spécificité locale',
      yAxisLabel: 'Guidage du parcours',
      xMinLabel: 'Faible',
      xMaxLabel: 'Élevé',
      yMinLabel: 'Faible',
      yMaxLabel: 'Élevé',
      points: [
        { name: 'Appel direct', description: 'Rapide mais peu traçable, sans estimation centralisée.', x: -6, y: 6 },
        { name: 'Messagerie', description: 'Organisation informelle des trajets et des prix.', x: 6, y: 6 },
        { name: 'Agrégateur global', description: 'Couverture large, moins adapté aux usages réunionnais.', x: -6, y: -6 },
        { name: 'Palto Go', description: 'Parcours structuré, carte locale, créneau clair.', x: 6, y: -6 },
      ],
    },

    /** Flux utilisateur (arbre #userflow-tree — section Architecture & Flux). Référence UX pour tous les arbres du site ; alignement des autres arbres à prévoir ultérieurement. */
    userFlow: {
      title: 'Parcours utilisateur',
      nodes: [
        { id: 'login', name: 'Connexion' },
        { id: 'dashboard', name: 'Accueil & carte' },
        { id: 'compte', name: 'Départ / destination' },
        { id: 'matching', name: 'Chauffeurs à proximité' },
        { id: 'lancer-des', name: 'Carte & itinéraire' },
        { id: 'jeux-lettres', name: 'Maintenant / plus tard' },
        { id: 'ateliers', name: 'Récap & envoi' },
        { id: 'creation', name: 'Lieux favoris' },
        { id: 'session', name: 'Compte passager' },
        { id: 'suivi', name: 'Aide & contact' },
        { id: 'detail-atelier', name: 'Détail course' },
        { id: 'config', name: 'Confirmation' },
      ],
      links: [
        { from: 'login', to: 'dashboard' },
        { from: 'dashboard', to: 'compte' },
        { from: 'dashboard', to: 'ateliers' },
        { from: 'dashboard', to: 'creation' },
        { from: 'dashboard', to: 'session' },
        { from: 'dashboard', to: 'suivi' },
        { from: 'compte', to: 'matching' },
        { from: 'compte', to: 'lancer-des' },
        { from: 'compte', to: 'jeux-lettres' },
        { from: 'ateliers', to: 'detail-atelier' },
        { from: 'creation', to: 'config' },
      ],
    },
    
    // 4. Démarche & Approche
    approach: {
      title: 'Démarche UX/UI',
      sections: [
        {
          subtitle: 'Recherche & cadrage',
          content:
            'Interviews légères et observation des parcours réels (trajets domicile–travail, aéroport, rush) pour prioriser carte, suggestions d’adresses et clarté du créneau.',
        },
        {
          subtitle: 'Veille & repères',
          content:
            'Analyse de services de mobilité (globaux et locaux) pour repérer ce qui fonctionne sur mobile : étapes courtes, feedback immédiat, récap avant action irréversible.',
        },
        {
          subtitle: 'Prototypes',
          content:
            'Itérations sur Figma puis intégration Vite/React : validation des états vides, erreurs cartographiques, indisponibilité service, et bascule thème clair / sombre.',
        },
        {
          subtitle: 'Tests & ajustements',
          content:
            'Scénarios « trajet typique » sur La Réunion : vérifier lisibilité des estimations, enchaînements clavier / tactile, et cohérence avec le dashboard chauffeur (démo).',
        },
      ],
    },
    
    // 5. Wireframes
    wireframes: {
      title: 'Wireframes & prototype',
      items: [
        {
          image: '',
          description:
            'Maquettes du flux réservation : colonne carte, colonne formulaire, étapes chauffeurs et récapitulatif — avec navigation claire entre accueil, Go et contact.',
        },
      ],
    },
    
    // 6. Design System
    designSystem: {
      colorPalette: {
        title: 'Palette colorimétrique',
        description:
          'Palette Palto : contrastes compatibles carte interactive, surfaces cartes lisibles, couleurs d’action distinctes pour recherche, confirmation et alertes.',
        categories: {
          neutrals: {
            title: 'Neutrals (pour les surfaces et textes)',
            colors: [
              { role: 'Surface principale', token: 'surface.primary', color: '#F1F3F4', usage: 'Background app' },
              { role: 'Surface secondaire', token: 'surface.secondary', color: '#DCE3EB', usage: 'Cartes, hover' },
              { role: 'Surface surélevée', token: 'surface.elevation', color: '#FFFFFF', usage: 'Modale, carte + ombre' },
              { role: 'Bordure', token: 'border.default', color: '#DCDCDD', usage: 'Séparateurs' },
              { role: 'Texte principal', token: 'text.primary', color: '#1C1C1C', usage: 'Titre, texte' },
              { role: 'Texte secondaire', token: 'text.secondary', color: '#4D4D4D', usage: 'Labels, sous-titres' },
              { role: 'Texte inversé', token: 'text.onPrimary', color: '#FFFFFF', usage: 'Texte sur bouton coloré' }
            ]
          },
          primary: {
            title: 'Primary (action principale)',
            colors: [
              { role: 'Primaire', token: 'primary.base', color: '#007D9F' },
              { role: 'Hover', token: 'primary.hover', color: '#00647E' },
              { role: 'Pressed', token: 'primary.pressed', color: '#004E63' },
              { role: 'Texte sur bouton', token: 'text.onPrimary', color: '#FFFFFF' }
            ]
          },
          secondary: {
            title: 'Secondary (action secondaire ou highlight)',
            colors: [
              { role: 'Secondaire', token: 'secondary.base', color: '#F07F00' },
              { role: 'Hover', token: 'secondary.hover', color: '#D86F00' },
              { role: 'Texte sur bouton', token: 'text.onSecondary', color: '#FFFFFF' }
            ]
          },
          accent: {
            title: 'Accent / Warning / Highlight',
            colors: [
              { role: 'Accent', token: 'accent.warning', color: '#D8DA00' },
              { role: 'Texte sur accent', token: 'text.onAccent', color: '#1C1C1C' }
            ]
          },
          error: {
            title: 'Error / Danger',
            colors: [
              { role: 'Erreur', token: 'error.base', color: '#ED6C77' },
              { role: 'Hover', token: 'error.hover', color: '#CC525C' },
              { role: 'Texte sur erreur', token: 'text.onError', color: '#FFFFFF' }
            ]
          }
        }
      },
      typography: {
        title: 'Système typographique',
        description:
          'Échelle typographique Inter pour hiérarchiser titres de section, champs de formulaire, estimations et textes d’aide — avec tailles confortables sur mobile.',
        items: [
          { style: 'H1', font: 'Inter variable', size: '32', lineHeight: '150% → 48px' },
          { style: 'H2', font: 'Inter variable', size: '29', lineHeight: '150% → 43.5px' },
          { style: 'H3', font: 'Inter variable', size: '26', lineHeight: '150% → 39px' },
          { style: 'H4', font: 'Inter variable', size: '23', lineHeight: '150% → 34.5px' },
          { style: 'H5', font: 'Inter variable', size: '20', lineHeight: '150% → 30px' },
          { style: 'H6', font: 'Inter variable', size: '18', lineHeight: '150% → 27px' },
          { style: 'p', font: 'Inter', size: '16', lineHeight: 'Auto' },
          { style: 'span', font: 'Inter', size: '14', lineHeight: 'Auto' },
          { style: 'label', font: 'Inter', size: '14', lineHeight: 'Auto' }
        ]
      }
    },
    
    // 7. Implémentation & Technologies
    implementation: {
      title: 'Développement & stack',
      technologies: ['React', 'TypeScript', 'Vite', 'OpenStreetMap', 'Supabase (optionnel)', 'Vercel (API)'],
      architecture:
        'Frontend SPA (pushState) avec modules services (géocodage, directions, création de course). APIs serverless pour persistance et actions chauffeur lorsque les variables d’environnement sont activées.',
    },
    
    // 8. Impacts & Résultats
    results: {
      title: 'Résultats & indicateurs (démo)',
      metrics: [
        { label: 'Parcours', value: '5 étapes clés jusqu’au récap' },
        { label: 'Carte', value: 'OpenStreetMap géocodage + directions' },
        { label: 'Persistance', value: 'API + Supabase (optionnelle)' },
      ],
      feedback:
        'Les retours internes portent sur la lisibilité du trajet, la compréhension du mode « maintenant / plus tard » et la cohérence avec l’espace chauffeur.',
      improvements:
        'Paiement en ligne, notifications push, suivi temps réel avancé et enrichissement des règles métier côté serveur.',
    },
    
    // 9. Conclusion
    conclusion: {
      title: 'Conclusion & pistes',
      content:
        'Go pose une base produit claire pour Palto : réservation guidée, carte au centre, et pont vers le dashboard chauffeur. Les prochaines itérations concernent surtout l’exécution métier (statuts, paiement, notifications).',
      nextSteps: [
        'Durcissement API + règles de course',
        'Notifications passager / chauffeur',
        'Enrichissement des lieux populaires et du barème affiché',
        'Mesure d’usage réelle après déploiement terrain',
      ],
    },
    
    // Métadonnées
    year: '2025',
    image: PLACEHOLDER_COVER,
    skills: ['UX Research', 'Design system', 'UI', 'Branding', 'Figma', 'React js'],
    duration: 'Produit en évolution',
    type: 'Application web',
    team: ['Palto — équipe produit & développement'],
    translations: {
      en: {
        subtitle: 'Palto ride booking on Réunion Island',
        summary:
          'Go is the Palto passenger journey: pickup and drop-off on the island, time and distance estimates, immediate or scheduled ride, nearby drivers, then confirmation.\n\nThe goal is to make the trip readable (map + text), reduce address mistakes, and clarify what happens before, during, and after the ride request.',
        objectifs: [
          'Reduce friction: enter a route quickly, with address suggestions and map fallback.',
          'Reassure: show estimates, route, and steps before sending the ride request.',
          'Prepare for scale: UI ready for API + Supabase persistence and driver dashboard follow-up.',
        ],

        problematique:
          'How do we keep booking short and understandable on mobile, while being honest about what is estimated (time, distance, driver availability) and what still depends on business rules (off-line payment, real confirmation)?',
        solution:
          'Go structures the flow into steps: locations → map & route → ride mode → drivers → recap → submit. Copy and states guide the user; enabling the API connects this flow to the driver schedule.',

        teamNote:
          'Demo product copy: labels and metrics illustrate the Palto positioning (moto-taxi, Réunion) without legacy client case studies.',

        positionnementMatrix: {
          axisHorizontalPrefix: 'X Axis (Horizontal) ',
          axisVerticalPrefix: 'Y Axis (Vertical) ',
          xAxisLabel: 'Local specificity',
          yAxisLabel: 'Guided journey',
          xMinLabel: 'Low',
          xMaxLabel: 'High',
          yMinLabel: 'Low',
          yMaxLabel: 'High',
          points: [
            { name: 'Direct call', description: 'Fast but weak traceability, no centralized estimate.', x: -6, y: 6 },
            { name: 'Messaging', description: 'Informal coordination of trips and fares.', x: 6, y: 6 },
            { name: 'Global aggregator', description: 'Broad coverage, less tuned to Réunion habits.', x: -6, y: -6 },
            { name: 'Palto Go', description: 'Structured flow, local map, clear time window.', x: 6, y: -6 },
          ],
        },
        auditLead:
          'Research on local habits: short trips, reliable addresses, hesitation on timing, and quick reading outdoors (brightness, interruptions).',

        auditBody: `References from other mobility apps mainly informed patterns: clear pickup point, visible price or estimate, and fewer round-trips between map and form. The goal is not to clone a global app, but to tune the flow to Réunion (network, vocabulary, places).`,

        auditLeadAfterCarousel: `Palto stays pragmatic: prioritize understanding the trip and the time window, then matching. Marketing copy is limited in favor of explicit actions (search, confirm, contact).`,

        auditBodyAfterCarousel: `Integrations (OpenStreetMap geocoding / directions, optional Supabase persistence) are framed as extensions of the same flow, not a product pivot: the UI stays stable when the backend is turned on.`,

        archLead:
          'The product flow is split into independent blocks: address entry, map & route, mode selection (now / later), driver list, recap — so the API can be enabled without breaking the UI.',

        architectureDsDuplicateLead: `The interface stays calm so the map and addresses stay in focus.

Colors and surfaces follow Material-inspired principles for contrast and hierarchy on mobile.`,

        architectureDsDuplicateBody: `Neutral palette: light / dark backgrounds, card surfaces distinct from the map.

Hierarchy: elevation levels for modals, estimate callouts, and driver lists.

4px grid: alignment for buttons, fields, and status chips on the booking path.`,

        architectureDsDuplicatePivotH3: 'Readability & themes',

        conceptionDuplicateLead: `The main challenge is information density: map, address fields, suggestions, estimate, and primary CTA must coexist without hiding each other, especially on small screens.`,

        conceptionDuplicatePivotH3: 'Map & form',

        conceptionDuplicateBody: `Several layouts were tested: full-width map with a collapsible booking panel, then multi-column on desktop. The trip stays visible while the user fixes an address or changes the time.

Step transitions (search loading, network errors, mapping service unavailable) use explicit copy to avoid dead ends.`,

        userFlow: {
          title: 'User journey',
          nodes: [
            { id: 'login', name: 'Sign in' },
            { id: 'dashboard', name: 'Home & map' },
            { id: 'compte', name: 'Pickup / drop-off' },
            { id: 'matching', name: 'Nearby drivers' },
            { id: 'lancer-des', name: 'Map & route' },
            { id: 'jeux-lettres', name: 'Now / schedule' },
            { id: 'ateliers', name: 'Recap & submit' },
            { id: 'creation', name: 'Saved places' },
            { id: 'session', name: 'Passenger account' },
            { id: 'suivi', name: 'Help & contact' },
            { id: 'detail-atelier', name: 'Ride detail' },
            { id: 'config', name: 'Confirmation' },
          ],
          links: [
            { from: 'login', to: 'dashboard' },
            { from: 'dashboard', to: 'compte' },
            { from: 'dashboard', to: 'ateliers' },
            { from: 'dashboard', to: 'creation' },
            { from: 'dashboard', to: 'session' },
            { from: 'dashboard', to: 'suivi' },
            { from: 'compte', to: 'matching' },
            { from: 'compte', to: 'lancer-des' },
            { from: 'compte', to: 'jeux-lettres' },
            { from: 'ateliers', to: 'detail-atelier' },
            { from: 'creation', to: 'config' },
          ],
        },

        team: ['Palto — product & engineering'],
        designSystemNeutrals: [
          { role: 'Main surface', usage: 'Background app' },
          { role: 'Secondary surface', usage: 'Cards, hover' },
          { role: 'Elevated surface', usage: 'Modal, card + shadow' },
          { role: 'Border', usage: 'Separators' },
          { role: 'Main text', usage: 'Title, text' },
          { role: 'Secondary text', usage: 'Labels, subtitles' },
          { role: 'Inverted text', usage: 'Text on colored button' },
        ],
      },
    },
  },
};
