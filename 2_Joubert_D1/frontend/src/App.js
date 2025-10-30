import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SplashPage from './pages/SplashPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ProjectPage from './pages/ProjectPage';
import SearchResultsPage from './pages/SearchResultsPage';
import AdminDashboard from './pages/AdminDashboard';

const THEME_STORAGE_KEY = 'terminal_theme';
const USER_STORAGE_KEY = 'terminal_user';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'dark');

  const enrichUser = (userData = {}) => ({
    ...userData,
    friends: userData?.friends || [],
    pendingFriendRequests: userData?.pendingFriendRequests || [],
    outgoingFriendRequests: userData?.outgoingFriendRequests || [],
    role: userData?.role || 'user',
  });

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(enrichUser(parsedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const persistUser = (userData) => {
    const enriched = enrichUser(userData);
    setUser(enriched);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(enriched));
  };

  const handleLogin = (userData) => {
    persistUser(userData);
  };

  const handleUserUpdate = (updatedUser) => {
    persistUser(updatedUser);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="loading-text">
          Initializing terminal...<span className="cursor">_</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`app app--${theme}`}>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/home" replace /> : <SplashPage onLogin={handleLogin} />}
        />
        <Route
          path="/home"
          element={
            user ? (
              <HomePage
                user={user}
                onLogout={handleLogout}
                onUserUpdate={handleUserUpdate}
                theme={theme}
                onToggleTheme={handleThemeToggle}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/profile/:userId"
          element={
            user ? (
              <ProfilePage
                user={user}
                onLogout={handleLogout}
                onUserUpdate={handleUserUpdate}
                theme={theme}
                onToggleTheme={handleThemeToggle}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/project/:projectId"
          element={
            user ? (
              <ProjectPage
                user={user}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={handleThemeToggle}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/search"
          element={
            user ? (
              <SearchResultsPage
                user={user}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={handleThemeToggle}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user ? (
              user.role === 'admin' ? (
                <AdminDashboard
                  user={user}
                  onLogout={handleLogout}
                  onUserUpdate={handleUserUpdate}
                  theme={theme}
                  onToggleTheme={handleThemeToggle}
                />
              ) : (
                <Navigate to="/home" replace />
              )
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </div>
  );
}

export default App;
