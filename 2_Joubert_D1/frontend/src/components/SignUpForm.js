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
    <div className="font-fira-code space-y-4">
      <h3 className="text-lg text-terminal-accent font-bold">
        &gt; CREATE_NEW_USER
        <span className="cursor animate-blink">_</span>
      </h3>
      
      {errors.general && (
        <div className="text-terminal-error text-xs p-2 border border-terminal-error">
          ERROR: {errors.general}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Username */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer"
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
            <div className="text-terminal-error text-xs">ERROR: {errors.username}</div>
          )}
        </div>

        {/* Email */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer"
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
            <div className="text-terminal-error text-xs">ERROR: {errors.email}</div>
          )}
        </div>

        {/* Password */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer"
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
            <div className="text-terminal-error text-xs">ERROR: {errors.password}</div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer"
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
            <div className="text-terminal-error text-xs">ERROR: {errors.confirmPassword}</div>
          )}
        </div>

        <button
          type="submit"
          className="terminal-button text-sm px-4 py-2 bg-transparent text-terminal-accent border border-terminal-accent w-full mt-6"
          disabled={isLoading}
        >
          {isLoading ? 'CREATING_USER...' : '&gt; REGISTER'}
        </button>
      </form>
      
      <div className="text-terminal-dim text-xs text-center pt-2 border-t border-terminal-dim/50">
        <p>Join the Terminal/VCS community</p>
      </div>
    </div>
  );
};

export default SignUpForm;
