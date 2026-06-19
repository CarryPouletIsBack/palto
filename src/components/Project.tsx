import { useState, useEffect, useRef } from 'react';
import SingleProjectNew from './SingleProjectNew';
import { getProjectByTitle, getAllProjects, type ProjectWithMeta } from '../services/projectService';
import { type ProjectData } from '../data/projects';
import './Project.css';

interface ProjectProps {
  onBackClick: () => void;
  projectName?: string;
  coverImage?: string | null;
  projectCategory?: string | null;
  onSwipeYChange?: (y: number) => void;
  onLiftProgressChange?: (progress: number) => void;
  onProjectScrollCombinedChange?: (combinedPx: number) => void;
  coverFullscreenActive?: boolean;
  onOpenClientAccountAuth?: (mode: 'login' | 'signup') => void;
  onOpenClientAccount?: () => void;
  onNavigateHome?: () => void;
  onNavigateChauffeurHome?: () => void;
  onOpenClientLiveMeet?: () => void;
}

function loadProject(projectName: string): ProjectData | null {
  const project = getProjectByTitle(projectName);
  if (project) return project as ProjectData;
  const allProjects = getAllProjects();
  const found = allProjects.find(p => p.id === projectName || p.title === projectName);
  return found ? (found as ProjectData) : null;
}

const Project = ({
  onBackClick,
  projectName = 'Go',
  coverImage = null,
  projectCategory = null,
  onSwipeYChange,
  onLiftProgressChange,
  onProjectScrollCombinedChange,
  coverFullscreenActive = false,
  onOpenClientAccountAuth,
  onOpenClientAccount,
  onNavigateHome,
  onNavigateChauffeurHome,
  onOpenClientLiveMeet,
}: ProjectProps) => {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousProjectNameRef = useRef<string | null>(null);

  useEffect(() => {
    const isSwitch = previousProjectNameRef.current !== null && previousProjectNameRef.current !== projectName;
    previousProjectNameRef.current = projectName;

    if (isSwitch) {
      setIsTransitioning(true);
      setProjectData(null);
      const t = setTimeout(() => {
        const next = loadProject(projectName);
        setProjectData(next);
        setIsTransitioning(false);
      }, 420);
      return () => clearTimeout(t);
    }

    const next = loadProject(projectName);
    setProjectData(next);
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

  if (!projectData || isTransitioning) {
    return (
      <div className="project-loading" aria-live="polite">
        <div className="project-loading-spinner" aria-hidden />
        <span className="project-loading-text">Chargement du projet…</span>
      </div>
    );
  }

  return (
    <SingleProjectNew 
      projectData={projectData} 
      onBackClick={onBackClick}
      coverImage={coverImage}
      projectCategory={projectCategory}
      onSwipeYChange={onSwipeYChange}
      onLiftProgressChange={onLiftProgressChange}
      onProjectScrollCombinedChange={onProjectScrollCombinedChange}
      coverFullscreenActive={coverFullscreenActive}
      onOpenClientAccountAuth={onOpenClientAccountAuth}
      onOpenClientAccount={onOpenClientAccount}
      onNavigateHome={onNavigateHome}
      onNavigateChauffeurHome={onNavigateChauffeurHome}
      onOpenClientLiveMeet={onOpenClientLiveMeet}
    />
  );
};

export default Project;
