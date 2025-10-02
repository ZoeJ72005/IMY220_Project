import React, { useState, useEffect } from 'react';
import ProjectPreview from './ProjectPreview';


const Feed = ({ feedType, user }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projects/feed?feedType=${feedType}&sortBy=${sortBy}&userId=${user.id}`);
        const data = await response.json();
        if (data.success) {
          setProjects(data.projects);
        } else {
          console.error(data.message);
          setProjects([]);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, [feedType, sortBy, user.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-52">
        <div className="font-fira-code text-sm text-terminal-text text-center">
          <span>Loading feed data</span>
          <span className="cursor animate-blink">_</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 pb-2.5 border-b border-terminal-dim">
        <div className="font-fira-code text-xs text-terminal-accent">
          <span className="stat">
            Found {projects.length} projects
          </span>
        </div>
        
        <div className="flex items-center gap-2.5 font-fira-code text-xs w-full sm:w-auto justify-between sm:justify-start mt-2 sm:mt-0">
          <span className="text-terminal-text">SORT_BY:</span>
          <select 
            className="bg-terminal-input-bg border border-terminal-text text-terminal-text font-fira-code text-[11px] p-1.5 focus:outline-none focus:shadow-[0_0_5px_var(--terminal-text)]"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">RECENT_ACTIVITY</option>
            <option value="popularity">DOWNLOAD_COUNT</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {projects.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 text-center p-10 border-2 border-dashed border-terminal-dim rounded-xl bg-terminal-bg/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.3),_0_0_15px_rgba(0,255,0,0.1)]">
            <p className="font-fira-code text-terminal-text mb-2.5">No projects found in {feedType} feed</p>
            <p className="text-xs text-terminal-dim">
              {feedType === 'local' 
                ? 'Connect with other users to see their projects' 
                : 'Check back later for new projects'
              }
            </p>
          </div>
        ) : (
          projects.map(project => (
            <ProjectPreview 
              key={project.id} 
              project={project} 
              currentUser={user}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Feed;
