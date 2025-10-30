import React from 'react';

import { Link, useLocation } from 'react-router-dom';
import '../styles/Header.css';
import SearchInput from './SearchInput';

const Header = ({ user, onLogout, theme = 'dark', onToggleTheme }) => {
  const location = useLocation();
  const pendingRequests = user?.pendingFriendRequests?.length || 0;

  const isActivePath = (path) => {
    if (path === '/home') {
      return location.pathname === '/home';
    }
    return location.pathname.startsWith(path);
  };

  const themeLabel = theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE';
  const handleThemeToggle = () => {
    if (typeof onToggleTheme === 'function') {
      onToggleTheme();
    }
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

          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`nav-link ${isActivePath('/admin') ? 'active' : ''}`}
            >
              &gt; ADMIN
            </Link>
          )}
        </div>
        
        <div className="nav-search">
          <SearchInput />
        </div>
        
        <div className="nav-theme">
          <button
            type="button"
            className="theme-toggle"
            onClick={handleThemeToggle}
            aria-label="Toggle light and dark mode"
          >
            <span className="theme-toggle__icon">{theme === 'dark' ? '[moon]' : '[sun]'}</span>
            <span className="theme-toggle__label">{themeLabel}</span>
          </button>
        </div>

        <div className="nav-user">
          <span className="user-info">
            USER: <span>{user.username}</span>
          </span>
          {pendingRequests > 0 && (
            <span className="user-alert">
              REQUESTS: {pendingRequests}
            </span>
          )}
          <button 
            onClick={onLogout}
            className="logout-btn terminal-button"
          >
            &gt; LOGOUT
          </button>
        </div>
      </nav>
      
      <div className="terminal-line">
        <span className="line-text">
          {location.pathname === '/home' && '> ~/projects/feed'}
          {location.pathname.startsWith('/profile') && `> ~/users/${user.username}`}
          {location.pathname.startsWith('/project') && '> ~/projects/view'}
          {location.pathname.startsWith('/admin') && '> ~/system/admin'}
        </span>
        <span className="cursor">_</span>
      </div>
    </header>
  );
};

export default Header;


