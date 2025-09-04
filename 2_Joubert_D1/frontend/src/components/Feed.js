import React, { useState, useEffect } from 'react';
import ProjectPreview from './ProjectPreview';
import './Feed.css';

const Feed = ({ feedType, user }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'popularity'

  // Dummy data for projects
  const dummyProjects = [
    {
      id: 1,
      name: "terminal-ui-framework",
      description: "A retro terminal-style UI framework built with React",
      owner: "code_master",
      tags: ["javascript", "react", "css", "framework"],
      type: "web-application",
      version: "v2.1.0",
      lastActivity: "2 hours ago",
      checkoutStatus: "checked-in",
      members: 3,
      downloads: 127,
      image: "/assets/images/project1.png",
      activity: [
        { user: "code_master", action: "checked-in", message: "Added responsive design", time: "2 hours ago" },
        { user: "terminal_user", action: "checked-out", message: "Working on mobile layout", time: "4 hours ago" }
      ]
    },
    {
      id: 2,
      name: "crypto-hash-validator",
      description: "Terminal-based cryptocurrency hash validation tool",
      owner: "crypto_dev",
      tags: ["python", "cryptography", "blockchain"],
      type: "desktop-application",
      version: "v1.3.2",
      lastActivity: "5 hours ago",
      checkoutStatus: "checked-out",
      checkedOutBy: "security_expert",
      members: 2,
      downloads: 89,
      image: "/assets/images/project2.png",
      activity: [
        { user: "security_expert", action: "checked-out", message: "Implementing new hash algorithms", time: "5 hours ago" },
        { user: "crypto_dev", action: "checked-in", message: "Fixed validation bug", time: "1 day ago" }
      ]
    },
    {
      id: 3,
      name: "retro-game-engine",
      description: "ASCII-based game engine for terminal applications",
      owner: "game_wizard",
      tags: ["c++", "game-engine", "ascii"],
      type: "library",
      version: "v0.8.1",
      lastActivity: "1 day ago",
      checkoutStatus: "checked-in",
      members: 5,
      downloads: 203,
      image: "/assets/images/project3.png",
      activity: [
        { user: "pixel_artist", action: "checked-in", message: "Added new ASCII sprites", time: "1 day ago" },
        { user: "game_wizard", action: "checked-in", message: "Optimized rendering engine", time: "2 days ago" }
      ]
    },
    {
      id: 4,
      name: "data-parser-cli",
      description: "Command-line tool for parsing various data formats",
      owner: "data_ninja",
      tags: ["python", "cli", "data-processing"],
      type: "desktop-application",
      version: "v3.0.0",
      lastActivity: "3 days ago",
      checkoutStatus: "checked-in",
      members: 1,
      downloads: 156,
      image: "/assets/images/project4.png",
      activity: [
        { user: "data_ninja", action: "checked-in", message: "Major version update with JSON support", time: "3 days ago" }
      ]
    }
  ];

  useEffect(() => {
    // Simulate API call
    setLoading(true);
    setTimeout(() => {
      let filteredProjects = [...dummyProjects];
      
      if (feedType === 'local') {
        // Show only projects where user is a member (simulated)
        filteredProjects = dummyProjects.filter(project => 
          project.owner === user.username || Math.random() > 0.5
        );
      }
      
      // Sort projects
      if (sortBy === 'popularity') {
        filteredProjects.sort((a, b) => b.downloads - a.downloads);
      } else {
        // Sort by date (simulated based on lastActivity)
        filteredProjects.sort((a, b) => {
          const timeA = a.lastActivity.includes('hour') ? 1 : 
                       a.lastActivity.includes('day') ? parseInt(a.lastActivity) : 100;
          const timeB = b.lastActivity.includes('hour') ? 1 : 
                       b.lastActivity.includes('day') ? parseInt(b.lastActivity) : 100;
          return timeA - timeB;
        });
      }
      
      setProjects(filteredProjects);
      setLoading(false);
    }, 500);
  }, [feedType, sortBy, user.username]);

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