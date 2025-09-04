import React from 'react';
import { Link } from 'react-router-dom';

const ProjectComponent = ({ project, isOwner, isMember, currentUser, onEdit }) => {
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

  return (
    <div className="project-component">
      <div className="project-header">
        <h2 className="project-name">
          &gt; {project.name}
          <span className="cursor">_</span>
        </h2>
        <div className="project-status" style={{ color: getStatusColor(project.checkoutStatus) }}>
          <span className="status-indicator">●</span>
          <span className="status-text">
            {project.checkoutStatus === 'checked-out' 
              ? `LOCKED_BY: ${project.checkedOutBy || 'unknown'}`
              : 'AVAILABLE'
            }
          </span>
        </div>
      </div>

      <div className="project-meta">
        <div className="meta-item">
          <span className="meta-label">OWNER:</span>
          <Link to={`/profile/${project.owner}`} className="meta-link">
            {project.owner}
          </Link>
        </div>
        <div className="meta-item">
          <span className="meta-label">TYPE:</span>
          <span className="meta-value">{project.type}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">VERSION:</span>
          <span className="meta-value">{project.version}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">CREATED:</span>
          <span className="meta-value">{new Date(project.createdDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="project-tags">
        <h4 className="tags-title">&gt; TAGS</h4>
        <div className="tag-list">
          {project.tags.map((tag, index) => (
            <span key={index} className="tag">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="project-members">
        <h4 className="members-title">&gt; MEMBERS ({project.members.length})</h4>
        <div className="member-list">
          {project.members.map((member, index) => (
            <Link key={index} to={`/profile/${member}`} className="member-link">
              {member}
            </Link>
          ))}
        </div>
      </div>

      <div className="project-actions">
        {isOwner && (
          <button onClick={onEdit} className="action-btn edit-btn terminal-button">
            EDIT_PROJECT
          </button>
        )}
        
        <button className="action-btn download-btn terminal-button">
          DOWNLOAD
        </button>
        
        {isMember && project.checkoutStatus === 'checked-in' && (
          <button className="action-btn checkout-btn terminal-button">
            CHECKOUT
          </button>
        )}
        
        {isMember && project.checkoutStatus === 'checked-out' && project.checkedOutBy === currentUser.username && (
          <button className="action-btn checkin-btn terminal-button">
            CHECKIN
          </button>
        )}
      </div>
    </div>
  );
};

export default ProjectComponent;