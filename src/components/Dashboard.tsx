import { useState, useEffect } from 'react';
import { type ProjectWithMeta, getAllProjects, deleteProject, searchProjects } from '../services/projectService';
import { logout } from '../services/authService';
import ProjectEditor from './ProjectEditor';
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

  // Charger les projets au montage
  useEffect(() => {
    loadProjects();
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
    return '📁';
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="dashboard-logo">
          <h2>Dashboard</h2>
        </div>
        
        <nav className="dashboard-nav">
          <button className="dashboard-nav-item active">
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </button>
          <button className="dashboard-nav-item active">
            <span className="nav-icon">📁</span>
            <span className="nav-label">Projets</span>
          </button>
          <button className="dashboard-nav-item">
            <span className="nav-icon">👥</span>
            <span className="nav-label">Groupes</span>
          </button>
          <button className="dashboard-nav-item">
            <span className="nav-icon">📊</span>
            <span className="nav-label">Stats</span>
          </button>
          <button className="dashboard-nav-item">
            <span className="nav-icon">📚</span>
            <span className="nav-label">Librairie</span>
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
            <span>👤</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Search Bar */}
        <div className="dashboard-search">
          <input
            type="text"
            placeholder="Recherchez un projet, une catégorie, une personne ou une ressource…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="dashboard-search-input"
          />
          <span className="dashboard-search-icon">🔍</span>
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
              <div className="category-icon blue">📋</div>
              <p className="category-name">Matching</p>
            </button>
            <button className="category-card">
              <div className="category-icon orange">🎲</div>
              <p className="category-name">Lancé de dés</p>
            </button>
            <button className="category-card">
              <div className="category-icon green">🔤</div>
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

              <button className="view-toggle">📋</button>
            </div>

            {/* Projects Grid */}
            <div className="projects-grid">
              {filteredProjects.map((project) => (
                <div key={project.id} className="project-card">
                  <div className="project-card-image">
                    {project.coverImage ? (
                      <img src={project.coverImage} alt={project.title} />
                    ) : (
                      <div className="project-card-placeholder">📷</div>
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
                      <button onClick={() => handleEdit(project)} className="action-btn edit">✏️ Modifier</button>
                      <button onClick={() => handleDelete(project.id)} className="action-btn delete">🗑️ Supprimer</button>
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
  );
};

export default Dashboard;
