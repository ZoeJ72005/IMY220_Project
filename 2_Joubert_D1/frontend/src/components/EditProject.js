import React, { useState, useEffect } from 'react';

const IMAGE_MAX_SIZE_MB = 5;

const EditProject = ({ project, currentUser, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: project.name || '',
    description: project.description || '',
    type: project.type || '',
    tags: (project.tags || []).map((tag) => `#${tag}`).join(', '),
    version: project.version || '',
  });
  const [projectTypes, setProjectTypes] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await fetch('/api/project-types');
        const data = await response.json();
        if (data.success) {
          setProjectTypes(data.types);
          setFormData((prev) => ({
            ...prev,
            type: prev.type || data.types?.[0] || '',
          }));
        }
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          general: 'Unable to load project types. Please try again later.',
        }));
      }
    };

    fetchTypes();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.type) {
      newErrors.type = 'Project type is required';
    }

    if (!formData.version.trim()) {
      newErrors.version = 'Version is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedImage(null);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview('');
      }
      return;
    }

    if (file.size > IMAGE_MAX_SIZE_MB * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        projectImage: `Image must be smaller than ${IMAGE_MAX_SIZE_MB}MB.`,
      }));
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((prev) => ({
      ...prev,
      projectImage: '',
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const payload = new FormData();
    payload.append('requesterId', currentUser.id);
    payload.append('name', formData.name.trim());
    payload.append('description', formData.description.trim());
    payload.append('type', formData.type);
    payload.append('version', formData.version.trim());
    payload.append('tags', formData.tags);

    if (selectedImage) {
      payload.append('projectImage', selectedImage);
    }

    try {
      await onSave(payload, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        version: formData.version.trim(),
        tags: formData.tags,
        imageFile: selectedImage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview('');
    }
    onCancel();
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

      {errors.general && (
        <div className="text-terminal-error text-xs mb-4 p-2 border border-terminal-error bg-terminal-bg/40">
          ERROR: {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="form-label text-terminal-text text-sm cursor-pointer block" htmlFor="edit-project-name">
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
          {errors.name && <div className="text-terminal-error text-xs">ERROR: {errors.name}</div>}
        </div>

        <div className="space-y-1">
          <label className="form-label text-terminal-text text-sm cursor-pointer block" htmlFor="edit-project-description">
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

        <div className="space-y-1">
          <label className="form-label text-terminal-text text-sm cursor-pointer block" htmlFor="edit-project-type">
            PROJECT_TYPE:
          </label>
          <select
            id="edit-project-type"
            name="type"
            className="form-input terminal-input"
            value={formData.type}
            onChange={handleChange}
          >
            {projectTypes.map((type) => (
              <option key={type} value={type}>
                {type.toUpperCase().replace('-', '_')}
              </option>
            ))}
          </select>
          {errors.type && <div className="text-terminal-error text-xs">ERROR: {errors.type}</div>}
        </div>

        <div className="space-y-1">
          <label className="form-label text-terminal-text text-sm cursor-pointer block" htmlFor="edit-project-version">
            VERSION:
          </label>
          <input
            type="text"
            id="edit-project-version"
            name="version"
            className="form-input terminal-input"
            value={formData.version}
            onChange={handleChange}
            required
          />
          {errors.version && <div className="text-terminal-error text-xs">ERROR: {errors.version}</div>}
        </div>

        <div className="space-y-1">
          <label className="form-label text-terminal-text text-sm cursor-pointer block" htmlFor="edit-project-tags">
            LANGUAGES_HASHTAGS:
          </label>
          <input
            type="text"
            id="edit-project-tags"
            name="tags"
            className="form-input terminal-input"
            value={formData.tags}
            onChange={handleChange}
            placeholder="#javascript, #react"
          />
        </div>

        <div className="space-y-1">
          <label className="form-label text-terminal-text text-sm cursor-pointer block" htmlFor="edit-project-image">
            PROJECT_IMAGE (max {IMAGE_MAX_SIZE_MB}MB):
          </label>
          <input
            type="file"
            id="edit-project-image"
            accept="image/*"
            className="form-input terminal-input"
            onChange={handleImageChange}
          />
          {errors.projectImage && (
            <div className="text-terminal-error text-xs">ERROR: {errors.projectImage}</div>
          )}
          {(imagePreview || project.imageUrl) && (
            <div className="mt-2 border border-terminal-dim rounded bg-terminal-input-bg/50 p-2 inline-flex flex-col gap-2">
              <span className="text-[11px] text-terminal-dim">Current preview</span>
              <img
                src={imagePreview || project.imageUrl}
                alt="Project preview"
                className="max-h-32 rounded border border-terminal-border object-cover"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
          <button
            type="submit"
            className={`${buttonClass('var(--terminal-accent)')}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'SAVING...' : 'SAVE_CHANGES'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className={`${buttonClass('var(--terminal-text)')}`}
            disabled={isSubmitting}
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProject;
