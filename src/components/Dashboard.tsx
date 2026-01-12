import { useState, useEffect } from 'react';
import { type ProjectWithMeta, getAllProjects, deleteProject, searchProjects } from '../services/projectService';
import { logout } from '../services/authService';
import ProjectEditor from './ProjectEditor';
import DashboardStats from './DashboardStats';
import { 
  Home, 
  Folder, 
  BarChart3, 
  Book, 
  User, 
  Search, 
  ClipboardList, 
  Dice6, 
  Type, 
  Image as ImageIcon, 
  Edit, 
  Trash2,
  Grid3x3
} from 'lucide-react';
import './Dashboard.css';

interface DashboardProps {
  onBackClick?: () => void;
}

const Dashboard = ({ onBackClick }: DashboardProps) => {
  const [projects, setProjects] = useState<ProjectWithMeta[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('date');
  const [editingProject, setEditingProject] = useState<ProjectWithMeta | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeView, setActiveView] = useState<'projects' | 'stats' | 'services'>('projects');

  // Charger les projets au montage
  useEffect(() => {
    loadProjects();
    
    // Vérifier si on revient de l'authentification OAuth (tokens dans l'URL)
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    
    if (accessToken) {
      // Si on a des tokens dans l'URL, activer la vue Stats
      setActiveView('stats');
      // Nettoyer l'URL après un court délai pour laisser DashboardStats traiter les tokens
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 100);
    }
  }, []);

  // Recharger les projets après modification
  const loadProjects = () => {
    const allProjects = getAllProjects();
    setProjects(allProjects);
    setFilteredProjects(allProjects);
  };

  // Filtrer et rechercher les projets
  useEffect(() => {
    let filtered = projects;

    // Recherche
    if (searchQuery) {
      filtered = searchProjects(searchQuery);
    }

    // Filtre par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filtre par statut
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(p => p.status === selectedStatus);
    }

    // Tri
    filtered.sort((a, b) => {
      if (selectedSort === 'date') {
        const dateA = new Date(a.lastModified || a.createdAt || 0).getTime();
        const dateB = new Date(b.lastModified || b.createdAt || 0).getTime();
        return dateB - dateA;
      }
      if (selectedSort === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    setFilteredProjects(filtered);
  }, [projects, searchQuery, selectedCategory, selectedStatus, selectedSort]);

  const handleDelete = (id: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le projet "${projects.find(p => p.id === id)?.title}" ?`)) {
      deleteProject(id);
      loadProjects();
    }
  };

  const handleEdit = (project: ProjectWithMeta) => {
    setEditingProject(project);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingProject(null);
    setIsCreating(true);
  };

  const handleSave = (project: ProjectWithMeta) => {
    loadProjects();
    setEditingProject(null);
    setIsCreating(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
    return `Il y a ${Math.floor(diffDays / 365)} ans`;
  };

  const getCategoryIcon = (category?: string) => {
    // Retourner une icône basée sur la catégorie
    return <Folder size={24} />;
  };

  return (
    <div className="page active">
      <div className="main-accueil">
        <div className="dashboard-container">
          {/* Sidebar */}
          <div className="dashboard-sidebar">
        <div className="dashboard-logo">
          <h2>Dashboard</h2>
        </div>
        
        <nav className="dashboard-nav">
          <button 
            className={`dashboard-nav-item ${activeView === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveView('projects')}
          >
            <span className="nav-icon"><Folder size={24} /></span>
            <span className="nav-label">Projets</span>
          </button>
          <button 
            className={`dashboard-nav-item ${activeView === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveView('stats')}
          >
            <span className="nav-icon"><BarChart3 size={24} /></span>
            <span className="nav-label">Stats</span>
          </button>
          <button 
            className={`dashboard-nav-item ${activeView === 'services' ? 'active' : ''}`}
            onClick={() => setActiveView('services')}
          >
            <span className="nav-icon"><Book size={24} /></span>
            <span className="nav-label">Services</span>
          </button>
        </nav>

        <div className="dashboard-user">
          <button 
            className="dashboard-avatar"
            onClick={() => {
              logout();
              window.location.href = '/';
            }}
            title="Se déconnecter"
          >
            <User size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        {activeView === 'stats' ? (
          <DashboardStats googleAnalyticsId="G-MS120551E9" />
        ) : (
          <>
            {/* Search Bar */}
            <div className="dashboard-search">
              <input
                type="text"
                placeholder="Recherchez un projet, une catégorie, une personne ou une ressource…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dashboard-search-input"
              />
              <Search size={23} className="dashboard-search-icon" />
            </div>

            {/* Content Container */}
            <div className="dashboard-content">
          {/* Header */}
          <div className="dashboard-header">
            <h1 className="dashboard-title">
              <span className="title-bold">Choisissez</span>{' '}
              <span className="title-light">un type d'activité et commencez à</span>{' '}
              <span className="title-bold">construire votre projet</span>
            </h1>
          </div>

          {/* Categories */}
          <div className="dashboard-categories">
            <button className="category-card">
              <div className="category-icon blue"><ClipboardList size={24} /></div>
              <p className="category-name">Matching</p>
            </button>
            <button className="category-card">
              <div className="category-icon orange"><Dice6 size={24} /></div>
              <p className="category-name">Lancé de dés</p>
            </button>
            <button className="category-card">
              <div className="category-icon green"><Type size={24} /></div>
              <p className="category-name">Jeux de lettre</p>
            </button>
          </div>

          {/* Projects Section */}
          <div className="dashboard-projects-section">
            <div className="projects-header">
              <div className="projects-title-group">
                <h2 className="projects-title">Tous les projets</h2>
                <p className="projects-count">{filteredProjects.length} projets</p>
              </div>
              <input
                type="text"
                placeholder="Rechercher parmi vos projets"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="projects-search-input"
              />
            </div>

            {/* Filters */}
            <div className="projects-filters">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">Catégorie</option>
                <option value="application">Application</option>
                <option value="siteWeb">Site web</option>
                <option value="logo">Logo</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">Statut</option>
                <option value="published">Publiée</option>
                <option value="draft">Brouillon</option>
              </select>

              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="filter-select"
              >
                <option value="date">Date de modification</option>
                <option value="title">Titre</option>
              </select>

              <button className="view-toggle"><Grid3x3 size={24} /></button>
            </div>

            {/* Projects Grid */}
            <div className="projects-grid">
              {filteredProjects.map((project) => (
                <div key={project.id} className="project-card">
                  <div className="project-card-image">
                    {project.coverImage ? (
                      <img src={project.coverImage} alt={project.title} />
                    ) : (
                      <div className="project-card-placeholder"><ImageIcon size={48} /></div>
                    )}
                  </div>
                  <div className="project-card-info">
                    <div className="project-card-header">
                      <span className="project-category-icon">{getCategoryIcon(project.category)}</span>
                      <h3 className="project-card-title">{project.title || 'Sans titre'}</h3>
                    </div>
                    <div className="project-card-meta">
                      <span className="project-status">{project.status === 'published' ? 'Publiée' : 'Brouillon'}</span>
                      <span className="project-separator">•</span>
                      <span className="project-date">Modifié {formatDate(project.lastModified)}</span>
                    </div>
                    <div className="project-card-actions">
                      <button onClick={() => handleEdit(project)} className="action-btn edit">
                        <Edit size={16} /> Modifier
                      </button>
                      <button onClick={() => handleDelete(project.id)} className="action-btn delete">
                        <Trash2 size={16} /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Project Button */}
            <button onClick={handleCreate} className="add-project-btn">
              + Ajouter un projet
            </button>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Edit/Create Modal */}
      {(editingProject || isCreating) && (
        <ProjectEditor
          project={editingProject}
          isCreating={isCreating}
          onSave={handleSave}
          onCancel={() => { setEditingProject(null); setIsCreating(false); }}
        />
      )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
