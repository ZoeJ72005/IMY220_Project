import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/ComponentBase.css';
import '../styles/ProjectList.css';

const ProjectList = ({ projects, isOwnProfile }) => {
  const title = isOwnProfile ? 'My Projects' : 'User Projects';

  return (
    <section className="project-list" aria-live="polite">
      <header className="project-list__header">
        <h3 className="project-list__title">
          &gt; {title}
          <span className="project-list__cursor">_</span>
        </h3>
        <span className="project-list__count">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'}
        </span>
      </header>

      {projects.length === 0 ? (
        <div className="project-list__empty">
          <p>No projects found.</p>
          {isOwnProfile && (
            <p>Create your first project to start sharing your work with the community.</p>
          )}
        </div>
      ) : (
        <div className="project-list__grid">
          {projects.map((project) => (
            <article key={project.id} className="project-list__card">
              <header className="project-list__card-header">
                <Link to={`/project/${project.id}`} className="project-list__card-link">
                  &gt; {project.name}
                </Link>
                {project.role && (
                  <span className="project-list__badge">{project.role.toUpperCase()}</span>
                )}
              </header>
              <p className="project-list__description">{project.description}</p>
              <footer className="project-list__meta">
                <span className="project-list__meta-label">Last activity</span>
                <span className="project-list__meta-value">{project.lastActivity}</span>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProjectList;
