import React, { useState } from 'react';
import { ProjectSummary } from '../types';
import { api } from '../api';

interface ProjectManagerProps {
  onProjectLoad: (projectData: any) => void;
  onNewProject: () => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ onProjectLoad, onNewProject }) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await api.listProjects();
      setProjects(response.projects);
      setShowProjects(true);
    } catch (error) {
      console.error('Error loading projects:', error);
      alert('Error loading projects');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProject = async (projectId: string) => {
    setLoading(true);
    try {
      const response = await api.loadProject(projectId);
      onProjectLoad(response);
      setShowProjects(false);
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Error loading project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="project-manager">
      <h3>Project Management</h3>
      <div className="project-buttons">
        <button className="project-btn" onClick={onNewProject}>
          🆕 New Project
        </button>
        <button className="project-btn" onClick={loadProjects} disabled={loading}>
          📂 Load Project
        </button>
      </div>

      {showProjects && (
        <div className="project-list">
          <h4>Saved Projects</h4>
          {projects.length === 0 ? (
            <p>No saved projects found</p>
          ) : (
            <ul>
              {projects.map((project) => (
                <li key={project.project_id} className="project-item">
                  <div className="project-info">
                    <strong>{project.pdf_filename}</strong>
                    <small>
                      Created: {new Date(project.created_at).toLocaleDateString()}
                      <br />
                      Annotations: {project.annotation_count}
                    </small>
                  </div>
                  <button 
                    onClick={() => handleLoadProject(project.project_id)}
                    disabled={loading}
                  >
                    Load
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setShowProjects(false)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default ProjectManager;