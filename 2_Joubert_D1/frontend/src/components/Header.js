import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Header.css';

const Header = ({ user, onLogout }) => {
  const location = useLocation();

  const isActivePath = (path) => {
    if (path === '/home') {
      return location.pathname === '/home';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="terminal-header-nav">
      <nav className="nav-container">
        <div className="nav-brand">
          <Link to="/home" className="brand-link">
            <span className="brand-icon">&gt;_</span>
            <span className="brand-text">C:CodeRepo</span>
          </Link>
        </div>
        
        <div className="nav-menu">
          <Link 
            to="/home" 
            className={`nav-link ${isActivePath('/home') ? 'active' : ''}`}
          >
            &gt; HOME
          </Link>
          
          <Link 
            to={`/profile/${user.id}`} 
            className={`nav-link ${isActivePath('/profile') ? 'active' : ''}`}
          >
            &gt; PROFILE
          </Link>
          
          <div className="nav-search">
            <input 
              type="text" 
              className="search-input terminal-input" 
              placeholder="search_projects..."
            />
            <button className="search-btn terminal-button">FIND</button>
          </div>
          
          <div className="nav-user">
            <span className="user-info">
              USER: {user.username}
            </span>
            <button 
              onClick={onLogout}
              className="logout-btn terminal-button"
            >
              &gt; LOGOUT
            </button>
          </div>
        </div>
      </nav>
      
      <div className="terminal-line">
        <span className="line-text">
          {location.pathname === '/home' && '> ~/projects/feed'}
          {location.pathname.startsWith('/profile') && `> ~/users/${user.username}`}
          {location.pathname.startsWith('/project') && '> ~/projects/view'}
        </span>
        <span className="cursor">_</span>
      </div>
    </header>
  );
};

export default Header;