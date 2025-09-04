import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SplashPage from './pages/SplashPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ProjectPage from './pages/ProjectPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (from localStorage or cookies)
    const storedUser = localStorage.getItem('terminal_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('terminal_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('terminal_user');
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
    <div className="app">
      <Routes>
        <Route 
          path="/" 
          element={
            user ? <Navigate to="/home" replace /> : <SplashPage onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/home" 
          element={
            user ? <HomePage user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/profile/:userId" 
          element={
            user ? <ProfilePage user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/project/:projectId" 
          element={
            user ? <ProjectPage user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />
          } 
        />
      </Routes>
    </div>
  );
}

export default App;