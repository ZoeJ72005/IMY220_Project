// 2_Joubert 05084360
import React, { useState, useEffect } from 'react';
import '../styles/ComponentBase.css';
import '../styles/EditProject.css';

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

  return (
    <section className="edit-project" aria-labelledby="edit-project-title">
      <header className="edit-project__header">
        <h3 id="edit-project-title" className="edit-project__title">
          &gt; Edit Project<span className="edit-project__cursor">_</span>
        </h3>
        <p className="edit-project__subtitle">
          Update the repository metadata and imagery before publishing a new build.
        </p>
      </header>

      {errors.general && <div className="edit-project__alert">Error: {errors.general}</div>}

      <form onSubmit={handleSubmit} className="edit-project__form" noValidate>
        <div className="edit-project__grid">
          <div className="edit-project__group">
            <label className="edit-project__label" htmlFor="edit-project-name">
              Project name
            </label>
            <input
              type="text"
              id="edit-project-name"
              name="name"
              className="edit-project__input"
              value={formData.name}
              onChange={handleChange}
              placeholder="Refine your project name"
              required
            />
            {errors.name && <div className="edit-project__error">{errors.name}</div>}
          </div>

          <div className="edit-project__group">
            <label className="edit-project__label" htmlFor="edit-project-type">
              Project type
            </label>
            <select
              id="edit-project-type"
              name="type"
              className="edit-project__input edit-project__input--select"
              value={formData.type}
              onChange={handleChange}
            >
              {projectTypes.map((type) => (
                <option key={type} value={type}>
                  {type.toUpperCase().replace('-', '_')}
                </option>
              ))}
            </select>
            {errors.type && <div className="edit-project__error">{errors.type}</div>}
          </div>
        </div>

        <div className="edit-project__group edit-project__group--textarea">
          <label className="edit-project__label" htmlFor="edit-project-description">
            Description
          </label>
          <textarea
            id="edit-project-description"
            name="description"
            className="edit-project__textarea"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Describe what changed in this release..."
            required
          />
          {errors.description && <div className="edit-project__error">{errors.description}</div>}
        </div>

        <div className="edit-project__grid">
          <div className="edit-project__group">
            <label className="edit-project__label" htmlFor="edit-project-tags">
              Languages &amp; hashtags
            </label>
            <input
              type="text"
              id="edit-project-tags"
              name="tags"
              className="edit-project__input"
              value={formData.tags}
              onChange={handleChange}
              placeholder="#javascript, #react"
            />
          </div>

          <div className="edit-project__group">
            <label className="edit-project__label" htmlFor="edit-project-version">
              Version
            </label>
            <input
              type="text"
              id="edit-project-version"
              name="version"
              className="edit-project__input"
              value={formData.version}
              onChange={handleChange}
              required
            />
            {errors.version && <div className="edit-project__error">{errors.version}</div>}
          </div>
        </div>

        <div className="edit-project__group">
          <label className="edit-project__label" htmlFor="edit-project-image">
            Project image (max {IMAGE_MAX_SIZE_MB}MB)
          </label>
          <input
            type="file"
            id="edit-project-image"
            accept="image/*"
            className="edit-project__input edit-project__input--file"
            onChange={handleImageChange}
          />
          {errors.projectImage && <div className="edit-project__error">{errors.projectImage}</div>}
          {(imagePreview || project.imageUrl) && (
            <div className="edit-project__preview">
              <span className="edit-project__preview-label">Current preview</span>
              <img
                src={imagePreview || project.imageUrl}
                alt="Project preview"
                className="edit-project__preview-image"
              />
            </div>
          )}
        </div>

        <div className="edit-project__actions">
          <button
            type="submit"
            className="terminal-button edit-project__button edit-project__button--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
            <button
            type="button"
            onClick={handleCancel}
            className="terminal-button edit-project__button edit-project__button--ghost"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
};

export default EditProject;
