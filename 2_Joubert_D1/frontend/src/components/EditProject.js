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

  const buttonClass = (colorVar) => `
    terminal-button text-sm px-4 py-2 bg-transparent text-[${colorVar}] border-[${colorVar}] 
    hover:bg-[rgba(0,255,0,0.1)] w-full sm:w-auto
  `;

  return (
    <div className="font-fira-code">
      <h3 className="text-lg text-terminal-accent font-bold mb-4">
        &gt; EDIT_PROJECT
        <span className="cursor animate-blink">_</span>
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Name */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer block"
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
            <div className="text-terminal-error text-xs">ERROR: {errors.name}</div>
          )}
        </div>

        {/* Description */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer block"
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
            <div className="text-terminal-error text-xs">ERROR: {errors.description}</div>
          )}
        </div>

        {/* Project Type */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer block"
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

        {/* Actions */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
          <button type="submit" className={`${buttonClass('var(--terminal-accent)')}`}>
            SAVE_CHANGES
          </button>
          <button type="button" onClick={onCancel} className={`${buttonClass('var(--terminal-text)')}`}>
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProject;
