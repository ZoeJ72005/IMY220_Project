import React from 'react';
import { Link } from 'react-router-dom';

const ProjectList = ({ projects, isOwnProfile }) => {
  return (
    <div className="font-fira-code">
      <h3 className="text-base font-bold text-terminal-accent mb-4 border-b border-terminal-dim pb-2">
        &gt; {isOwnProfile ? 'MY_PROJECTS' : 'USER_PROJECTS'}
        <span className="cursor animate-blink">_</span>
      </h3>
      
      {projects.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed border-terminal-dim rounded-lg text-terminal-text">
          <p>No projects found</p>
          {isOwnProfile && (
            <p className="text-xs text-terminal-dim mt-2">Create your first project to get started!</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(project => (
            <div key={project.id} className="p-4 border border-terminal-border rounded-lg bg-terminal-bg shadow-[0_0_5px_rgba(0,255,0,0.1)] transition-all duration-300 hover:border-terminal-accent">
              <div className="flex justify-between items-start mb-2 border-b border-terminal-dim/50 pb-1">
                <Link to={`/project/${project.id}`} className="text-base text-terminal-text font-bold no-underline hover:text-terminal-accent">
                  &gt; {project.name}
                </Link>
                {project.role && <span className="text-[10px] text-terminal-dim uppercase">{project.role}</span>}
              </div>
              <p className="text-xs text-terminal-text mb-3">{project.description}</p>
              <div className="text-[10px] text-terminal-dim">
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
