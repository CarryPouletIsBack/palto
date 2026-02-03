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
  processReunions?: Array<{ label: string; title: string; description: string }>;
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
}

export const projectsDataNew: { [key: string]: ProjectData } = {
  'Playdago': {
    // 1. Titre principal
    title: 'Playdago',
    subtitle: 'Application de pédagogie active',
    badges: ['UX/UI', '2024', 'Application'],
    
    // 2. Résumé / Introduction (aligné Figma 49-229, adapté Playdago)
    summary: 'Playdago est un outil interne de gestion et de pilotage conçu pour une professionnelle de la pédagogie active. Le projet part d\'un besoin clair : centraliser des données aujourd\'hui éparpillées sur plusieurs plateformes (base clients, formations, commandes, newsletter, rappels, événements), afin d\'obtenir une vue d\'ensemble fiable, réduire la charge mentale et améliorer le suivi des activités. L\'objectif n\'était pas de remplacer les outils existants (emailing, e-commerce, etc.), mais de créer une interface centrale de lecture, de suivi et de rappel, capable de relier toutes les informations clés autour d\'un même client.',
    
    // 3. Contexte & Problématique
    context: {
      title: 'Contexte & Problématique',
      content: 'Playdago est un outil interne de gestion et de pilotage conçu pour une professionnelle de la pédagogie active. Le projet part d\'un besoin clair : centraliser des données aujourd\'hui éparpillées sur plusieurs plateformes (base clients, formations, commandes, newsletter, rappels, événements), afin d\'obtenir une vue d\'ensemble fiable, réduire la charge mentale et améliorer le suivi des activités. L\'objectif n\'était pas de remplacer les outils existants (emailing, e-commerce, etc.), mais de créer une interface centrale de lecture, de suivi et de rappel, capable de relier toutes les informations clés autour d\'un même client.'
    },
    
    // 4. Démarche & Approche
    approach: {
      title: 'Démarche UX/UI',
      sections: [
        {
          subtitle: 'Recherche utilisateur',
          content: 'Lors du premier rendez-vous, nous avons pris le temps d\'écouter et comprendre précisément les besoins de la cliente. Ce temps d\'échange était essentiel pour définir les fonctionnalités clés de l\'application et cerner les contraintes pédagogiques et organisationnelles. Le cahier des charges a été co-construit, ce qui a permis d\'affiner le projet au fil des discussions.'
        },
        {
          subtitle: 'Veille concurrentielle',
          content: 'Avant toute création, j\'ai mené une recherche approfondie pour mieux comprendre les enjeux UX spécifiques à ce type d\'outil : parcours utilisateur pédagogique, suivi de formation, alertes et rappels automatisés. Cette étape a inclus une veille concurrentielle afin d\'étudier des applications similaires et repérer les bonnes pratiques UX/UI.'
        },
        {
          subtitle: 'Idéation & Solutions testées',
          content: 'Plusieurs itérations de prototypes ont été réalisées sur Figma, testées avec la cliente pour valider les choix d\'interface et de navigation. L\'approche itérative a permis d\'affiner progressivement l\'expérience utilisateur en tenant compte des retours.'
        },
        {
          subtitle: 'Tests & itérations',
          content: 'Parallèlement, nous avons évalué avec l\'équipe de développement les technologies adaptées, en veillant à la faisabilité technique et au respect du budget. Les tests utilisateurs ont permis d\'identifier et corriger les points de friction.'
        }
      ]
    },
    
    // 5. Wireframes
    wireframes: {
      title: 'Wireframes & Prototype',
      items: [
        {
          image: '',
          description: 'Ce wireframe présente l\'architecture globale de l\'application avec la navigation principale et les fonctionnalités clés de gestion. La structure a été pensée pour faciliter l\'accès rapide aux informations essentielles.'
        }
      ]
    },
    
    // 6. Design System
    designSystem: {
      colorPalette: {
        title: 'Palette colorimétrique',
        description: 'Pour le projet Playdago, nous avons défini une palette dynamique et contrastée, en cohérence avec les valeurs de pédagogie active. L\'objectif était de renforcer l\'identité visuelle tout en garantissant une bonne lisibilité et une hiérarchisation claire de l\'information sur l\'interface.',
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
        description: 'Le système typographique a été construit autour d\'une échelle hiérarchique fine, allant de H1 (32 px) à H9 (13 px), avec un interlignage constant de 150 % pour assurer la lisibilité. J\'ai appliqué une logique modulaire en nommant chaque style selon sa fonction, ce qui a permis d\'optimiser leur réutilisabilité dans une approche Atomic Design. L\'ensemble repose sur la police Inter Variable, utilisée exclusivement dans différentes graisses pour structurer l\'interface.',
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
      title: 'Développement & Stack',
      technologies: ['React', 'TypeScript', 'Figma', 'Design System', 'Atomic Design'],
      architecture: 'Organisation du code en composants réutilisables suivant l\'approche Atomic Design. Utilisation de Figma pour la conception et prototypage interactif avec handoff développeur.'
    },
    
    // 8. Impacts & Résultats
    results: {
      title: 'Résultats & Retours',
      metrics: [
        { label: 'Gain de temps', value: '40% sur la gestion quotidienne' },
        { label: 'Satisfaction client', value: 'Très satisfait' },
        { label: 'Durée du projet', value: '9 mois' }
      ],
      feedback: 'La cliente a souligné la clarté de l\'interface et la facilité d\'utilisation. La centralisation a permis de réduire significativement le temps passé sur les tâches administratives quotidiennes.',
      improvements: 'Possibilité d\'ajouter des fonctionnalités de reporting avancé et d\'automatisation plus poussée des rappels dans une future version.'
    },
    
    // 9. Conclusion
    conclusion: {
      title: 'Conclusion & Pistes d\'évolution',
      content: 'Ce projet a démontré l\'importance d\'une approche centrée utilisateur et d\'une collaboration étroite avec le client. L\'application répond aux besoins identifiés et offre une base solide pour des évolutions futures.',
      nextSteps: [
        'Déploiement en production prévu pour Q1 2025',
        'Formation des utilisateurs finaux',
        'Collecte de feedback pour itérations futures',
        'Ajout de nouvelles fonctionnalités basées sur les retours terrain'
      ]
    },
    
    // Métadonnées
    year: '2024',
    image: '/images/cover-project-playdago.png',
    skills: ['UX Research', 'Design system', 'UI', 'Branding', 'Figma', 'React js'],
    duration: '9 mois',
    type: 'Application web',
    team: [
      'Anthony Merault, Directeur Artistique / Concepteur ux/ui',
      'Josian (dev back-end)',
      'Bertolde (dev front-end)'
    ]
  },
  'Pedaboard': {
    // 1. Titre principal
    title: 'Pedaboard',
    badges: ['Application', 'UX/UI', '2025', 'CRM'],
    
    // 2. Résumé / Introduction (contenu Figma node 49-229)
    summary: 'Pedaboard est un outil interne de gestion et de pilotage conçu pour une professionnelle de la pédagogie active. Le projet part d\'un besoin clair : centraliser des données aujourd\'hui éparpillées sur plusieurs plateformes (base clients, formations, commandes, newsletter, rappels, événements), afin d\'obtenir une vue d\'ensemble fiable, réduire la charge mentale et améliorer le suivi des activités. L\'objectif n\'était pas de remplacer les outils existants (emailing, e-commerce, etc.), mais de créer une interface centrale de lecture, de suivi et de rappel, capable de relier toutes les informations clés autour d\'un même client.',
    
    // Contexte du projet (Figma)
    objectifs: [
      'Améliorer l\'interaction en temps réel : Offrir une expérience fluide en direct pour les formateurs et les apprenants.',
      'Maintenir l\'engagement : Reproduire les mécanismes de jeu en présentiel sans la complexité des outils cognitivement lourds.',
      'Un suivi : Offrir aux formateurs la possibilité d\'effectuer un suivi approfondi des données.'
    ],
    teamNote: 'En tant que seul designer, j\'ai dû assimiler les principes de la gamification (analyse de Kahoot, jeux de cartes physiques) pour les transposer en interfaces numériques. J\'ai également étendu l\'identité visuelle de la cliente en créant un logo et en ajustant la palette de couleurs.',
    problematique: 'Trop de plateformes pour gérer l\'activité, résultat perte de temps et d\'attention.',
    solution: 'Le produit devra pouvoir afficher toutes les informations utiles de chaque plateforme différente pour optimiser le temps et éliminer la perte d\'attention du client.',
    positionnementMatrix: {
      xAxisLabel: 'Effort',
      yAxisLabel: 'Valeur',
      xMinLabel: 'Faible',
      xMaxLabel: 'Élevé',
      yMinLabel: 'Faible',
      yMaxLabel: 'Élevé',
      points: [
        { name: 'Brevo', description: 'liste de client (société, date d\'anniversaire, contact) etc.', x: -6, y: 6 },
        { name: 'Formation', description: 'personne ayant souscrit a un atelier', x: 6, y: 6 },
        { name: 'Woocommerce', description: 'vente de produit et de service', x: -6, y: -6 },
        { name: 'Notion', description: 'liste de tâches à réaliser', x: 6, y: -6 },
      ],
    },
    processReunions: [
      { label: '1er réunion', title: 'Audit', description: 'Découverte des outils existants, des plateformes utilisées et des difficultés rencontrées au quotidien. La cliente expliquait comment ses informations étaient dispersées et comment cela compliquait le suivi des clients et la gestion des formations.' },
      { label: '2e réunion', title: 'Cadrage Stratégique', description: 'Co-construction du cahier des charges, en priorisant les fonctionnalités essentielles comme le tableau de bord centralisé, le suivi des formations et les notifications automatiques.' },
      { label: '3e réunion', title: 'Architecture & Flux', description: 'Discussion sur les contraintes pédagogiques et organisationnelles, définition des parcours utilisateurs principaux et validation des workflows critiques.' },
      { label: '4e réunion', title: 'Validation', description: 'Validation des premières maquettes conceptuelles et recueil des retours détaillés sur l\'expérience et la hiérarchie de l\'information. Cette phase a permis de cerner précisément les besoins fonctionnels et UX.' }
    ],
    userFlow: {
      title: 'User flow',
      nodes: [
        { id: 'login', name: 'Login' },
        { id: 'dashboard', name: 'Dashboard' },
        { id: 'compte', name: 'Compte' },
        { id: 'contact', name: 'Contact' },
        { id: 'page-taches', name: 'Page Tâches' },
        { id: 'formation', name: 'Formation' },
        { id: 'laboratoire', name: 'Laboratoire' },
        { id: 'mot-de-passe-oublie', name: 'Mot de passe oublié' },
        { id: 'fiche-client', name: 'Fiche client' },
        { id: 'vue-tache', name: 'Vue tâche' },
        { id: 'details-formation', name: 'Détails' },
        { id: 'details-laboratoire', name: 'Détails' },
      ],
      links: [
        { from: 'login', to: 'dashboard' },
        { from: 'dashboard', to: 'compte' },
        { from: 'compte', to: 'contact' },
        { from: 'contact', to: 'page-taches' },
        { from: 'page-taches', to: 'formation' },
        { from: 'formation', to: 'laboratoire' },
        { from: 'login', to: 'mot-de-passe-oublie' },
        { from: 'contact', to: 'fiche-client' },
        { from: 'page-taches', to: 'vue-tache' },
        { from: 'formation', to: 'details-formation' },
        { from: 'laboratoire', to: 'details-laboratoire' },
      ],
    },
    
    // 3. Contexte & Problématique (contenu Figma node 49-229)
    context: {
      title: 'Contexte & Problématique',
      content: 'Pedaboard est un outil interne de gestion et de pilotage conçu pour une professionnelle de la pédagogie active. Le projet part d\'un besoin clair : centraliser des données aujourd\'hui éparpillées sur plusieurs plateformes (base clients, formations, commandes, newsletter, rappels, événements), afin d\'obtenir une vue d\'ensemble fiable, réduire la charge mentale et améliorer le suivi des activités. L\'objectif n\'était pas de remplacer les outils existants (emailing, e-commerce, etc.), mais de créer une interface centrale de lecture, de suivi et de rappel, capable de relier toutes les informations clés autour d\'un même client.'
    },
    
    // 4. Contexte & Problématique
    contextProblem: {
      title: 'Contexte & Problématique',
      content: 'Pedaboard est un outil interne de gestion et de pilotage conçu pour une professionnelle de la pédagogie active. Le projet part d\'un besoin clair : centraliser des données aujourd\'hui éparpillées sur plusieurs plateformes (base clients, formations, commandes, newsletter, rappels, événements), afin d\'obtenir une vue d\'ensemble fiable, réduire la charge mentale et améliorer le suivi des activités. L\'objectif n\'était pas de remplacer les outils existants (emailing, e-commerce, etc.), mais de créer une interface centrale de lecture, de suivi et de rappel, capable de relier toutes les informations clés autour d\'un même client.'
    },
    
    // 5. Démarche & Approche
    approach: {
      title: 'Démarche UX/UI',
      sections: [
        {
          subtitle: 'Recherche utilisateur',
          content: 'Rendez-vous initial pour comprendre les besoins précis et définir les fonctionnalités clés du CRM. Le cahier des charges a été co-construit pour cerner les contraintes pédagogiques et organisationnelles.'
        },
        {
          subtitle: 'Veille concurrentielle',
          content: 'Recherche approfondie sur les enjeux UX des outils de gestion pédagogique. Étude de CRM similaires pour repérer les bonnes pratiques UX/UI et les adapter au contexte spécifique.'
        },
        {
          subtitle: 'Tests & itérations',
          content: 'Évaluation technique avec l\'équipe de développement pour valider la faisabilité et respecter le budget. Plusieurs itérations de prototypes et tests utilisateurs.'
        }
      ]
    },
    
    // 5. Wireframes
    wireframes: {
      title: 'Wireframes & Prototype',
      items: [
        {
          image: '/images/f27446bbc5c96f74d44074bc97b9be64f7cdf4cf.png',
          description: 'Architecture globale du CRM avec les modules de gestion des clients, formations et tâches. Interface pensée pour une navigation intuitive et un accès rapide aux fonctionnalités principales.'
        }
      ]
    },
    
    // 6. Design System
    designSystem: {
      colorPalette: {
        title: 'Palette colorimétrique',
        description: 'Une palette professionnelle et apaisante, adaptée à un outil de gestion quotidien. Les couleurs ont été choisies pour garantir lisibilité et hiérarchie visuelle claire.',
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
        description: 'Le système typographique a été construit autour d\'une échelle hiérarchique fine, allant de H1 (32 px) à H9 (13 px), avec un interlignage constant de 150 % pour assurer la lisibilité. Logique modulaire avec approche Atomic Design. Police Inter Variable pour structurer l\'interface.',
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
      title: 'Développement & Stack',
      technologies: ['React', 'Node.js', 'TypeScript', 'Figma', 'PostgreSQL'],
      architecture: 'Architecture full-stack avec séparation frontend/backend. Utilisation d\'un design system pour garantir la cohérence visuelle. Déploiement sur serveur dédié avec pipeline CI/CD.'
    },
    
    // 8. Impacts & Résultats
    results: {
      title: 'Résultats & Retours',
      metrics: [
        { label: 'Temps gagné', value: '35% sur gestion quotidienne' },
        { label: 'Taux de satisfaction', value: '95%' },
        { label: 'Réduction d\'outils', value: 'De 5 à 1 plateforme' }
      ],
      feedback: 'La cliente est ravie de la centralisation qui simplifie grandement son travail quotidien. Les rappels automatiques et la vue d\'ensemble ont été particulièrement appréciés.',
      improvements: 'Intégration future avec d\'autres outils métiers et ajout de fonctionnalités d\'analytics avancées.'
    },
    
    // 9. Conclusion
    conclusion: {
      title: 'Conclusion',
      content: 'Pedaboard a été un projet clé dans mon parcours, à la fois exigeant et formateur. En tant que Product Designer et Directeur Artistique, j\'ai pu aller bien au-delà du design d\'interface classique : j\'ai structuré une expérience produit complète, réfléchi à la cohérence entre les espaces fonctionnels et accompagné l\'équipe tout au long du processus de conception.\n\nCe projet m\'a permis de consolider mes bases en UX design, d\'approfondir ma compréhension des systèmes complexes et de renforcer ma capacité à faire le lien entre besoins utilisateurs, contraintes techniques et vision produit.\n\nMême si certaines parties n\'ont pas pu être testées avec des utilisateurs, Pedaboard reste pour moi une expérience déterminante, celle où j\'ai vraiment pris conscience de mon rôle de designer produit : créer du sens, simplifier la complexité et concevoir des solutions utiles.',
      nextSteps: [
        'Ajout d\'un module de facturation intégré',
        'Développement d\'une application mobile companion',
        'Intégration avec les outils de mailing existants',
        'Amélioration des rapports et statistiques'
      ]
    },
    
    // Métadonnées
    year: 'Décembre 2023',
    image: '/images/f27446bbc5c96f74d44074bc97b9be64f7cdf4cf.png',
    skills: ['UX Research', 'Design system', 'UI', 'Branding', 'Figma', 'React js'],
    duration: '9 mois',
    type: 'Application web - CRM',
    team: [
      'Anthony Merault, Lead Product Designer',
      'Frédéric Isambert, Chef de projet',
      'Nicola Bègue, Intégrateur',
      'Evan Rivière, Intégrateur'
    ]
  }
};
