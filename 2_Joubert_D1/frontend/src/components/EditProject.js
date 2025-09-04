import React, { useState } from 'react';

const EditProject = ({ project, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: project.name || '',
    description: project.description || '',
    type: project.type || 'web-application'
  });
  const [errors, setErrors] = useState({});

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleLabelClick = (inputName) => {
    const input = document.getElementById(inputName);
    if (input) {
      input.focus();
    }
  };

  return (
    <div className="edit-project">
      <h3 className="edit-title">
        &gt; EDIT_PROJECT
        <span className="cursor">_</span>
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('edit-project-name')}
          >
            PROJECT_NAME:
          </label>
          <input
            type="text"
            id="edit-project-name"
            name="name"
            className="form-input terminal-input"
            value={formData.name}
            onChange={handleChange}
            required
          />
          {errors.name && (
            <div className="error-message">ERROR: {errors.name}</div>
          )}
        </div>

        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('edit-project-description')}
          >
            DESCRIPTION:
          </label>
          <textarea
            id="edit-project-description"
            name="description"
            className="form-input terminal-input"
            value={formData.description}
            onChange={handleChange}
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
            onClick={() => handleLabelClick('edit-project-type')}
          >
            PROJECT_TYPE:
          </label>
          <select
            id="edit-project-type"
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

        <div className="form-actions">
          <button type="submit" className="save-btn terminal-button">
            SAVE_CHANGES
          </button>
          <button type="button" onClick={onCancel} className="cancel-btn terminal-button">
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProject;