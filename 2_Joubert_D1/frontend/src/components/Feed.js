// 2_Joubert 05084360
import React, { useState, useEffect, useCallback } from 'react';
import ProjectPreview from './ProjectPreview';
import '../styles/ComponentBase.css';
import '../styles/Feed.css';

const Feed = ({ feedType, user }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/projects/feed?feedType=${feedType}&sortBy=${sortBy}&userId=${user.id}`
      );
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
  }, [feedType, sortBy, user.id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  if (loading) {
    return (
      <div className="feed-board__loading">
        <span>Loading feed data</span>
        <span className="feed-board__cursor">_</span>
      </div>
    );
  }

  const feedDescription =
    feedType === 'local'
      ? 'Showing activity from collaborators in your network.'
      : 'Displaying the latest projects across the platform.';

  return (
    <section className="feed-board">
      <header className="feed-board__header">
        <div className="feed-board__summary">
          <h3 className="feed-board__title">
            &gt; Project Feed
            <span className="feed-board__cursor">_</span>
          </h3>
          <p className="feed-board__subtitle">{feedDescription}</p>
        </div>

        <div className="feed-board__controls">
          <span className="feed-board__count">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </span>
          <label className="feed-board__label" htmlFor="feed-sort">
            Sort by
          </label>
          <select
            id="feed-sort"
            className="feed-board__select"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="date">Recent Activity</option>
            <option value="popularity">Download Count</option>
          </select>
        </div>
      </header>

      <div className="feed-board__grid">
        {projects.length === 0 ? (
          <div className="feed-board__empty">
            <p>No projects found in the {feedType} feed.</p>
            <p>
              {feedType === 'local'
                ? 'Connect with more developers to expand your local activity stream.'
                : 'Check back later for new community releases.'}
            </p>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectPreview
              key={project.id}
              project={project}
              currentUser={user}
              onProjectMutated={fetchProjects}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default Feed;
