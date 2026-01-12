import { useState, useEffect } from 'react';
import SingleProjectNew from './SingleProjectNew';
import { getProjectByTitle, getAllProjects, type ProjectWithMeta } from '../services/projectService';
import { type ProjectData } from '../data/projectsNew';

interface ProjectProps {
  onBackClick: () => void;
  projectName?: string;
  coverImage?: string | null;
  projectCategory?: string | null;
  onSwipeYChange?: (y: number) => void;
}

const Project = ({ onBackClick, projectName = 'Playdago', coverImage = null, projectCategory = null, onSwipeYChange }: ProjectProps) => {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);

  useEffect(() => {
    // Charger le projet depuis localStorage
    const project = getProjectByTitle(projectName);
    if (project) {
      // Convertir ProjectWithMeta en ProjectData
      setProjectData(project as ProjectData);
    } else {
      // Fallback : chercher par ID si le titre ne correspond pas
      const allProjects = getAllProjects();
      const foundProject = allProjects.find(p => p.id === projectName || p.title === projectName);
      if (foundProject) {
        setProjectData(foundProject as ProjectData);
      }
    }
  }, [projectName]);

  // Écouter les changements de localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const project = getProjectByTitle(projectName);
      if (project) {
        setProjectData(project as ProjectData);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectsUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectsUpdated', handleStorageChange);
    };
  }, [projectName]);

  if (!projectData) {
    return <div>Chargement...</div>;
  }
  
  return (
    <SingleProjectNew 
      projectData={projectData} 
      onBackClick={onBackClick}
      coverImage={coverImage}
      projectCategory={projectCategory}
      onSwipeYChange={onSwipeYChange}
    />
  );
};

export default Project;
