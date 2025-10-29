import React, { useState } from 'react';
import './EditProfile.css';

const EditProfile = ({ profile, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    fullName: profile.fullName || '',
    bio: profile.bio || '',
    location: profile.location || '',
    company: profile.company || '',
    website: profile.website || '',
  });
  const [errors, setErrors] = useState({});

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

  const handleSubmit = (event) => {
    event.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const focusInput = (targetId) => {
    const input = document.getElementById(targetId);
    input?.focus();
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
      </form>
    </section>
  );
};

export default EditProfile;
