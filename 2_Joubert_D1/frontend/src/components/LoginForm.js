import React, { useState } from 'react';

const LoginForm = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        onLogin(data.user);
      } else {
        setErrors({ general: data.message });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLabelClick = (inputName) => {
    const input = document.getElementById(inputName);
    if (input) {
      input.focus();
    }
  };

  return (
    <div className="login-form">
      <h3 className="form-title">
        &gt; ACCESS TERMINAL_
        <span className="cursor">_</span>
      </h3>
      
      {errors.general && (
        <div className="error-message terminal-error">
          ERROR: {errors.general}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('login-email')}
          >
            &gt; EMAIL_ADDRESS:
          </label>
          <input
            type="email"
            id="login-email"
            name="email"
            className="form-input terminal-input"
            value={formData.email}
            onChange={handleChange}
            placeholder="user@terminal.dev"
            required
          />
          {errors.email && (
            <div className="error-message">ERROR: {errors.email}</div>
          )}
        </div>

        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('login-password')}
          >
            &gt; PASSWORD:
          </label>
          <input
            type="password"
            id="login-password"
            name="password"
            className="form-input terminal-input"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />
          {errors.password && (
            <div className="error-message">ERROR: {errors.password}</div>
          )}
        </div>

        <button
          type="submit"
          className="terminal-button submit-btn"
          disabled={isLoading}
        >
          {isLoading ? 'ACCESSING...' : '&gt; LOGIN'}
        </button>
      </form>
      
      <div className="form-footer">
        <p>Test Account: test@test.com / test1234</p>
      </div>
    </div>
  );
};

export default LoginForm;