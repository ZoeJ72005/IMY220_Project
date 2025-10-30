import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/ProjectPreview.css';

const ProjectPreview = ({ project, currentUser, onProjectMutated }) => {
  const navigate = useNavigate();

  const handleTagClick = (tag) => {
    if (!tag) return;
    navigate(`/search?term=${encodeURIComponent(tag)}&type=tags`);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.id }),
      });
      const data = await response.json();
      if (data.success) {
        onProjectMutated?.();
      } else {
        console.error('Download failed:', data.message);
      }
    } catch (error) {
      console.error('Network error recording download:', error);
    }
  };

  return (
    <article className="project-preview">
      {project.imageUrl && (
        <Link to={`/project/${project.id}`} className="project-preview__cover">
          <img
            src={project.imageUrl}
            alt={`${project.name} cover`}
            className="project-preview__cover-image"
          />
        </Link>
      )}

      <div className="project-preview__body">
        <header className="project-preview__status-bar">
          <div className={`project-preview__status project-preview__status--${project.checkoutStatus || 'available'}`}>
            <span className="project-preview__prompt">&gt;</span>
            <span className="project-preview__status-text">
              {project.checkoutStatus === 'checked-out'
                ? `Locked by ${project.checkedOutBy?.username || 'unknown'}`
                : 'Available'}
            </span>
          </div>
          <div className="project-preview__version-pill">{project.version}</div>
        </header>

        <div className="project-preview__intro">
          <Link to={`/project/${project.id}`} className="project-preview__link">
            <h3 className="project-preview__title">&gt; {project.name}</h3>
          </Link>
          <p className="project-preview__description">{project.description}</p>
          <div className="project-preview__meta">
            <span className="project-preview__meta-row">
              Owner:{' '}
              <Link to={`/profile/${project.owner?.id}`} className="project-preview__owner">
                {project.owner?.username || 'unknown'}
              </Link>
            </span>
            <span className="project-preview__meta-row">Type: {project.type}</span>
          </div>
        </div>

        {project.tags?.length > 0 && (
          <div className="project-preview__tags">
            {project.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="project-preview__tag"
                onClick={() => handleTagClick(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <dl className="project-preview__stats">
          <div className="project-preview__stat">
            <dt>Members</dt>
            <dd>{project.members}</dd>
          </div>
          <div className="project-preview__stat">
            <dt>Downloads</dt>
            <dd>{project.downloads}</dd>
          </div>
          <div className="project-preview__stat">
            <dt>Last Activity</dt>
            <dd>{project.lastActivity}</dd>
          </div>
        </dl>

        <section className="project-preview__activity">
          <h4 className="project-preview__activity-title">&gt; Recent Activity</h4>
          <div className="project-preview__activity-list">
            {project.activity?.slice(0, 2).map((activity) => (
              <article
                key={activity.id || activity.time}
                className="project-preview__activity-item"
              >
                <span className="project-preview__activity-author">
                  {activity.user?.username || 'unknown'}
                </span>
                <span className="project-preview__activity-action">{activity.action}</span>
                <time className="project-preview__activity-time">{activity.time}</time>
                {activity.message && (
                  <p className="project-preview__activity-message">"{activity.message}"</p>
                )}
              </article>
            ))}
            {(!project.activity || project.activity.length === 0) && (
              <div className="project-preview__activity-empty">No recent activity recorded.</div>
            )}
          </div>
        </section>

        <div className="project-preview__actions">
          <Link to={`/project/${project.id}`} className="project-preview__action">
            View Project
          </Link>
          <button
            type="button"
            onClick={handleDownload}
            className="project-preview__action project-preview__action--accent"
          >
            Download
          </button>
          {project.checkoutStatus === 'checked-in' && (
            <Link
              to={`/project/${project.id}`}
              className="project-preview__action project-preview__action--warning"
            >
              Checkout
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProjectPreview;
