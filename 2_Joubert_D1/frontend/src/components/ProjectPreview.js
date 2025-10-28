import React from 'react';
import { Link } from 'react-router-dom';

const ProjectPreview = ({ project, currentUser, onProjectMutated }) => {
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
    console.log(`Searching for tag: ${tag}`);
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

  const activityButtonStyle = (colorVar) => `
    terminal-button text-[10px] py-1 px-2 text-center bg-transparent 
    text-[${colorVar}] border-[${colorVar}] hover:bg-[rgba(0,255,0,0.1)]
  `;

  return (
    <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5 transition-all duration-300 ease-in-out shadow-[0_0_10px_rgba(0,255,0,0.1)] hover:border-terminal-accent hover:shadow-[0_0_20px_rgba(0,255,0,0.2)] hover:transform hover:-translate-y-0.5">
      <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-terminal-dim">
        <div className="flex items-center gap-1.5 font-fira-code text-[10px] font-bold" style={{ color: getStatusColor(project.checkoutStatus) }}>
          <span className="text-xs animate-pulse">&gt;</span>
          <span className="status-text">
            {project.checkoutStatus === 'checked-out'
              ? `LOCKED_BY: ${project.checkedOutBy?.username || 'unknown'}`
              : 'AVAILABLE'
            }
          </span>
        </div>
        <div className="font-fira-code text-[10px] text-terminal-dim py-0.5 px-1.5 border border-terminal-dim rounded">
          {project.version}
        </div>
      </div>

      <div className="mb-4">
        <Link to={`/project/${project.id}`} className="no-underline">
          <h3 className="font-fira-code text-base text-terminal-text mb-2 transition-colors duration-300 ease-in-out hover:text-terminal-accent hover:text-shadow-[0_0_10px_var(--terminal-accent)]">&gt; {project.name}</h3>
        </Link>

        <p className="font-fira-code text-xs text-terminal-text leading-relaxed mb-2.5">{project.description}</p>

        <div className="flex flex-col gap-1 font-fira-code text-[10px] text-terminal-dim">
          <span className="project-owner">
            OWNER:{' '}
            <Link to={`/profile/${project.owner?.id}`} className="text-terminal-accent no-underline hover:text-shadow-[0_0_5px_var(--terminal-accent)]">
              {project.owner?.username || 'unknown'}
            </Link>
          </span>
          <span className="project-type">TYPE: {project.type}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {project.tags?.map((tag, index) => (
          <button
            key={`${tag}-${index}`}
            className="bg-transparent border border-terminal-dim text-terminal-dim font-fira-code text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-all duration-300 ease-in-out hover:border-terminal-accent hover:text-terminal-accent hover:shadow-[0_0_5px_var(--terminal-accent)]"
            onClick={() => handleTagClick(tag)}
          >
            #{tag}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-4 p-2.5 bg-[rgba(0,17,0,0.3)] border border-terminal-dim rounded">
        <div className="flex flex-col items-center text-center">
          <span className="font-fira-code text-[8px] text-terminal-dim mb-0.5">MEMBERS:</span>
          <span className="font-fira-code text-xs text-terminal-text font-bold">{project.members}</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="font-fira-code text-[8px] text-terminal-dim mb-0.5">DOWNLOADS:</span>
          <span className="font-fira-code text-xs text-terminal-text font-bold">{project.downloads}</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="font-fira-code text-[8px] text-terminal-dim mb-0.5">LAST_ACTIVITY:</span>
          <span className="font-fira-code text-xs text-terminal-text font-bold">{project.lastActivity}</span>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-fira-code text-[11px] text-terminal-accent mb-2 border-b border-terminal-dim pb-1">&gt; RECENT_ACTIVITY</h4>
        <div className="flex flex-col gap-1.5">
          {project.activity?.slice(0, 2).map((activity) => (
            <div key={activity.id || activity.time} className="flex flex-col gap-0.5 p-1.5 bg-[rgba(0,17,0,0.2)] border border-terminal-dim rounded font-fira-code text-[9px]">
              <span className="text-terminal-accent font-bold">{activity.user?.username || 'unknown'}</span>
              <span className="text-terminal-text">{activity.action}</span>
              <span className="text-terminal-dim text-[8px]">{activity.time}</span>
              {activity.message && (
                <div className="text-terminal-text italic mt-0.5">"{activity.message}"</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link to={`/project/${project.id}`} className={`${activityButtonStyle('var(--terminal-text)')} flex-1 min-w-[100px]`}>
          VIEW_PROJECT
        </Link>
        <button onClick={handleDownload} className={`${activityButtonStyle('var(--terminal-accent)')} flex-1 min-w-[100px]`}>
          DOWNLOAD
        </button>
        {project.checkoutStatus === 'checked-in' && (
          <Link
            to={`/project/${project.id}`}
            className={`${activityButtonStyle('var(--terminal-warning)')} flex-1 min-w-[100px] border-terminal-warning text-terminal-warning text-center`}
          >
            CHECKOUT
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProjectPreview;
