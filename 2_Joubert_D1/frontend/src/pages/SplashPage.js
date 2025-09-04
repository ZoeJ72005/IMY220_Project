import React, { useState, useEffect } from 'react';
import LoginForm from '../components/LoginForm';
import SignUpForm from '../components/SignUpForm';
import './SplashPage.css';

const SplashPage = ({ onLogin }) => {
  const [showLogin, setShowLogin] = useState(true);
  const [terminalText, setTerminalText] = useState('');
  const [showForms, setShowForms] = useState(false);

  const welcomeText = `
> Initializing C:CodeRepo v2.0...
> Loading secure version control system...
> Welcome to the future of collaborative coding
> 
> C:CodeRepo - Where Code Lives Forever
> ================================
> 
> A retro-style version control platform
> for the modern developer
> `;

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < welcomeText.length) {
        setTerminalText(welcomeText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setTimeout(() => setShowForms(true), 1000);
      }
    }, 30);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="splash-page">
      <div className="terminal-container">
        <div className="terminal-header">
          <div className="terminal-controls">
            <span className="control red"></span>
            <span className="control yellow"></span>
            <span className="control green"></span>
          </div>
          <div className="terminal-title">C:CodeRepo v2.0</div>
        </div>
        
        <div className="terminal-content">
          <pre className="terminal-output">
            {terminalText}
            <span className="cursor">_</span>
          </pre>
          
          {showForms && (
            <div className="auth-section">
              <div className="auth-tabs">
                <button 
                  className={`tab-button ${showLogin ? 'active' : ''}`}
                  onClick={() => setShowLogin(true)}
                >
                   LOGIN
                </button>
                <button 
                  className={`tab-button ${!showLogin ? 'active' : ''}`}
                  onClick={() => setShowLogin(false)}
                >
                   REGISTER
                </button>
              </div>
              
              <div className="auth-form-container">
                {showLogin ? (
                  <LoginForm onLogin={onLogin} />
                ) : (
                  <SignUpForm onLogin={onLogin} />
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="terminal-footer">
          <div className="brand-info">
            <h1 className="brand-name">C:CodeRepo</h1>
            <p className="tagline">Secure • Collaborative • Retro-Style</p>
            <div className="features">
              <span>✓ Version Control</span>
              <span>✓ Team Collaboration</span>
              <span>✓ Project Management</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashPage;