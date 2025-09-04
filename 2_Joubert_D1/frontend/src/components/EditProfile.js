import React, { useState } from 'react';

const EditProfile = ({ profile, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    fullName: profile.fullName || '',
    bio: profile.bio || '',
    location: profile.location || '',
    company: profile.company || '',
    website: profile.website || ''
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
    <div className="edit-profile">
      <h3 className="edit-title">
        &gt; EDIT_PROFILE
        <span className="cursor">_</span>
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('edit-fullname')}
          >
            FULL_NAME:
          </label>
          <input
            type="text"
            id="edit-fullname"
            name="fullName"
            className="form-input terminal-input"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Your full name"
            maxLength="50"
          />
          {errors.fullName && (
            <div className="error-message">ERROR: {errors.fullName}</div>
          )}
        </div>

        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('edit-bio')}
          >
            BIO:
          </label>
          <textarea
            id="edit-bio"
            name="bio"
            className="form-input terminal-input"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself..."
            maxLength="200"
            rows="3"
          />
          <div className="char-count">
            {formData.bio.length}/200
          </div>
          {errors.bio && (
            <div className="error-message">ERROR: {errors.bio}</div>
          )}
        </div>

        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('edit-location')}
          >
            LOCATION:
          </label>
          <input
            type="text"
            id="edit-location"
            name="location"
            className="form-input terminal-input"
            value={formData.location}
            onChange={handleChange}
            placeholder="Your location"
          />
        </div>

        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('edit-company')}
          >
            COMPANY:
          </label>
          <input
            type="text"
            id="edit-company"
            name="company"
            className="form-input terminal-input"
            value={formData.company}
            onChange={handleChange}
            placeholder="Your company"
          />
        </div>

        <div className="form-group">
          <label 
            className="form-label"
            onClick={() => handleLabelClick('edit-website')}
          >
            WEBSITE:
          </label>
          <input
            type="url"
            id="edit-website"
            name="website"
            className="form-input terminal-input"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://your-website.com"
          />
          {errors.website && (
            <div className="error-message">ERROR: {errors.website}</div>
          )}
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

export default EditProfile;