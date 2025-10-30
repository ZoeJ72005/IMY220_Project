import React, { useState } from 'react';
import '../styles/LoginForm.css';

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
    <section className="login-form" aria-labelledby="login-form-title">
      <header className="login-form__header">
        <h3 id="login-form-title" className="login-form__title">
          &gt; Access Terminal<span className="login-form__cursor">_</span>
        </h3>
        <p className="login-form__subtitle">
          Enter your credentials to continue working on your projects.
        </p>
      </header>

      {errors.general && <div className="login-form__error">Error: {errors.general}</div>}

      <form onSubmit={handleSubmit} className="login-form__body" noValidate>
        <div className="login-form__field">
          <label
            className="login-form__label"
            htmlFor="login-email"
            onClick={() => handleLabelClick('login-email')}
          >
            Email address
          </label>
          <input
            type="email"
            id="login-email"
            name="email"
            className="login-form__input"
            value={formData.email}
            onChange={handleChange}
            placeholder="user@terminal.dev"
            autoComplete="email"
            required
          />
          {errors.email && <div className="login-form__field-error">{errors.email}</div>}
        </div>

        <div className="login-form__field">
          <label
            className="login-form__label"
            htmlFor="login-password"
            onClick={() => handleLabelClick('login-password')}
          >
            Password
          </label>
          <input
            type="password"
            id="login-password"
            name="password"
            className="login-form__input"
            value={formData.password}
            onChange={handleChange}
            placeholder="********"
            autoComplete="current-password"
            required
          />
          {errors.password && <div className="login-form__field-error">{errors.password}</div>}
        </div>

        <button type="submit" className="login-form__submit" disabled={isLoading}>
          {isLoading ? 'Accessing...' : 'Log In'}
        </button>
      </form>

      <footer className="login-form__footer">
        <p>Forgot your password? Contact an administrator to reset access.</p>
      </footer>
    </section>
  );
};

export default LoginForm;



