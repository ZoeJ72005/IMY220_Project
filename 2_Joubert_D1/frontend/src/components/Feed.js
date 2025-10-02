import React, { useState, useEffect } from 'react';
import ProjectPreview from './ProjectPreview';
import '../styles/Feed.css';

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
      <div className="feed-loading">
        <div className="loading-spinner">
          <span>Loading feed data</span>
          <span className="cursor">_</span>
        </div>
      </div>
    );
  }

  return (
    <div className="feed">
      <div className="feed-header">
        <div className="feed-stats">
          <span className="stat">
            Found {projects.length} projects
          </span>
        </div>
        
        <div className="feed-sort">
          <span className="sort-label">SORT_BY:</span>
          <select 
            className="sort-select terminal-input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">RECENT_ACTIVITY</option>
            <option value="popularity">DOWNLOAD_COUNT</option>
          </select>
        </div>
      </div>
      
      <div className="projects-grid">
        {projects.length === 0 ? (
          <div className="no-projects">
            <p>No projects found in {feedType} feed</p>
            <p className="help-text">
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