import React, { useState, useEffect, useMemo } from 'react';
import './CreateProject.css';

const IMAGE_MAX_SIZE_MB = 5;

const CreateProject = ({ user, onProjectCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    tags: '',
    version: 'v1.0.0',
  });
  const [projectTypes, setProjectTypes] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await fetch('/api/project-types');
        const data = await response.json();
        if (data.success) {
          setProjectTypes(data.types);
          setFormData((prev) => ({
            ...prev,
            type: data.types?.[0] || '',
          }));
        } else {
          setErrors((prev) => ({
            ...prev,
            general: 'Unable to load project types. Please try again later.',
          }));
        }
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          general: 'Unable to load project types. Please check your connection.',
        }));
      } finally {
        setLoadingTypes(false);
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

  const handleFilesChange = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
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

    if (!formData.version.trim()) {
      newErrors.version = 'Version is required';
    }

    if (!formData.type) {
      newErrors.type = 'Please choose a project type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData((prev) => ({
      name: '',
      description: '',
      type: projectTypes?.[0] || prev.type,
      tags: '',
      version: 'v1.0.0',
    }));
    setSelectedFiles([]);
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = new FormData();
      payload.append('ownerId', user.id);
      payload.append('name', formData.name.trim());
      payload.append('description', formData.description.trim());
      payload.append('type', formData.type);
      payload.append('tags', formData.tags);
      payload.append('version', formData.version.trim());

      if (selectedImage) {
        payload.append('projectImage', selectedImage);
      }

      selectedFiles.forEach((file) => payload.append('projectFiles', file));

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: payload,
      });

      const data = await response.json();

      if (data.success) {
        resetForm();
        onProjectCreated?.(data.project);
      } else {
        setErrors((prev) => ({
          ...prev,
          general: data.message || 'Unable to create project. Please try again.',
        }));
      }
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        general: 'Network error. Please try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedFilesSummary = useMemo(() => {
    if (!selectedFiles.length) {
      return [];
    }
    return selectedFiles.map((file) => ({
      name: file.name,
      size: file.size,
    }));
  }, [selectedFiles]);

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <section className="project-form project-form--create">
      <header className="project-form__header">
        <div>
          <h3 className="project-form__title">
            &gt; Create New Project<span className="project-form__cursor">_</span>
          </h3>
          <p className="project-form__subtitle">
            Spin up a fresh repository space and configure the first release notes.
          </p>
        </div>
        <div className="project-form__meta">
          <span className="project-form__meta-label">Logged in as</span>
          <span className="project-form__meta-value">{user?.username || 'anonymous'}</span>
        </div>
      </header>

      {errors.general && <div className="project-form__alert">Error: {errors.general}</div>}

      <form onSubmit={handleSubmit} className="project-form__body" noValidate>
        <div className="project-form__grid">
          <div className="project-form__group">
            <label className="project-form__label" htmlFor="project-name">
              Project name
            </label>
            <input
              type="text"
              id="project-name"
              name="name"
              className="project-form__input"
              value={formData.name}
              onChange={handleChange}
              placeholder="Awesome Terminal Portal"
              required
            />
            {errors.name && <div className="project-form__error">{errors.name}</div>}
          </div>

          <div className="project-form__group">
            <label className="project-form__label" htmlFor="project-type">
              Project type
            </label>
            <select
              id="project-type"
              name="type"
              className="project-form__input project-form__input--select"
              value={formData.type}
              onChange={handleChange}
              disabled={loadingTypes}
            >
              {projectTypes.map((type) => (
                <option key={type} value={type}>
                  {type.toUpperCase().replace('-', '_')}
                </option>
              ))}
            </select>
            {errors.type && <div className="project-form__error">{errors.type}</div>}
          </div>
        </div>

        <div className="project-form__group">
          <label className="project-form__label" htmlFor="project-description">
            Project description
          </label>
          <textarea
            id="project-description"
            name="description"
            className="project-form__textarea"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe what your project does..."
            rows="4"
            required
          />
          {errors.description && <div className="project-form__error">{errors.description}</div>}
        </div>

        <div className="project-form__grid">
          <div className="project-form__group">
            <label className="project-form__label" htmlFor="project-tags">
              Languages &amp; hashtags
            </label>
            <input
              type="text"
              id="project-tags"
              name="tags"
              className="project-form__input"
              value={formData.tags}
              onChange={handleChange}
              placeholder="#javascript, #react, #css"
            />
            <p className="project-form__hint">
              Separate tags with commas or spaces. Example: #javascript, #react
            </p>
          </div>

          <div className="project-form__group">
            <label className="project-form__label" htmlFor="project-version">
              Initial version
            </label>
            <input
              type="text"
              id="project-version"
              name="version"
              className="project-form__input"
              value={formData.version}
              onChange={handleChange}
              required
            />
            {errors.version && <div className="project-form__error">{errors.version}</div>}
          </div>
        </div>

        <div className="project-form__grid">
          <div className="project-form__group">
            <label className="project-form__label" htmlFor="project-image">
              Project image (max {IMAGE_MAX_SIZE_MB}MB)
            </label>
            <input
              type="file"
              id="project-image"
              accept="image/*"
              className="project-form__input project-form__input--file"
              onChange={handleImageChange}
            />
            {errors.projectImage && <div className="project-form__error">{errors.projectImage}</div>}
            {imagePreview && (
              <div className="project-form__preview">
                <span className="project-form__preview-label">Preview</span>
                <img src={imagePreview} alt="Project preview" className="project-form__preview-image" />
              </div>
            )}
          </div>

          <div className="project-form__group">
            <label className="project-form__label" htmlFor="project-files">
              Project files (initial upload)
            </label>
            <input
              type="file"
              id="project-files"
              className="project-form__input project-form__input--file"
              multiple
              onChange={handleFilesChange}
            />
            <p className="project-form__hint">
              Add starter code, documentation, or media assets. More files can be checked in later.
            </p>
            {selectedFilesSummary.length > 0 && (
              <div className="project-form__file-list">
                {selectedFilesSummary.map((file) => (
                  <div key={file.name} className="project-form__file-item">
                    <span className="project-form__file-name">{file.name}</span>
                    <span className="project-form__file-size">{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button type="submit" className="project-form__submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create Project'}
        </button>
      </form>
    </section>
  );
};

export default CreateProject;
