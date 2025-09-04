import React from 'react';
import { Link } from 'react-router-dom';

const ProjectList = ({ projects, isOwnProfile }) => {
  return (
    <div className="project-list">
      <h3 className="list-title">
        &gt; {isOwnProfile ? 'MY_PROJECTS' : 'USER_PROJECTS'}
        <span className="cursor">_</span>
      </h3>
      
      {projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects found</p>
          {isOwnProfile && (
            <p className="help-text">Create your first project to get started!</p>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <div key={project.id} className="project-card">
              <div className="project-header">
                <Link to={`/project/${project.id}`} className="project-name">
                  &gt; {project.name}
                </Link>
                <span className="project-role">{project.role}</span>
              </div>
              <p className="project-description">{project.description}</p>
              <div className="project-meta">
                <span className="last-activity">Last activity: {project.lastActivity}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;