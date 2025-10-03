import React, { useState } from 'react';
// No external CSS import needed

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
  
  const buttonClass = (colorVar) => `
    terminal-button text-sm px-4 py-2 bg-transparent text-[${colorVar}] border-[${colorVar}] 
    hover:bg-[rgba(0,255,0,0.1)] w-full sm:w-auto
  `;

  return (
    <div className="font-fira-code">
      <h3 className="text-lg text-terminal-text font-bold mb-4">
        &gt; EDIT_PROFILE
        <span className="cursor animate-blink">_</span>
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Full Name */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer"
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
            <div className="text-terminal-error text-xs">ERROR: {errors.fullName}</div>
          )}
        </div>

        {/* Bio */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer"
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
          <div className="text-terminal-dim text-xs text-right">
            {formData.bio.length}/200
          </div>
          {errors.bio && (
            <div className="text-terminal-error text-xs">ERROR: {errors.bio}</div>
          )}
        </div>

        {/* Location */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer"
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

        {/* Company */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer"
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

        {/* Website */}
        <div className="form-group space-y-1">
          <label 
            className="form-label text-terminal-text text-sm cursor-pointer"
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
            <div className="text-terminal-error text-xs">ERROR: {errors.website}</div>
          )}
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

export default EditProfile;
