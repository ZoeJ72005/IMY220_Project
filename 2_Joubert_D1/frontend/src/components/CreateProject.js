import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../styles/CreateProject.css';

const IMAGE_MAX_SIZE_MB = 5;
const IMAGE_MAX_SIZE_BYTES = IMAGE_MAX_SIZE_MB * 1024 * 1024;

const EXTENSION_TAG_MAP = {
  js: ['javascript'],
  jsx: ['javascript', 'react'],
  ts: ['typescript'],
  tsx: ['typescript', 'react'],
  py: ['python'],
  rb: ['ruby'],
  java: ['java'],
  cs: ['csharp'],
  cpp: ['cpp'],
  hpp: ['cpp'],
  c: ['c'],
  go: ['golang'],
  rs: ['rust'],
  php: ['php'],
  swift: ['swift'],
  kt: ['kotlin'],
  m: ['objective-c'],
  html: ['html'],
  css: ['css'],
  scss: ['css', 'sass'],
  less: ['css'],
  json: ['json'],
  md: ['documentation'],
  txt: ['notes'],
  sql: ['database'],
  sh: ['shell'],
  ps1: ['powershell'],
  yaml: ['config'],
  yml: ['config'],
  dockerfile: ['docker'],
};

const normaliseTag = (tag) => tag.replace(/^#+/, '').trim().toLowerCase();

const getExtension = (filename = '') => {
  if (!filename) return '';
  const lower = filename.toLowerCase();
  if (lower === 'dockerfile') return 'dockerfile';
  const segments = lower.split('.');
  return segments.length > 1 ? segments.pop() : '';
};

const collectTagsFromFiles = (files = []) => {
  const tagSet = new Set();
  files.forEach((file) => {
    const ext = getExtension(file.name);
    if (ext && EXTENSION_TAG_MAP[ext]) {
      EXTENSION_TAG_MAP[ext].forEach((tag) => tagSet.add(tag));
    } else if (ext) {
      tagSet.add(ext);
    }
  });
  return Array.from(tagSet);
};

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
  const [isImageDragging, setIsImageDragging] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [detectedTags, setDetectedTags] = useState([]);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

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

  useEffect(() => {
    const tagCandidates = collectTagsFromFiles(selectedFiles);
    setDetectedTags(tagCandidates);
    if (tagCandidates.length && !formData.tags.trim()) {
      setFormData((prev) => ({
        ...prev,
        tags: tagCandidates.map((tag) => `#${tag}`).join(', '),
      }));
    }
  }, [selectedFiles, formData.tags]);

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

  const handleSelectedImage = (file) => {
    if (!file) {
      setSelectedImage(null);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview('');
      }
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({
        ...prev,
        projectImage: 'Please upload a valid image file.',
      }));
      return;
    }

    if (file.size > IMAGE_MAX_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        projectImage: `Image must be smaller than ${IMAGE_MAX_SIZE_MB}MB.`,
      }));
      return;
    }

    setErrors((prev) => ({
      ...prev,
      projectImage: '',
    }));

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    handleSelectedImage(file);
  };

  const handleImageDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsImageDragging(false);
    const file = event.dataTransfer?.files?.[0];
    handleSelectedImage(file);
  };

  const handleImageDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsImageDragging(true);
  };

  const handleImageDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsImageDragging(false);
  };

  const handleFilesChange = (files) => {
    setSelectedFiles(files);
  };

  const handleFilesInputChange = (event) => {
    const files = Array.from(event.target.files || []);
    handleFilesChange(files);
  };

  const handleFilesDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsFileDragging(false);
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length) {
      handleFilesChange(files);
    }
  };

  const handleFilesDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsFileDragging(true);
  };

  const handleFilesDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsFileDragging(false);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleTagSuggestionClick = (tag) => {
    const existing = formData.tags
      .split(/[,\s]+/)
      .map(normaliseTag)
      .filter(Boolean);
    if (!existing.includes(tag)) {
      const nextTags = [...existing, tag].map((value) => `#${value}`).join(', ');
      setFormData((prev) => ({
        ...prev,
        tags: nextTags,
      }));
    }
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
    setDetectedTags([]);
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
    return selectedFiles.map((file, index) => ({
      name: file.name,
      size: file.size,
      index,
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
            {detectedTags.length > 0 && (
              <div className="project-form__tag-suggestions">
                <span className="project-form__hint">Suggested:</span>
                {detectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="project-form__tag-suggestion"
                    onClick={() => handleTagSuggestionClick(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
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

        <div className="project-form__grid project-form__grid--uploads">
          <div className="project-form__group">
            <label className="project-form__label" htmlFor="project-image">
              Project image (max {IMAGE_MAX_SIZE_MB}MB)
            </label>
            <div
              className={`project-form__dropzone ${isImageDragging ? 'project-form__dropzone--active' : ''}`}
              onDragOver={handleImageDragOver}
              onDragLeave={handleImageDragLeave}
              onDrop={handleImageDrop}
              role="presentation"
            >
              <input
                type="file"
                id="project-image"
                ref={imageInputRef}
                accept="image/*"
                className="project-form__input project-form__input--file"
                onChange={handleImageChange}
              />
              <div className="project-form__dropzone-content">
                {imagePreview ? (
                  <img src={imagePreview} alt="Project preview" className="project-form__preview-image" />
                ) : (
                  <span className="project-form__hint">Drag &amp; drop image or click to browse</span>
                )}
              </div>
              <button
                type="button"
                className="project-form__button project-form__button--ghost"
                onClick={() => imageInputRef.current?.click()}
              >
                Choose Image
              </button>
              {imagePreview && (
                <button
                  type="button"
                  className="project-form__button project-form__button--ghost"
                  onClick={handleResetImage}
                >
                  Remove
                </button>
              )}
            </div>
            {errors.projectImage && <div className="project-form__error">{errors.projectImage}</div>}
          </div>

          <div className="project-form__group">
            <label className="project-form__label" htmlFor="project-files">
              Project files (initial upload)
            </label>
            <div
              className={`project-form__dropzone project-form__dropzone--files ${isFileDragging ? 'project-form__dropzone--active' : ''}`}
              onDragOver={handleFilesDragOver}
              onDragLeave={handleFilesDragLeave}
              onDrop={handleFilesDrop}
              role="presentation"
            >
              <input
                type="file"
                id="project-files"
                ref={fileInputRef}
                className="project-form__input project-form__input--file"
                multiple
                onChange={handleFilesInputChange}
              />
              <div className="project-form__dropzone-content">
                <span className="project-form__hint">Drag &amp; drop files or click to browse</span>
              </div>
              <button
                type="button"
                className="project-form__button project-form__button--ghost"
                onClick={() => fileInputRef.current?.click()}
              >
                Select Files
              </button>
            </div>
            <p className="project-form__hint">
              Add starter code, documentation, or media assets. More files can be checked in later.
            </p>
            {selectedFilesSummary.length > 0 && (
              <div className="project-form__file-list">
                {selectedFilesSummary.map((file) => (
                  <div key={file.index} className="project-form__file-item">
                    <span className="project-form__file-name">{file.name}</span>
                    <span className="project-form__file-size">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      className="project-form__file-remove"
                      onClick={() => handleRemoveFile(file.index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button type="submit" className="project-form__submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Project'}
        </button>
      </form>
    </section>
  );
};

export default CreateProject;
