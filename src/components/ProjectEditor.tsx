import { useState, useEffect } from 'react';
import { type ProjectWithMeta, updateProject, createProject } from '../services/projectService';
import './ProjectEditor.css';

interface ProjectEditorProps {
  project: ProjectWithMeta | null;
  isCreating: boolean;
  onSave: (project: ProjectWithMeta) => void;
  onCancel: () => void;
}

const ProjectEditor = ({ project, isCreating, onSave, onCancel }: ProjectEditorProps) => {
  const [formData, setFormData] = useState<Partial<ProjectWithMeta>>({
    title: '',
    subtitle: '',
    badges: [],
    summary: '',
    coverImage: '',
    category: 'application',
    status: 'draft',
  });

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        subtitle: project.subtitle || '',
        badges: project.badges || [],
        summary: project.summary || '',
        coverImage: project.coverImage || '',
        category: project.category || 'application',
        status: project.status || 'draft',
        context: project.context || { title: '', content: '' },
        approach: project.approach || { title: '', sections: [] },
        designSystem: project.designSystem || {
          colorPalette: {
            title: '',
            description: '',
            categories: {
              neutrals: { title: '', colors: [] },
              primary: { title: '', colors: [] },
              secondary: { title: '', colors: [] },
              accent: { title: '', colors: [] },
              error: { title: '', colors: [] },
            },
          },
          typography: { title: '', description: '', items: [] },
        },
      });
    }
  }, [project]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBadgeChange = (index: number, value: string) => {
    const badges = [...(formData.badges || [])];
    badges[index] = value;
    handleChange('badges', badges);
  };

  const addBadge = () => {
    handleChange('badges', [...(formData.badges || []), '']);
  };

  const removeBadge = (index: number) => {
    const badges = [...(formData.badges || [])];
    badges.splice(index, 1);
    handleChange('badges', badges);
  };

  const handleContextChange = (field: 'title' | 'content', value: string) => {
    handleChange('context', {
      ...(formData.context || { title: '', content: '' }),
      [field]: value,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Pour l'instant, on stocke juste le nom du fichier
      // Dans une vraie app, on uploaderait l'image vers un serveur
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('coverImage', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      alert('Le titre est requis');
      return;
    }

    const projectData: ProjectWithMeta = {
      ...(project || {} as ProjectWithMeta),
      ...formData,
      id: project?.id || `project-${Date.now()}`,
    } as ProjectWithMeta;

    if (isCreating) {
      const newProject = createProject(projectData);
      onSave(newProject);
    } else if (project) {
      const updatedProject = updateProject(project.id, formData);
      if (updatedProject) {
        onSave(updatedProject);
      }
    }
  };

  return (
    <div className="project-editor-modal-overlay" onClick={onCancel}>
      <div className="project-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="project-editor-header">
          <h2>{isCreating ? 'Créer un projet' : 'Modifier le projet'}</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="project-editor-form">
          {/* Informations de base */}
          <div className="editor-section">
            <h3>Informations de base</h3>
            
            <div className="form-group">
              <label>Titre *</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                placeholder="Titre du projet"
              />
            </div>

            <div className="form-group">
              <label>Sous-titre</label>
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                placeholder="Sous-titre du projet"
              />
            </div>

            <div className="form-group">
              <label>Image de couverture</label>
              <div className="image-upload">
                {formData.coverImage && (
                  <img src={formData.coverImage} alt="Preview" className="image-preview" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-input"
                />
                <button type="button" onClick={() => document.querySelector('.file-input')?.click()}>
                  {formData.coverImage ? 'Changer l\'image' : 'Choisir une image'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Catégorie</label>
              <select
                value={formData.category || 'application'}
                onChange={(e) => handleChange('category', e.target.value)}
              >
                <option value="application">Application</option>
                <option value="siteWeb">Site web</option>
                <option value="logo">Logo</option>
              </select>
            </div>

            <div className="form-group">
              <label>Statut</label>
              <select
                value={formData.status || 'draft'}
                onChange={(e) => handleChange('status', e.target.value as 'published' | 'draft')}
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publiée</option>
              </select>
            </div>

            <div className="form-group">
              <label>Badges</label>
              {(formData.badges || []).map((badge, index) => (
                <div key={index} className="badge-input-group">
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => handleBadgeChange(index, e.target.value)}
                    placeholder="Badge"
                  />
                  <button type="button" onClick={() => removeBadge(index)}>×</button>
                </div>
              ))}
              <button type="button" onClick={addBadge} className="add-badge-btn">
                + Ajouter un badge
              </button>
            </div>
          </div>

          {/* Résumé */}
          <div className="editor-section">
            <h3>Résumé</h3>
            <div className="form-group">
              <label>Résumé / Introduction</label>
              <textarea
                value={formData.summary || ''}
                onChange={(e) => handleChange('summary', e.target.value)}
                rows={5}
                placeholder="Résumé du projet"
              />
            </div>
          </div>

          {/* Contexte */}
          <div className="editor-section">
            <h3>Contexte & Problématique</h3>
            <div className="form-group">
              <label>Titre de la section</label>
              <input
                type="text"
                value={formData.context?.title || ''}
                onChange={(e) => handleContextChange('title', e.target.value)}
                placeholder="Titre"
              />
            </div>
            <div className="form-group">
              <label>Contenu</label>
              <textarea
                value={formData.context?.content || ''}
                onChange={(e) => handleContextChange('content', e.target.value)}
                rows={5}
                placeholder="Contenu de la section"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="editor-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              Annuler
            </button>
            <button type="submit" className="save-btn">
              {isCreating ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectEditor;
