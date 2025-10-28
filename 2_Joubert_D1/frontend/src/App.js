import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SplashPage from './pages/SplashPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ProjectPage from './pages/ProjectPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const enrichUser = (userData) => ({
    ...userData,
    friends: userData?.friends || [],
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('terminal_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(enrichUser(parsedUser));
    }
    setLoading(false);
  }, []);

  const persistUser = (userData) => {
    const enriched = enrichUser(userData);
    setUser(enriched);
    localStorage.setItem('terminal_user', JSON.stringify(enriched));
  };

  const handleLogin = (userData) => {
    persistUser(userData);
  };

  const handleUserUpdate = (updatedUser) => {
    persistUser(updatedUser);
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
            user ? (
              <ProfilePage 
                user={user} 
                onLogout={handleLogout} 
                onUserUpdate={handleUserUpdate} 
              />
            ) : <Navigate to="/" replace />
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
