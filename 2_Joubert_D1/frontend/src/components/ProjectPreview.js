import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/ProjectPreview.css';

const ProjectPreview = ({ project, currentUser }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'checked-out':
        return 'var(--terminal-warning)';
      case 'checked-in':
        return 'var(--terminal-accent)';
      default:
        return 'var(--terminal-text)';
    }
  };

  const handleTagClick = (tag) => {
    // This would trigger a search for the tag
    console.log(`Searching for tag: ${tag}`);
  };

  return (
    <div className="project-preview">
      <div className="project-header">
        <div className="project-status" style={{ color: getStatusColor(project.checkoutStatus) }}>
          <span className="status-indicator">●</span>
          <span className="status-text">
            {project.checkoutStatus === 'checked-out' 
              ? `LOCKED_BY: ${project.checkedOutBy || 'unknown'}`
              : 'AVAILABLE'
            }
          </span>
        </div>
        <div className="project-version">{project.version}</div>
      </div>

      <div className="project-info">
        <Link to={`/project/${project.id}`} className="project-name-link">
          <h3 className="project-name">&gt; {project.name}</h3>
        </Link>
        
        <p className="project-description">{project.description}</p>
        
        <div className="project-meta">
          <span className="project-owner">
            OWNER: <Link to={`/profile/${project.owner}`} className="owner-link">{project.owner}</Link>
          </span>
          <span className="project-type">TYPE: {project.type}</span>
        </div>
      </div>

      <div className="project-tags">
        {project.tags.map((tag, index) => (
          <button 
            key={index} 
            className="tag-button"
            onClick={() => handleTagClick(tag)}
          >
            #{tag}
          </button>
        ))}
      </div>

      <div className="project-stats">
        <div className="stat-item">
          <span className="stat-label">MEMBERS:</span>
          <span className="stat-value">{project.members}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">DOWNLOADS:</span>
          <span className="stat-value">{project.downloads}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">LAST_ACTIVITY:</span>
          <span className="stat-value">{project.lastActivity}</span>
        </div>
      </div>

      <div className="project-activity">
        <h4 className="activity-title">&gt; RECENT_ACTIVITY</h4>
        <div className="activity-list">
          {project.activity.slice(0, 2).map((activity, index) => (
            <div key={index} className="activity-item">
              <span className="activity-user">{activity.user}</span>
              <span className="activity-action">{activity.action}</span>
              <span className="activity-time">{activity.time}</span>
              {activity.message && (
                <div className="activity-message">"{activity.message}"</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="project-actions">
        <Link to={`/project/${project.id}`} className="action-btn view-btn terminal-button">
          VIEW_PROJECT
        </Link>
        <button className="action-btn download-btn terminal-button">
          DOWNLOAD
        </button>
        {project.checkoutStatus === 'checked-in' && (
          <button className="action-btn checkout-btn terminal-button">
            CHECKOUT
          </button>
        )}
      </div>
    </div>
  );
};

export default ProjectPreview;