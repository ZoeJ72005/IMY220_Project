import React, { useState } from 'react';

const SignUpForm = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

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

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        }),
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
    <div className="signup-form">
      <h3 className="form-title">
        &gt; CREATE_NEW_USER
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
            onClick={() => handleLabelClick('signup-username')}
          >
            &gt; USERNAME:
          </label>
          <input
            type="text"
            id="signup-username"
            name="username"
            className="form-input terminal-input"
            value={formData.username}
            onChange={handleChange}
            placeholder="terminal_user"
            required
          />
          {errors.username && (
            <div className="error-message">ERROR: {errors.username}</div>
          )}
        </div>

        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('signup-email')}
          >
            &gt; EMAIL_ADDRESS:
          </label>
          <input
            type="email"
            id="signup-email"
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
            onClick={() => handleLabelClick('signup-password')}
          >
            &gt; PASSWORD:
          </label>
          <input
            type="password"
            id="signup-password"
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

        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('signup-confirm-password')}
          >
            &gt; CONFIRM_PASSWORD:
          </label>
          <input
            type="password"
            id="signup-confirm-password"
            name="confirmPassword"
            className="form-input terminal-input"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />
          {errors.confirmPassword && (
            <div className="error-message">ERROR: {errors.confirmPassword}</div>
          )}
        </div>

        <button
          type="submit"
          className="terminal-button submit-btn"
          disabled={isLoading}
        >
          {isLoading ? 'CREATING_USER...' : '&gt; REGISTER'}
        </button>
      </form>
      
      <div className="form-footer">
        <p>Join the Terminal/VCS community</p>
      </div>
    </div>
  );
};

export default SignUpForm;