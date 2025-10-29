import React, { useState } from 'react';
import './SignUpForm.css';

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
    <section className="signup-form" aria-labelledby="signup-form-title">
      <header className="signup-form__header">
        <h3 id="signup-form-title" className="signup-form__title">
          &gt; Create New User<span className="signup-form__cursor">_</span>
        </h3>
        <p className="signup-form__subtitle">
          Spin up your developer profile and start collaborating in the terminal.
        </p>
      </header>

      {errors.general && <div className="signup-form__error">Error: {errors.general}</div>}

      <form onSubmit={handleSubmit} className="signup-form__body" noValidate>
        <div className="signup-form__field">
          <label
            className="signup-form__label"
            htmlFor="signup-username"
            onClick={() => handleLabelClick('signup-username')}
          >
            Username
          </label>
          <input
            type="text"
            id="signup-username"
            name="username"
            className="signup-form__input"
            value={formData.username}
            onChange={handleChange}
            placeholder="terminal_user"
            autoComplete="username"
            required
          />
          {errors.username && <div className="signup-form__field-error">{errors.username}</div>}
        </div>

        <div className="signup-form__field">
          <label
            className="signup-form__label"
            htmlFor="signup-email"
            onClick={() => handleLabelClick('signup-email')}
          >
            Email address
          </label>
          <input
            type="email"
            id="signup-email"
            name="email"
            className="signup-form__input"
            value={formData.email}
            onChange={handleChange}
            placeholder="user@terminal.dev"
            autoComplete="email"
            required
          />
          {errors.email && <div className="signup-form__field-error">{errors.email}</div>}
        </div>

        <div className="signup-form__field">
          <label
            className="signup-form__label"
            htmlFor="signup-password"
            onClick={() => handleLabelClick('signup-password')}
          >
            Password
          </label>
          <input
            type="password"
            id="signup-password"
            name="password"
            className="signup-form__input"
            value={formData.password}
            onChange={handleChange}
            placeholder="********"
            autoComplete="new-password"
            required
          />
          {errors.password && <div className="signup-form__field-error">{errors.password}</div>}
        </div>

        <div className="signup-form__field">
          <label
            className="signup-form__label"
            htmlFor="signup-confirm-password"
            onClick={() => handleLabelClick('signup-confirm-password')}
          >
            Confirm password
          </label>
          <input
            type="password"
            id="signup-confirm-password"
            name="confirmPassword"
            className="signup-form__input"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="********"
            autoComplete="new-password"
            required
          />
          {errors.confirmPassword && (
            <div className="signup-form__field-error">{errors.confirmPassword}</div>
          )}
        </div>

        <button type="submit" className="signup-form__submit" disabled={isLoading}>
          {isLoading ? 'Creating user…' : 'Register'}
        </button>
      </form>

      <footer className="signup-form__footer">
        <p>Join the terminal community and start sharing your projects.</p>
      </footer>
    </section>
  );
};

export default SignUpForm;

