import React, { useState } from 'react';
import Header from '../components/Header';
import Feed from '../components/Feed';
import SearchInput from '../components/SearchInput';
import '../styles/HomePage.css';

const HomePage = ({ user, onLogout }) => {
  const [feedType, setFeedType] = useState('local'); // 'local' or 'global'

  return (
    <div className="home-page">
      <Header user={user} onLogout={onLogout} />
      
      <main className="home-content">
        <div className="content-container">
          <div className="terminal-window">
            <div className="window-header">
              <div className="window-controls">
                <span className="control red"></span>
                <span className="control yellow"></span>
                <span className="control green"></span>
              </div>
              <span className="window-title">PROJECT_FEED.exe</span>
            </div>
            
            <div className="feed-controls">
              <div className="feed-tabs">
                <button 
                  className={`feed-tab ${feedType === 'local' ? 'active' : ''}`}
                  onClick={() => setFeedType('local')}
                >
                  &gt; LOCAL_FEED
                </button>
                <button 
                  className={`feed-tab ${feedType === 'global' ? 'active' : ''}`}
                  onClick={() => setFeedType('global')}
                >
                  &gt; GLOBAL_FEED
                </button>
              </div>
              
              <div className="feed-info">
                <span className="info-text">
                  {feedType === 'local' 
                    ? 'Showing activity from your network' 
                    : 'Showing all system activity'
                  }
                </span>
              </div>
            </div>
            
            <div className="feed-container">
              <Feed feedType={feedType} user={user} />
            </div>
          </div>
          
          <aside className="sidebar">
            <div className="sidebar-section">
              <h3 className="sidebar-title">&gt; QUICK_ACTIONS</h3>
              <div className="quick-actions">
                <button className="action-btn terminal-button">
                  + NEW_PROJECT
                </button>
                <button className="action-btn terminal-button">
                  BROWSE_PROJECTS
                </button>
                <button className="action-btn terminal-button">
                  VIEW_PROFILE
                </button>
              </div>
            </div>
            
            <div className="sidebar-section">
              <h3 className="sidebar-title">&gt; SYSTEM_STATUS</h3>
              <div className="system-status">
                <div className="status-item">
                  <span className="status-label">USERS_ONLINE:</span>
                  <span className="status-value">1,337</span>
                </div>
                <div className="status-item">
                  <span className="status-label">ACTIVE_PROJECTS:</span>
                  <span className="status-value">42</span>
                </div>
                <div className="status-item">
                  <span className="status-label">COMMITS_TODAY:</span>
                  <span className="status-value">256</span>
                </div>
              </div>
            </div>
            
            <div className="sidebar-section">
              <h3 className="sidebar-title">&gt; RECENT_COMMITS</h3>
              <div className="recent-commits">
                <div className="commit-item">
                  <span className="commit-hash">#a1b2c3d</span>
                  <span className="commit-msg">Fixed authentication bug</span>
                </div>
                <div className="commit-item">
                  <span className="commit-hash">#e4f5g6h</span>
                  <span className="commit-msg">Added terminal theme</span>
                </div>
                <div className="commit-item">
                  <span className="commit-hash">#i7j8k9l</span>
                  <span className="commit-msg">Updated README</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default HomePage;