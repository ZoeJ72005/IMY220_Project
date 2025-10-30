// 2_Joubert 05084360
import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../styles/EditProfile.css';
import { resolveProfileImage } from '../utils/avatar';

const IMAGE_MAX_SIZE_MB = 5;
const IMAGE_MAX_SIZE_BYTES = IMAGE_MAX_SIZE_MB * 1024 * 1024;

const EditProfile = ({ profile, onSave, onCancel, errorMessage = '' }) => {
  const [formData, setFormData] = useState({
    fullName: profile.fullName || '',
    bio: profile.bio || '',
    location: profile.location || '',
    company: profile.company || '',
    website: profile.website || '',
  });
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(profile.profileImage || '');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFormData({
      fullName: profile.fullName || '',
      bio: profile.bio || '',
      location: profile.location || '',
      company: profile.company || '',
      website: profile.website || '',
    });
    setImagePreview(profile.profileImage || '');
    setImageFile(null);
  }, [
    profile.fullName,
    profile.bio,
    profile.location,
    profile.company,
    profile.website,
    profile.profileImage,
  ]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const displayPreview = useMemo(
    () => imagePreview || resolveProfileImage(profile.profileImage, profile.id || profile.username, 160),
    [imagePreview, profile.profileImage, profile.id, profile.username]
  );

  const validateForm = () => {
    const newErrors = {};

    if (formData.fullName && formData.fullName.length > 50) {
      newErrors.fullName = 'Full name must be less than 50 characters';
    }

    if (formData.bio && formData.bio.length > 200) {
      newErrors.bio = 'Bio must be less than 200 characters';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must be a valid URL (http:// or https://)';
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

  const handleSelectedImage = (file) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, profileImage: 'Please upload a valid image file' }));
      return;
    }

    if (file.size > IMAGE_MAX_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        profileImage: `Image must be smaller than ${IMAGE_MAX_SIZE_MB}MB.`,
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, profileImage: '' }));

    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleSelectedImage(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      handleSelectedImage(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleResetImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(profile.profileImage || '');
    setErrors((prev) => ({ ...prev, profileImage: '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    const payload = new FormData();
    payload.append('fullName', formData.fullName.trim());
    payload.append('bio', formData.bio.trim());
    payload.append('location', formData.location.trim());
    payload.append('company', formData.company.trim());
    payload.append('website', formData.website.trim());

    if (imageFile) {
      payload.append('profileImage', imageFile);
    }

    onSave(payload, { useFormData: true });
  };

  const focusInput = (targetId) => {
    const input = document.getElementById(targetId);
    input?.focus();
  };

  const handleSelectButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <section className="edit-profile" aria-labelledby="edit-profile-title">
      <header className="edit-profile__header">
        <h3 id="edit-profile-title" className="edit-profile__title">
          &gt; Edit Profile<span className="edit-profile__cursor">_</span>
        </h3>
        <p className="edit-profile__subtitle">
          Refine the information that appears on your public developer profile.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="edit-profile__form" noValidate>
        <div className="edit-profile__group edit-profile__group--image">
          <label className="edit-profile__label" htmlFor="edit-profile-image">
            Profile image
          </label>
          <div
            className={`edit-profile__dropzone ${isDragging ? 'edit-profile__dropzone--active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id="edit-profile-image"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="edit-profile__file-input"
              onChange={handleImageChange}
            />
            <div className="edit-profile__dropzone-preview">
              <img src={displayPreview} alt="Profile preview" className="edit-profile__preview-image" />
            </div>
            <div className="edit-profile__dropzone-actions">
              <button
                type="button"
                onClick={handleSelectButtonClick}
                className="edit-profile__button edit-profile__button--ghost edit-profile__button--sm"
              >
                Choose Image
              </button>
              {imageFile && (
                <button
                  type="button"
                  onClick={handleResetImage}
                  className="edit-profile__button edit-profile__button--danger edit-profile__button--sm"
                >
                  Reset
                </button>
              )}
            </div>
            <p className="edit-profile__hint">Drag &amp; drop or choose a file (max {IMAGE_MAX_SIZE_MB}MB).</p>
          </div>
          {errors.profileImage && <div className="edit-profile__error">{errors.profileImage}</div>}
        </div>

        <div className="edit-profile__group">
          <label
            className="edit-profile__label"
            htmlFor="edit-fullname"
            onClick={() => focusInput('edit-fullname')}
          >
            Full name
          </label>
          <input
            type="text"
            id="edit-fullname"
            name="fullName"
            className="edit-profile__input"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Your full name"
            maxLength={50}
          />
          {errors.fullName && <div className="edit-profile__error">{errors.fullName}</div>}
        </div>

        <div className="edit-profile__group edit-profile__group--textarea">
          <label
            className="edit-profile__label"
            htmlFor="edit-bio"
            onClick={() => focusInput('edit-bio')}
          >
            Bio
          </label>
          <textarea
            id="edit-bio"
            name="bio"
            className="edit-profile__textarea"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself..."
            maxLength={200}
            rows={3}
          />
          <div className="edit-profile__hint">{formData.bio.length}/200 characters</div>
          {errors.bio && <div className="edit-profile__error">{errors.bio}</div>}
        </div>

        <div className="edit-profile__group">
          <label
            className="edit-profile__label"
            htmlFor="edit-location"
            onClick={() => focusInput('edit-location')}
          >
            Location
          </label>
          <input
            type="text"
            id="edit-location"
            name="location"
            className="edit-profile__input"
            value={formData.location}
            onChange={handleChange}
            placeholder="Your location"
          />
        </div>

        <div className="edit-profile__group">
          <label
            className="edit-profile__label"
            htmlFor="edit-company"
            onClick={() => focusInput('edit-company')}
          >
            Company
          </label>
          <input
            type="text"
            id="edit-company"
            name="company"
            className="edit-profile__input"
            value={formData.company}
            onChange={handleChange}
            placeholder="Your company"
          />
        </div>

        <div className="edit-profile__group">
          <label
            className="edit-profile__label"
            htmlFor="edit-website"
            onClick={() => focusInput('edit-website')}
          >
            Website
          </label>
          <input
            type="url"
            id="edit-website"
            name="website"
            className="edit-profile__input"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://your-website.com"
          />
          {errors.website && <div className="edit-profile__error">{errors.website}</div>}
        </div>

        <div className="edit-profile__actions">
          <button type="submit" className="edit-profile__button edit-profile__button--primary">
            Save Changes
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="edit-profile__button edit-profile__button--ghost"
          >
            Cancel
          </button>
        </div>
        {errorMessage && (
          <div className="edit-profile__error edit-profile__error--global">
            {errorMessage}
          </div>
        )}
      </form>
    </section>
  );
};

export default EditProfile;
