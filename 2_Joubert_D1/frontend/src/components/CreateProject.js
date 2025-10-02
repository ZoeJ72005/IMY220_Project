import React, { useState } from 'react';

const CreateProject = ({ user, onProjectCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'web-application',
    tags: '',
    version: 'v1.0.0'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const projectTypes = [
    'web-application',
    'desktop-application',
    'mobile-application',
    'library',
    'framework',
    'tool',
    'game',
    'other'
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.version.trim()) {
      newErrors.version = 'Version is required';
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

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, ownerId: user.id }),
      });

      const data = await response.json();

      if (data.success) {
        onProjectCreated();
      } else {
        setErrors({ general: data.message });
      }
    } catch (error) {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLabelClick = (inputName) => {
    const input = document.getElementById(inputName);
    if (input) {
      input.focus();
    }
  };

  return (
    <div className="create-project">
      <h3 className="form-title">
        &gt; CREATE_NEW_PROJECT
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
            onClick={() => handleLabelClick('project-name')}
          >
            PROJECT_NAME:
          </label>
          <input
            type="text"
            id="project-name"
            name="name"
            className="form-input terminal-input"
            value={formData.name}
            onChange={handleChange}
            placeholder="my-awesome-project"
            required
          />
          {errors.name && (
            <div className="error-message">ERROR: {errors.name}</div>
          )}
        </div>

        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('project-description')}
          >
            DESCRIPTION:
          </label>
          <textarea
            id="project-description"
            name="description"
            className="form-input terminal-input"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your project..."
            rows="4"
            required
          />
          {errors.description && (
            <div className="error-message">ERROR: {errors.description}</div>
          )}
        </div>

        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('project-type')}
          >
            PROJECT_TYPE:
          </label>
          <select
            id="project-type"
            name="type"
            className="form-input terminal-input"
            value={formData.type}
            onChange={handleChange}
          >
            {projectTypes.map(type => (
              <option key={type} value={type}>
                {type.toUpperCase().replace('-', '_')}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('project-tags')}
          >
            TAGS (comma separated):
          </label>
          <input
            type="text"
            id="project-tags"
            name="tags"
            className="form-input terminal-input"
            value={formData.tags}
            onChange={handleChange}
            placeholder="javascript, react, css"
          />
        </div>

        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('project-version')}
          >
            INITIAL_VERSION:
          </label>
          <input
            type="text"
            id="project-version"
            name="version"
            className="form-input terminal-input"
            value={formData.version}
            onChange={handleChange}
            required
          />
          {errors.version && (
            <div className="error-message">ERROR: {errors.version}</div>
          )}
        </div>

        <button
          type="submit"
          className="terminal-button submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'CREATING...' : 'CREATE_PROJECT'}
        </button>
      </form>
    </div>
  );
};

export default CreateProject;