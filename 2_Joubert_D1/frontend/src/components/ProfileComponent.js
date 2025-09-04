import React from 'react';
import { Link } from 'react-router-dom';
import './ProfileComponent.css';

const ProfileComponent = ({ profile, isOwnProfile, onEdit, currentUser }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="profile-component">
      <div className="profile-header">
        <div className="profile-image-container">
          <img 
            src={profile.profileImage || '/assets/images/profile-default.png'} 
            alt={`${profile.username} profile`}
            className="profile-image"
            onError={(e) => {
              e.target.src = '/assets/images/profile-default.png';
            }}
          />
          <div className="status-indicator online"></div>
        </div>
        
        <div className="profile-info">
          <h2 className="profile-username">
            &gt; {profile.username}
            <span className="cursor">_</span>
          </h2>
          {profile.fullName && (
            <p className="profile-fullname">{profile.fullName}</p>
          )}
          <div className="join-date">
            JOINED: {formatDate(profile.joinDate)}
          </div>
        </div>
      </div>

      {profile.bio && (
        <div className="profile-bio">
          <h3 className="bio-title">&gt; BIO</h3>
          <p className="bio-text">{profile.bio}</p>
        </div>
      )}

      <div className="profile-details">
        <h3 className="details-title">&gt; DETAILS</h3>
        <div className="detail-list">
          {profile.location && (
            <div className="detail-item">
              <span className="detail-label">LOCATION:</span>
              <span className="detail-value">{profile.location}</span>
            </div>
          )}
          {profile.company && (
            <div className="detail-item">
              <span className="detail-label">COMPANY:</span>
              <span className="detail-value">{profile.company}</span>
            </div>
          )}
          {profile.website && (
            <div className="detail-item">
              <span className="detail-label">WEBSITE:</span>
              <a href={profile.website} className="detail-link" target="_blank" rel="noopener noreferrer">
                {profile.website}
              </a>
            </div>
          )}
          <div className="detail-item">
            <span className="detail-label">EMAIL:</span>
            <span className="detail-value">{profile.email}</span>
          </div>
        </div>
      </div>

      {profile.languages && profile.languages.length > 0 && (
        <div className="languages-section">
          <h3 className="languages-title">&gt; LANGUAGES</h3>
          <div className="language-tags">
            {profile.languages.map((language, index) => (
              <span key={index} className="language-tag">
                {language}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="profile-actions">
        {isOwnProfile ? (
          <button onClick={onEdit} className="action-btn edit-btn terminal-button">
            EDIT_PROFILE
          </button>
        ) : (
          <div className="external-actions">
            <button className="action-btn friend-btn terminal-button">
              ADD_FRIEND
            </button>
            <button className="action-btn message-btn terminal-button">
              SEND_MESSAGE
            </button>
          </div>
        )}
      </div>

      <div className="connection-status">
        {!isOwnProfile && (
          <div className="connection-info">
            <span className="connection-label">CONNECTION_STATUS:</span>
            <span className="connection-value not-connected">
              NOT_CONNECTED
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileComponent;