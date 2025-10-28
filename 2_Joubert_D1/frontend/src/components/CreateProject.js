import React, { useState, useEffect, useMemo } from 'react';

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

  const buttonClass = (colorVar) => `
    terminal-button text-sm px-4 py-2 bg-transparent text-[${colorVar}] border-[${colorVar}] 
    hover:bg-[rgba(0,255,0,0.1)] w-full
  `;

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
    <div className="font-fira-code">
      <h3 className="text-lg text-terminal-accent font-bold mb-4">
        &gt; CREATE_NEW_PROJECT
        <span className="cursor animate-blink">_</span>
      </h3>

      {errors.general && (
        <div className="text-terminal-error text-xs mb-4 p-2 border border-terminal-error bg-terminal-bg/40">
          ERROR: {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label
            className="form-label text-terminal-text text-sm cursor-pointer"
            htmlFor="project-name"
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
            placeholder="retro-terminal"
            required
          />
          {errors.name && (
            <div className="text-terminal-error text-xs">ERROR: {errors.name}</div>
          )}
        </div>

        <div className="space-y-1">
          <label
            className="form-label text-terminal-text text-sm cursor-pointer"
            htmlFor="project-description"
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
            <div className="text-terminal-error text-xs">ERROR: {errors.description}</div>
          )}
        </div>

        <div className="space-y-1">
          <label
            className="form-label text-terminal-text text-sm cursor-pointer"
            htmlFor="project-type"
          >
            PROJECT_TYPE:
          </label>
          <select
            id="project-type"
            name="type"
            className="form-input terminal-input"
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
          {errors.type && (
            <div className="text-terminal-error text-xs">ERROR: {errors.type}</div>
          )}
        </div>

        <div className="space-y-1">
          <label
            className="form-label text-terminal-text text-sm cursor-pointer"
            htmlFor="project-tags"
          >
            LANGUAGES_HASHTAGS:
          </label>
          <input
            type="text"
            id="project-tags"
            name="tags"
            className="form-input terminal-input"
            value={formData.tags}
            onChange={handleChange}
            placeholder="#javascript, #react, #css"
          />
          <p className="text-terminal-dim text-[11px]">
            Separate multiple hashtags with commas or spaces. Example: #javascript, #react
          </p>
        </div>

        <div className="space-y-1">
          <label
            className="form-label text-terminal-text text-sm cursor-pointer"
            htmlFor="project-version"
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
            <div className="text-terminal-error text-xs">ERROR: {errors.version}</div>
          )}
        </div>

        <div className="space-y-1">
          <label
            className="form-label text-terminal-text text-sm cursor-pointer"
            htmlFor="project-image"
          >
            PROJECT_IMAGE (max {IMAGE_MAX_SIZE_MB}MB):
          </label>
          <input
            type="file"
            id="project-image"
            accept="image/*"
            className="form-input terminal-input"
            onChange={handleImageChange}
          />
          {errors.projectImage && (
            <div className="text-terminal-error text-xs">ERROR: {errors.projectImage}</div>
          )}
          {imagePreview && (
            <div className="mt-2 border border-terminal-dim rounded bg-terminal-input-bg/50 p-2 inline-flex flex-col items-start gap-2">
              <span className="text-[11px] text-terminal-dim">Preview</span>
              <img
                src={imagePreview}
                alt="Project preview"
                className="max-h-32 rounded border border-terminal-border object-cover"
              />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label
            className="form-label text-terminal-text text-sm cursor-pointer"
            htmlFor="project-files"
          >
            PROJECT_FILES (initial upload):
          </label>
          <input
            type="file"
            id="project-files"
            className="form-input terminal-input"
            multiple
            onChange={handleFilesChange}
          />
          <p className="text-terminal-dim text-[11px]">
            You can add code files, documentation, or media assets. Files can also be added during later check-ins.
          </p>
          {selectedFilesSummary.length > 0 && (
            <div className="border border-terminal-dim rounded bg-terminal-input-bg/40 p-2 space-y-1 text-[11px] text-terminal-text">
              {selectedFilesSummary.map((file) => (
                <div key={file.name} className="flex justify-between">
                  <span>{file.name}</span>
                  <span className="text-terminal-dim">{formatFileSize(file.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className={`${buttonClass('var(--terminal-accent)')} mt-6`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'CREATING...' : 'CREATE_PROJECT'}
        </button>
      </form>
    </div>
  );
};

export default CreateProject;
