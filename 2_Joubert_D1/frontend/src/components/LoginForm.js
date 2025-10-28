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
    <div className="font-fira-code space-y-4">
      <h3 className="text-lg text-terminal-accent font-bold">
        &gt; ACCESS TERMINAL_
        <span className="cursor animate-blink">_</span>
      </h3>
      
      {errors.general && (
        <div className="text-terminal-error text-xs p-2 border border-terminal-error">
          ERROR: {errors.general}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer"
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
            <div className="text-terminal-error text-xs">ERROR: {errors.email}</div>
          )}
        </div>

        {/* Password */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer"
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
            placeholder="********"
            required
          />
          {errors.password && (
            <div className="text-terminal-error text-xs">ERROR: {errors.password}</div>
          )}
        </div>

        <button
          type="submit"
          className="terminal-button text-sm px-4 py-2 bg-transparent text-terminal-text border border-terminal-text w-full mt-6"
          disabled={isLoading}
        >
          {isLoading ? 'ACCESSING...' : '&gt; LOGIN'}
        </button>
      </form>
      
      <div className="text-terminal-dim text-xs text-center pt-2 border-t border-terminal-dim/50">
        <p> </p>
      </div>
    </div>
  );
};

export default LoginForm;

