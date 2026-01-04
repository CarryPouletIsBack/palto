export interface FlowNodeData {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  // If the node branches vertically into multiple children
  branches?: FlowNodeData[];
  // If the node flows horizontally into a sequence
  next?: FlowNodeData;
}

export const flowData: FlowNodeData = {
  id: "racines",
  label: "Racines",
  description: "Les racines représentent les compétences fondamentales invisibles mais essentielles. Sans ça, rien ne tient.",
  branches: [
    {
      id: "domaine_product",
      label: "Product Design",
      description: "Domaine principal : compétences orientées produit, usage, business et faisabilité technique.",
      branches: [
        { 
          id: "branche_ux", 
          label: "UX Design",
          description: "Architecture de l'information, parcours utilisateurs, wireframes & flows, accessibilité, heuristiques & bonnes pratiques.",
          branches: [
            {
              id: "ux_architecture_info",
              label: "Architecture de l'information",
              description: "Structuration et organisation de l'information pour faciliter la navigation et la compréhension."
            },
            {
              id: "ux_parcours_utilisateurs",
              label: "Parcours utilisateurs",
              description: "Mapping des parcours, identification des points de friction, optimisation des flows."
            },
            {
              id: "ux_wireframes",
              label: "Wireframes & flows",
              description: "Création de wireframes structurés, diagrammes de flux, prototypage basse fidélité."
            },
            {
              id: "ux_accessibilite",
              label: "Accessibilité",
              description: "Conception inclusive, respect des standards WCAG, accessibilité universelle."
            },
            {
              id: "ux_heuristiques",
              label: "Heuristiques & bonnes pratiques",
              description: "Application des principes de Nielsen, bonnes pratiques UX, design patterns éprouvés."
            },
          ]
        },
        {
          id: "branche_ui",
          label: "UI Design",
          description: "Hiérarchie visuelle, design system, composants & variantes, typographie, couleur & contrastes.",
          branches: [
            {
              id: "ui_hierarchie",
              label: "Hiérarchie visuelle",
              description: "Organisation visuelle de l'information, hiérarchisation des éléments, composition."
            },
            {
              id: "ui_design_system",
              label: "Design system",
              description: "Création et maintenance de design systems, composants réutilisables, documentation."
            },
            {
              id: "ui_composants",
              label: "Composants & variantes",
              description: "Design de composants modulaires, variantes d'états, patterns d'interaction."
            },
            {
              id: "ui_typographie",
              label: "Typographie",
              description: "Choix typographiques, hiérarchie textuelle, lisibilité, système de typescale."
            },
            {
              id: "ui_couleur",
              label: "Couleur & contrastes",
              description: "Palettes de couleurs, systèmes de couleurs, accessibilité des contrastes, tokens de couleur."
            },
          ],
          next: {
            id: "domaine_design_system",
            label: "Design System",
            description: "Intégration UX et UI : création et maintenance d'un design system cohérent, composants réutilisables, documentation, gouvernance."
          }
        },
        { 
          id: "branche_collab", 
          label: "Collaboration & Delivery",
          description: "Travail avec devs, suivi d'implémentation, handoff, communication avec clients / équipes.",
          branches: [
            {
              id: "collab_devs",
              label: "Collaboration développeurs",
              description: "Travail en étroite collaboration avec les équipes techniques, compréhension des contraintes dev, communication efficace."
            },
            {
              id: "collab_handoff",
              label: "Handoff & spécifications",
              description: "Préparation des spécifications design, handoff technique optimisé, documentation design-dev."
            },
            {
              id: "collab_suivi",
              label: "Suivi d'implémentation",
              description: "QA design, review d'implémentation, ajustements post-release, maintien de la qualité design."
            },
            {
              id: "collab_communication",
              label: "Communication équipes",
              description: "Communication claire avec les stakeholders, présentation de concepts, facilitation de workshops."
            },
            {
              id: "collab_clients",
              label: "Gestion clients",
              description: "Relation client, présentation de propositions, gestion de feedback, alignement stratégique."
            },
          ],
          next: {
            id: "competence_clee_delivery",
            label: "Delivery & processus",
            description: "Compétence clé : respect des deadlines, gestion de projets design, organisation du workflow, efficacité opérationnelle."
          }
        },
        {
          id: "branche_tech",
          label: "Tech & Implémentation",
          description: "Compréhension technique, collaboration dev, prototypage avancé, notions de développement pour mieux collaborer.",
          branches: [
            {
              id: "tech_comprehension",
              label: "Compréhension technique",
              description: "Compréhension des concepts techniques, architecture, stack technologique, limites et possibilités des technologies."
            },
            {
              id: "tech_prototypage",
              label: "Prototypage avancé",
              description: "Prototypes interactifs avancés, prototypage code, démonstrations fonctionnelles, validation technique."
            },
            {
              id: "tech_collaboration",
              label: "Collaboration développeurs",
              description: "Communication efficace avec les équipes techniques, compréhension des contraintes dev, alignement technique."
            },
            {
              id: "tech_notions",
              label: "Notions de développement",
              description: "Bases HTML/CSS, notions JavaScript/React, compréhension des frameworks, capacité à lire et comprendre du code."
            },
            {
              id: "tech_specifications",
              label: "Spécifications techniques",
              description: "Rédaction de spécifications techniques claires, documentation technique, specs pour l'implémentation."
            },
            {
              id: "tech_qa",
              label: "QA & validation technique",
              description: "Tests d'implémentation, validation technique, revue de code design, assurance qualité technique."
            },
          ],
          next: {
            id: "product_intermediaire",
            label: "Product Design Intermédiaire",
            description: "Niveau intermédiaire : maîtrise des outils et méthodologies, capacité à mener des projets autonomes.",
            branches: [
              {
                id: "branche_product_thinking",
                label: "Product Thinking",
                description: "Analyse des besoins, priorisation, arbitrages UX / business, vision globale du produit."
              },
              {
                id: "branche_research",
                label: "User Research",
                description: "Recherche utilisateur, tests utilisateurs structurés, méthodologies de découverte, validation de solutions."
              },
              {
                id: "branche_data",
                label: "Data & Impact",
                description: "Data produit & analytics, design orienté impact (metrics), analyse des performances, décisions data-driven."
              },
              {
                id: "secondaire_veille",
                label: "Veille & culture",
                description: "Tendances produit, benchmark, analyse concurrentielle.",
                next: {
                  id: "feuille_webflow",
                  label: "Webflow",
                  description: "Prototypage web et création de sites interactifs sans code.",
                  disabled: true,
                },
              },
              {
                id: "secondaire_systemes",
                label: "Systèmes",
                description: "Logique de composants, scalabilité, réutilisabilité.",
                next: {
                  id: "feuille_dev",
                  label: "HTML/CSS/React",
                  description: "Notions de développement pour mieux collaborer avec les développeurs.",
                  next: { 
                    id: "feuille_cursor", 
                    label: "Cursor / IA",
                    description: "Outils IA pour accélérer le développement et améliorer la productivité."
                  },
                },
              },
              {
                id: "maitrise_intermediaire",
                label: "Maîtrise Intermédiaire",
                description: "Maîtrise des compétences du niveau Intermédiaire, validation permettant d'accéder au niveau Confirmé dans le domaine Product Design.",
                next: {
                  id: "product_confirme",
                  label: "Product Design Confirmé",
                  description: "Niveau confirmé : expertise reconnue, capacité à lead des projets complexes et à influencer la stratégie.",
                  next: {
                    id: "cime_confirme",
                    label: "Product Designer confirmé",
                    description: "Niveau senior avec une expertise reconnue dans le design de produits.",
                    disabled: true,
                    next: {
                      id: "maitrise_confirme",
                      label: "Maîtrise Confirmé",
                      description: "Maîtrise des compétences du niveau Confirmé, validation permettant d'accéder au niveau Évolution dans le domaine Product Design.",
                      next: {
                        id: "product_evolution",
                        label: "Product Design Évolution",
                        description: "Niveau évolution : leadership stratégique, contribution à haut niveau, vision long terme.",
                        next: {
                          id: "cime_lead",
                          label: "Lead un produit",
                          description: "Capacité à lead un produit de A à Z, de la stratégie à l'exécution.",
                          next: {
                            id: "cime_decisions",
                            label: "Décisions usage + data",
                            description: "Décisions basées sur usage + data, approche data-driven du design.",
                            disabled: true,
                            next: { 
                              id: "cime_strategie", 
                              label: "Contribution stratégique",
                              description: "Vision stratégique et contribution à la direction produit au niveau exécutif."
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
            {
              id: "domaine_da",
              label: "Direction Artistique",
              description: "Domaine : cohérence visuelle, branding & identité, exigence esthétique, regard critique, sensibilité artistique appliquée au produit.",
              branches: [
                {
                  id: "da_conception_image",
                  label: "Conception d'image",
                  description: "Composition d'images (grille, alignements, rapports de tailles), gestion des masses visuelles et des vides, lecture de l'image et guidage du regard, travail sur le cadrage, le contraste et la profondeur, mise en relation image / texte.",
                  branches: [
                    {
                      id: "da_comp_composition",
                      label: "Composition d'images",
                      description: "Grille, alignements, rapports de tailles."
                    },
                    {
                      id: "da_comp_masses_vides",
                      label: "Gestion des masses visuelles et des vides",
                      description: "Équilibre visuel et respiration."
                    },
                    {
                      id: "da_comp_lecture",
                      label: "Lecture de l'image et guidage du regard",
                      description: "Hiérarchie visuelle et parcours de lecture."
                    },
                    {
                      id: "da_comp_cadrage",
                      label: "Cadrage, contraste et profondeur",
                      description: "Travail sur le cadrage, le contraste et la profondeur."
                    },
                    {
                      id: "da_comp_image_texte",
                      label: "Mise en relation image / texte",
                      description: "Articulation harmonieuse entre image et texte."
                    },
                  ]
                },
                {
                  id: "da_couleur",
                  label: "Couleur",
                  description: "Construction de palettes (dominante, secondaire, accent), gestion des contrastes (valeur, saturation, température), utilisation de la couleur pour la hiérarchie visuelle, adaptation des couleurs selon le support (print / écran), tests de lisibilité et d'accessibilité basiques.",
                  branches: [
                    {
                      id: "da_couleur_palettes",
                      label: "Construction de palettes",
                      description: "Dominante, secondaire, accent."
                    },
                    {
                      id: "da_couleur_contrastes",
                      label: "Gestion des contrastes",
                      description: "Valeur, saturation, température."
                    },
                    {
                      id: "da_couleur_hierarchie",
                      label: "Couleur pour la hiérarchie visuelle",
                      description: "Utilisation de la couleur pour structurer l'information."
                    },
                    {
                      id: "da_couleur_support",
                      label: "Adaptation selon le support",
                      description: "Print / écran, tests de lisibilité et d'accessibilité basiques."
                    },
                  ]
                },
                {
                  id: "da_typographie",
                  label: "Typographie",
                  description: "Choix typographique selon le contexte (éditorial, branding, interface, affiche), associations de fontes (serif / sans-serif, contraste de styles), gestion des hiérarchies (titres, intertitres, corps), interlignage, chasse, césure, lisibilité, utilisation de la typo comme élément graphique.",
                  branches: [
                    {
                      id: "da_typo_choix",
                      label: "Choix typographique selon contexte",
                      description: "Éditorial, branding, interface, affiche."
                    },
                    {
                      id: "da_typo_associations",
                      label: "Associations de fontes",
                      description: "Serif / sans-serif, contraste de styles."
                    },
                    {
                      id: "da_typo_hierarchies",
                      label: "Gestion des hiérarchies",
                      description: "Titres, intertitres, corps, interlignage, chasse, césure, lisibilité."
                    },
                    {
                      id: "da_typo_graphique",
                      label: "Typo comme élément graphique",
                      description: "Utilisation de la typographie comme élément visuel."
                    },
                  ]
                },
                {
                  id: "da_identite_visuelle",
                  label: "Identité visuelle",
                  description: "Création de logos simples et exploitables, définition de règles d'usage (couleurs, typo, marges, variantes), déclinaison cohérente sur plusieurs supports, capacité à faire évoluer une identité existante sans la casser.",
                  branches: [
                    {
                      id: "da_identite_logos",
                      label: "Création de logos",
                      description: "Logos simples et exploitables."
                    },
                    {
                      id: "da_identite_regles",
                      label: "Définition de règles d'usage",
                      description: "Couleurs, typo, marges, variantes."
                    },
                    {
                      id: "da_identite_declinaison",
                      label: "Déclinaison sur plusieurs supports",
                      description: "Cohérence multi-supports."
                    },
                    {
                      id: "da_identite_evolution",
                      label: "Évolution d'une identité existante",
                      description: "Faire évoluer une identité sans la casser."
                    },
                  ]
                },
                {
                  id: "da_mise_en_page",
                  label: "Mise en page & supports",
                  description: "Mise en page print et digital, adaptation d'un visuel à différents formats, contraintes techniques (résolution, marges, formats), préparation de fichiers (export, contraintes imprimeur / web).",
                  branches: [
                    {
                      id: "da_mep_print_digital",
                      label: "Mise en page print et digital",
                      description: "Adaptation aux différents supports."
                    },
                    {
                      id: "da_mep_formats",
                      label: "Adaptation à différents formats",
                      description: "Adaptation d'un visuel à différents formats."
                    },
                    {
                      id: "da_mep_contraintes",
                      label: "Contraintes techniques",
                      description: "Résolution, marges, formats."
                    },
                    {
                      id: "da_mep_preparation",
                      label: "Préparation de fichiers",
                      description: "Export, contraintes imprimeur / web."
                    },
                  ]
                },
                {
                  id: "da_direction_creative",
                  label: "Direction créative",
                  description: "Traduction d'un brief en axes graphiques, définition de partis pris visuels, capacité à justifier des choix graphiques, arbitrage entre esthétique et contraintes projet.",
                  branches: [
                    {
                      id: "da_crea_brief",
                      label: "Traduction brief en axes graphiques",
                      description: "Traduction d'un brief en axes graphiques."
                    },
                    {
                      id: "da_crea_partis_pris",
                      label: "Définition de partis pris visuels",
                      description: "Définition de partis pris visuels."
                    },
                    {
                      id: "da_crea_justification",
                      label: "Justification des choix graphiques",
                      description: "Capacité à justifier des choix graphiques."
                    },
                    {
                      id: "da_crea_arbitrage",
                      label: "Arbitrage esthétique / contraintes",
                      description: "Arbitrage entre esthétique et contraintes projet."
                    },
                  ]
                },
                {
                  id: "da_culture_visuelle",
                  label: "Culture visuelle & méthode",
                  description: "Veille graphique régulière, analyse de références (ce qui fonctionne / pourquoi), capacité à reproduire puis adapter un style, attention au détail et à la cohérence globale.",
                  branches: [
                    {
                      id: "da_culture_veille",
                      label: "Veille graphique régulière",
                      description: "Veille graphique régulière."
                    },
                    {
                      id: "da_culture_analyse",
                      label: "Analyse de références",
                      description: "Ce qui fonctionne / pourquoi."
                    },
                    {
                      id: "da_culture_reproduction",
                      label: "Reproduction et adaptation de style",
                      description: "Capacité à reproduire puis adapter un style."
                    },
                    {
                      id: "da_culture_detail",
                      label: "Attention au détail et cohérence",
                      description: "Attention au détail et à la cohérence globale."
                    },
                  ]
                },
              ],
            },
  ],
};
