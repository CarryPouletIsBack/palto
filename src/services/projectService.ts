import { type ProjectData } from '../data/projectsNew';
import { projectsDataNew } from '../data/projectsNew';

const STORAGE_KEY = 'portfolio_projects';

export interface ProjectWithMeta extends ProjectData {
  id: string;
  coverImage?: string;
  category?: string;
  status?: 'published' | 'draft';
  lastModified?: string;
  createdAt?: string;
}

// Export de type explicite pour compatibilité
export type { ProjectWithMeta };

// Charger les projets depuis localStorage ou utiliser les données par défaut
export const loadProjects = (): { [key: string]: ProjectWithMeta } => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Fusionner avec les données par défaut pour les nouveaux projets
      return { ...projectsDataNew, ...parsed };
    }
  } catch (error) {
    console.error('Erreur lors du chargement des projets:', error);
  }
  
  // Convertir les données par défaut en format avec métadonnées
  const projectsWithMeta: { [key: string]: ProjectWithMeta } = {};
  Object.keys(projectsDataNew).forEach(key => {
    projectsWithMeta[key] = {
      ...projectsDataNew[key],
      id: key,
      coverImage: `/images/${key.toLowerCase()}-cover.png`,
      category: 'application',
      status: 'published',
      lastModified: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  });
  
  // Sauvegarder les projets par défaut
  saveProjects(projectsWithMeta);
  
  return projectsWithMeta;
};

// Sauvegarder les projets dans localStorage
export const saveProjects = (projects: { [key: string]: ProjectWithMeta }) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des projets:', error);
  }
};

// Obtenir tous les projets
export const getAllProjects = (): ProjectWithMeta[] => {
  const projects = loadProjects();
  return Object.values(projects);
};

// Obtenir un projet par ID
export const getProjectById = (id: string): ProjectWithMeta | null => {
  const projects = loadProjects();
  return projects[id] || null;
};

// Créer un nouveau projet
export const createProject = (project: ProjectWithMeta): ProjectWithMeta => {
  const projects = loadProjects();
  const newProject: ProjectWithMeta = {
    ...project,
    id: project.id || `project-${Date.now()}`,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    status: project.status || 'draft',
  };
  
  projects[newProject.id] = newProject;
  saveProjects(projects);
  return newProject;
};

// Mettre à jour un projet
export const updateProject = (id: string, updates: Partial<ProjectWithMeta>): ProjectWithMeta | null => {
  const projects = loadProjects();
  if (!projects[id]) {
    return null;
  }
  
  projects[id] = {
    ...projects[id],
    ...updates,
    id, // S'assurer que l'ID ne change pas
    lastModified: new Date().toISOString(),
  };
  
  saveProjects(projects);
  return projects[id];
};

// Supprimer un projet
export const deleteProject = (id: string): boolean => {
  const projects = loadProjects();
  if (!projects[id]) {
    return false;
  }
  
  delete projects[id];
  saveProjects(projects);
  return true;
};

// Obtenir les projets par catégorie
export const getProjectsByCategory = (category: string): ProjectWithMeta[] => {
  return getAllProjects().filter(project => project.category === category);
};

// Rechercher des projets
export const searchProjects = (query: string): ProjectWithMeta[] => {
  const lowerQuery = query.toLowerCase();
  return getAllProjects().filter(project => 
    project.title.toLowerCase().includes(lowerQuery) ||
    project.subtitle?.toLowerCase().includes(lowerQuery) ||
    project.summary.toLowerCase().includes(lowerQuery)
  );
};
