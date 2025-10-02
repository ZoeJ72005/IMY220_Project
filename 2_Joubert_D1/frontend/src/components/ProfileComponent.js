import React from 'react';
import '../styles/ProfileComponent.css';

const ProfileComponent = ({ profile, isOwnProfile, onEdit }) => {
  const formatDate = date => new Date(date).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });

  return (
    <div className="profile-component">
      <div className="profile-header">
        <div className="profile-image-container"> 
          <img
            src={profile.profileImage || 'https://via.placeholder.com/120'}
            alt={`${profile.username} profile`}
            className="profile-image"
          />

          <div className="status-indicator online"></div>
        </div>
        <h2 className="profile-username">&gt; {profile.username}<span className="cursor">_</span></h2>
        {profile.fullName && <p className="profile-fullname">{profile.fullName}</p>}
        <div className="join-date">JOINED: {formatDate(profile.joinDate)}</div>
      </div>

      {profile.bio && (
        <div className="profile-bio">
          <h3 className="bio-title">&gt; BIO</h3>
          <p className="bio-text">{profile.bio}</p>
        </div>
      )}

      <div className="profile-details">
        <h3 className="details-title">&gt; DETAILS</h3>
        {profile.location && <div className="detail-item"><span className="detail-label">LOCATION:</span> <span className="detail-value">{profile.location}</span></div>}
        {profile.company && <div className="detail-item"><span className="detail-label">COMPANY:</span> <span className="detail-value">{profile.company}</span></div>}
        {profile.website && <div className="detail-item"><span className="detail-label">WEBSITE:</span> <a href={profile.website} target="_blank" rel="noopener noreferrer">{profile.website}</a></div>}
        <div className="detail-item"><span className="detail-label">EMAIL:</span> <span className="detail-value">{profile.email}</span></div>
      </div>

      {profile.languages?.length > 0 && (
        <div className="languages-section">
          <h3 className="languages-title">&gt; LANGUAGES</h3>
          <div className="language-tags">{profile.languages.map((l,i)=><span key={i} className="language-tag">{l}</span>)}</div>
        </div>
      )}

      <div className="profile-actions">
        {isOwnProfile 
          ? <button onClick={onEdit} className="action-btn edit-btn">EDIT PROFILE</button>
          : <div className="external-actions">
              <button className="action-btn friend-btn">ADD FRIEND</button>
              <button className="action-btn message-btn">SEND MESSAGE</button>
            </div>
        }
      </div>
    </div>
  );
};

export default ProfileComponent;
