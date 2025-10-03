import React from 'react';
import { Link } from 'react-router-dom';

const ProjectComponent = ({ project, isOwner, isMember, currentUser, onEdit, onCheckout, onCheckin, onDelete }) => {
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
    <div className="flex flex-col gap-4 font-fira-code">
      {/* --- Project Header --- */}
      <div className="pb-3.5 border-b border-terminal-dim">
        <h2 className="text-lg text-terminal-text mb-1.5">
          &gt; {project.name}<span className="cursor animate-blink">_</span>
        </h2>
        <div className="flex items-center gap-1.5 font-fira-code text-[10px] font-bold" style={{ color: getStatusColor(project.checkoutStatus) }}>
          <span className="text-xs animate-pulse">●</span>
          <span>
            {project.checkoutStatus === 'checked-out' 
              ? `LOCKED_BY: ${project.checkedOutBy || 'unknown'}`
              : 'AVAILABLE'
            }
          </span>
        </div>
      </div>

      {/* --- Details Block --- */}
      <div className="p-3 border border-terminal-dim rounded bg-terminal-input-bg/50 flex flex-col gap-2">
        <h3 className="text-sm text-terminal-accent mb-1">&gt; DETAILS</h3>
        <div className="flex flex-col"><span className="text-[10px] text-terminal-dim">OWNER:</span> 
          <Link to={`/profile/${project.owner}`} className="text-xs text-terminal-accent hover:underline">
            {project.owner}
          </Link>
        </div>
        <div className="flex flex-col"><span className="text-[10px] text-terminal-dim">TYPE:</span> <span className="text-xs text-terminal-text">{project.type}</span></div>
        <div className="flex flex-col"><span className="text-[10px] text-terminal-dim">VERSION:</span> <span className="text-xs text-terminal-text">{project.version}</span></div>
        <div className="flex flex-col"><span className="text-[10px] text-terminal-dim">CREATED:</span> <span className="text-xs text-terminal-text">{new Date(project.createdDate).toLocaleDateString()}</span></div>
      </div>

      {/* --- Tags Block --- */}
      {project.tags?.length > 0 && (
        <div className="p-3 border border-terminal-dim rounded bg-terminal-input-bg/50">
          <h3 className="text-sm text-terminal-accent mb-2.5">&gt; TAGS</h3>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag, index) => (
              <span key={index} className="bg-[rgba(0,255,0,0.1)] border border-terminal-dim text-terminal-text px-2 py-1 rounded text-[10px]">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* --- Members Block --- */}
      <div className="p-3 border border-terminal-dim rounded bg-terminal-input-bg/50">
        <h3 className="text-sm text-terminal-accent mb-2.5">&gt; MEMBERS ({project.members.length})</h3>
        <div className="flex flex-wrap gap-2">
          {project.members.map((member, index) => (
            <Link key={index} to={`/profile/${member}`} className="text-xs text-terminal-accent hover:underline">
              {member}
            </Link>
          ))}
        </div>
      </div>

      {/* --- Actions Block --- */}
      <div className="p-3 border border-terminal-dim rounded bg-terminal-input-bg/50 flex flex-col space-y-2">
        <h3 className="text-sm text-terminal-accent mb-1">&gt; ACTIONS</h3>
        <button className="terminal-button text-xs px-2 py-2 w-full text-center bg-transparent text-[var(--terminal-text)] border-[var(--terminal-text)] hover:bg-[rgba(0,255,0,0.1)]">
          DOWNLOAD
        </button>
        
        {isMember && project.checkoutStatus === 'checked-in' && (
          <button onClick={onCheckout} className="terminal-button text-xs px-2 py-2 w-full text-center bg-transparent text-[var(--terminal-warning)] border-[var(--terminal-warning)] hover:bg-[rgba(255,189,46,0.1)]">
            CHECKOUT
          </button>
        )}
        
        {isMember && project.checkoutStatus === 'checked-out' && project.checkedOutBy === currentUser.username && (
          <button onClick={onCheckin} className="terminal-button text-xs px-2 py-2 w-full text-center bg-transparent text-[var(--terminal-accent)] border-[var(--terminal-accent)] hover:bg-[rgba(0,255,0,0.1)]">
            CHECKIN
          </button>
        )}

        {isOwner && (
          <div className="pt-2 mt-2 border-t border-terminal-dim">
            <button onClick={onEdit} className="terminal-button text-xs px-2 py-2 w-full text-center bg-transparent text-[var(--terminal-accent)] border-[var(--terminal-accent)] hover:bg-[rgba(0,255,0,0.1)] mb-2">
              EDIT_PROJECT
            </button>
            <button onClick={onDelete} className="terminal-button text-xs px-2 py-2 w-full text-center bg-transparent text-[var(--terminal-error)] border-[var(--terminal-error)] hover:bg-[rgba(255,0,0,0.1)]">
              DELETE_PROJECT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectComponent;