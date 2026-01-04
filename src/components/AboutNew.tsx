import './AboutNew.css'
import './About.css'
import { useState } from 'react'
import { TreeNode } from './flow/FlowTree'
import { flowData } from '../data/flowData'
import type { FlowNodeData } from '../data/flowData'
import DotGrid from './DotGrid.jsx'
import HoverCard from './HoverCard'
import { aboutData } from '../data/aboutData'
import HumanBody3D from './HumanBody3D'

const AboutNew = () => {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [selectedNodeData, setSelectedNodeData] = useState<FlowNodeData | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null)
  const [activeSection, setActiveSection] = useState<string>('about-intro')

  // Trouver le nœud dans les données
  const findNode = (data: FlowNodeData, id: string): FlowNodeData | null => {
    if (data.id === id) return data
    if (data.branches) {
      for (const branch of data.branches) {
        const found = findNode(branch, id)
        if (found) return found
      }
    }
    if (data.next) {
      const found = findNode(data.next, id)
      if (found) return found
    }
    return null
  }

  // Trouver tous les ascendants (parents) d'un nœud
  const findAncestors = (data: FlowNodeData, targetId: string, path: string[] = []): string[] | null => {
    // Si on a trouvé le nœud cible, retourner le chemin
    if (data.id === targetId) {
      return path
    }

    // Chercher dans les branches
    if (data.branches) {
      for (const branch of data.branches) {
        const result = findAncestors(branch, targetId, [...path, data.id])
        if (result) return result
      }
    }

    // Chercher dans next
    if (data.next) {
      const result = findAncestors(data.next, targetId, [...path, data.id])
      if (result) return result
    }

    return null
  }

  const handleNodeClick = (nodeId: string, event?: React.MouseEvent) => {
    const node = findNode(flowData, nodeId)
    
    if (node) {
      if (selectedNodeData?.id === nodeId) {
        // Si on clique sur le même nœud, fermer la popup
        setSelectedNodeData(null)
        setPopupPosition(null)
        setSelectedNodes(new Set())
      } else {
        // Sinon, ouvrir la popup et désélectionner tous les autres nœuds
        if (event) {
          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
          const containerRect = document.querySelector('.skill-tree-container')?.getBoundingClientRect()
          
          if (containerRect) {
            // Positionner la popup à droite du nœud avec un petit offset
            setPopupPosition({
              x: rect.right - containerRect.left + 16,
              y: rect.top - containerRect.top + (rect.height / 2)
            })
          }
        }
        setSelectedNodeData(node)
        
        // Trouver tous les ascendants du nœud sélectionné
        const ancestors = findAncestors(flowData, nodeId)
        const nodesToSelect = ancestors ? [...ancestors, nodeId] : [nodeId]
        
        // Remplacer complètement le Set avec le nœud et tous ses ascendants
        setSelectedNodes(new Set(nodesToSelect))
      }
    }
  }

  const closePopup = () => {
    setSelectedNodeData(null)
    setPopupPosition(null)
  }

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      const offset = 120 // Offset pour tenir compte de la barre de recherche
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="page active apropos-new-page">
      <div className="apropos-new-page-bg">
        <DotGrid
          dotSize={3}
          gap={10}
          baseColor="#b51a00"
          activeColor="#e32400"
          proximity={140}
          speedTrigger={100}
          shockRadius={240}
          shockStrength={5}
          maxSpeed={5000}
          resistance={750}
          returnDuration={1.5}
        />
      </div>
      
      {/* Menu de navigation sous la search bar */}
      <div className="about-new-nav-menu">
        <button 
          className={`nav-menu-button ${activeSection === 'about-intro' ? 'active' : ''}`}
          onClick={() => scrollToSection('about-intro')}
        >
          Introduction
        </button>
        <button 
          className={`nav-menu-button ${activeSection === 'about-description' ? 'active' : ''}`}
          onClick={() => scrollToSection('about-description')}
        >
          Description
        </button>
        <button 
          className={`nav-menu-button ${activeSection === 'about-tree' ? 'active' : ''}`}
          onClick={() => scrollToSection('about-tree')}
        >
          Arbre de compétences
        </button>
      </div>

      <div className="main-apropos-new">
        {/* Section Introduction - 3 colonnes avec silhouette */}
        {activeSection === 'about-intro' && (
          <div id="about-intro" className="intro-three-columns">
            <div className="skill-tree-header">
              <div className="skill-tree-header-left">
                <span>(C)</span>
                <span>theme</span>
              </div>
              <div className="skill-tree-header-right">about</div>
            </div>
            
            <div className="intro-columns-container">
              {/* Colonne gauche */}
              <div className="intro-column intro-column-left">
                {/* Contenu à définir */}
              </div>
              
              {/* Colonne centrale - Silhouette 3D */}
              <div className="intro-column intro-column-center">
                <div className="human-silhouette-container">
                  <HumanBody3D />
                </div>
              </div>
              
              {/* Colonne droite */}
              <div className="intro-column intro-column-right">
                {/* Contenu à définir */}
              </div>
            </div>
          </div>
        )}

        {/* Section Description - Contenu de About */}
        {activeSection === 'about-description' && (
          <div id="about-description" className="about-intro-content-wrapper">
            <div className="about-intro-section">
              <div className="about-intro-content">
                <div className="about-text-column">
                  <h2 className="about-intro-title">À propos de moi</h2>
                  <p className="about-intro-description">
                    Passionné par le design et le développement, je crée des expériences digitales 
                    qui marquent les esprits. Mon approche allie créativité et technique pour 
                    transformer vos idées en solutions innovantes.
                  </p>
                  <p className="about-intro-description">
                    Spécialisé dans le design d'interface et le développement front-end, 
                    je mets mon expertise au service de projets variés, de l'application mobile 
                    au site web corporate.
                  </p>
                </div>
                <div className="about-photo-column">
                  <div className="about-photo-container">
                    <img 
                      src="/images/portrait-anthony.jpg" 
                      alt="Anthony Merault" 
                      className="about-photo"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section listing - Statistiques */}
            <div className="listing-section">
              {aboutData.stats.map((stat, index) => (
                <HoverCard key={index} intensity={0.05} scale={1.02}>
                  <div className="stat-card">
                    {stat.label === 'Niveau' ? (
                      <>
                        <p>{stat.label}</p>
                        <h3>{stat.value}</h3>
                      </>
                    ) : (
                      <>
                        <h3>{stat.value}</h3>
                        <p>{stat.label}</p>
                      </>
                    )}
                  </div>
                </HoverCard>
              ))}
            </div>

            {/* Carte principale cardLg */}
            <div className="card-lg">
              <div className="card-border"></div>
              <p className="card-title">{aboutData.mainDescription.title}</p>
              <div className="card-content">
                {aboutData.mainDescription.content.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Section content - Deux colonnes */}
            <div className="content-section">
              {/* Colonne gauche */}
              <div className="content-left">
                {/* Carte Compétences */}
                <div className="card-small">
                  <div className="card-border"></div>
                  <p className="card-title">{aboutData.skills.title}</p>
                  <div className="card-content">
                    {aboutData.skills.items.map((skill, index) => (
                      <p key={index}>{skill}</p>
                    ))}
                  </div>
                </div>

                {/* Carte Outils */}
                <div className="card-small">
                  <div className="card-border"></div>
                  <p className="card-title">{aboutData.tools.title}</p>
                  <div className="card-content">
                    {aboutData.tools.items.map((tool, index) => (
                      <p key={index}>{tool}</p>
                    ))}
                  </div>
                </div>

                {/* Carte Intérêts */}
                <div className="card-small">
                  <div className="card-border"></div>
                  <p className="card-title">{aboutData.interests.title}</p>
                  <div className="card-content">
                    {aboutData.interests.items.map((interest, index) => (
                      <p key={index}>{interest}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Colonne droite - Expériences */}
              <div className="content-right">
                <div className="card-large">
                  <div className="card-border"></div>
                  <p className="card-title">Expériences</p>

                  {aboutData.experiences.map((experience, index) => (
                    <div key={index} className="experience-item">
                      <div className="experience-header">
                        <p className="company-name">{experience.company}</p>
                        {experience.badges.map((badge, badgeIndex) => (
                          <div key={badgeIndex} className="experience-badge">
                            <div className="badge-border"></div>
                            <p className="badge-text">{badge}</p>
                          </div>
                        ))}
                      </div>
                      <p className="experience-period">{experience.period}</p>
                      <div className="experience-description">
                        {experience.description.map((desc, descIndex) => (
                          <p key={descIndex}>{desc}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section Formations */}
            <p className="formations-title">Formations</p>

            {/* Tableau des formations */}
            <div className="formations-table">
              <div className="table-header">
                <div className="table-col-name">
                  <p>Nom</p>
                </div>
                <div className="table-col-school">
                  <p>école</p>
                </div>
                <div className="table-col-year">
                  <p>Année</p>
                </div>
              </div>
              
              <div className="table-rows">
                {aboutData.formations.map((formation, index) => (
                  <div key={index}>
                    {index > 0 && <div className="table-separator"></div>}
                    <div className="table-row">
                      <div className="table-col-name">
                        <p>{formation.name}</p>
                      </div>
                      <div className="table-col-school">
                        <p>{formation.school}</p>
                      </div>
                      <div className="table-col-year">
                        <p>{formation.year}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section Arbre de compétences */}
        {activeSection === 'about-tree' && (
          <div className="skill-tree-wrapper">
            <div className="skill-tree-header">
              <div className="skill-tree-header-left">
                <span>(C)</span>
                <span>theme</span>
              </div>
              <div className="skill-tree-header-right">about</div>
            </div>
            <div id="about-tree" className="skill-tree-container">
            <TreeNode 
              data={flowData} 
              selectedNodes={selectedNodes}
              onNodeClick={handleNodeClick}
            />
            
            {/* Popup Tooltip */}
            {selectedNodeData && popupPosition && (
              <div 
                className="node-popup-tooltip"
                style={{
                  left: `${popupPosition.x}px`,
                  top: `${popupPosition.y}px`,
                  transform: 'translateY(-50%)'
                }}
              >
                <button className="node-popup-close" onClick={closePopup}>×</button>
                <h3 className="node-popup-title">{selectedNodeData.label}</h3>
                {selectedNodeData.description && (
                  <p className="node-popup-description">{selectedNodeData.description}</p>
                )}
                {selectedNodeData.branches && selectedNodeData.branches.length > 0 && (
                  <div className="node-popup-competences">
                    <h4 className="node-popup-competences-title">Compétences :</h4>
                    <ul className="node-popup-competences-list">
                      {selectedNodeData.branches.map((branch) => (
                        <li key={branch.id} className="node-popup-competence-item">
                          {branch.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default AboutNew
