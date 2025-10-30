import React, { useMemo } from 'react';
import '../styles/ProfileComponent.css';
import { resolveProfileImage } from '../utils/avatar';

const ProfileComponent = ({
  profile,
  isOwnProfile,
  onEdit,
  friendStatus,
  onSendFriendRequest,
  onUnfriend,
  onAcceptFriend,
  onDeclineFriend,
}) => {
  const relation = profile?.relation || (isOwnProfile ? 'self' : 'friend');
  const isRestricted = relation === 'restricted';
  const friendCount = profile?.friendCount ?? profile?.friends?.length ?? 0;

  const avatarUrl = useMemo(
    () => resolveProfileImage(profile?.profileImage, profile?.id || profile?.username, 120),
    [profile?.profileImage, profile?.id, profile?.username]
  );

  const formatDate = (date) => {
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderActions = () => {
    if (isOwnProfile) {
      return (
        <button type="button" className="profile-component__action profile-component__action--primary" onClick={onEdit}>
          Edit Profile
        </button>
      );
    }

    switch (friendStatus) {
      case 'friend':
        return (
          <button
            type="button"
            className="profile-component__action profile-component__action--danger"
            onClick={onUnfriend}
          >
            Unfriend
          </button>
        );
      case 'incoming':
        return (
          <div className="profile-component__action-group">
            <button
              type="button"
              className="profile-component__action profile-component__action--primary"
              onClick={onAcceptFriend}
            >
              Accept Request
            </button>
            <button
              type="button"
              className="profile-component__action profile-component__action--danger"
              onClick={onDeclineFriend}
            >
              Decline
            </button>
          </div>
        );
      case 'pending':
        return (
          <button type="button" className="profile-component__action profile-component__action--disabled" disabled>
            Request Sent
          </button>
        );
      default:
        return (
          <button
            type="button"
            className="profile-component__action profile-component__action--secondary"
            onClick={onSendFriendRequest}
          >
            Connect
          </button>
        );
    }
  };

  return (
    <section className="profile-component">
      <header className="profile-component__header">
        <div className="profile-component__avatar-wrapper">
          <img src={avatarUrl} alt={`${profile.username} profile`} className="profile-component__avatar" />
          <span className="profile-component__status-indicator" aria-hidden="true" />
        </div>
        <div className="profile-component__headline">
          <h2 className="profile-component__username">
            &gt; {profile.username}
            <span className="profile-component__cursor">_</span>
            {profile.verified && <span className="profile-component__badge">VERIFIED</span>}
          </h2>
          {profile.fullName && <p className="profile-component__name">{profile.fullName}</p>}
          <p className="profile-component__subtext">Joined: {formatDate(profile.joinDate)}</p>
        </div>
      </header>

      {profile.bio && (
        <section className="profile-component__card">
          <h3 className="profile-component__card-title">&gt; Bio</h3>
          <p className="profile-component__card-content">{profile.bio}</p>
        </section>
      )}

      <section className="profile-component__card profile-component__card--grid">
        <h3 className="profile-component__card-title">&gt; Details</h3>
        {isRestricted ? (
          <>
            <dl className="profile-component__details">
              <div className="profile-component__details-row">
                <dt>Friends</dt>
                <dd>{friendCount}</dd>
              </div>
            </dl>
            <p className="profile-component__restricted-note">
              Connect with this user to unlock their full profile details.
            </p>
          </>
        ) : (
          <dl className="profile-component__details">
            {profile.location && (
              <div className="profile-component__details-row">
                <dt>Location</dt>
                <dd>{profile.location}</dd>
              </div>
            )}
            {profile.company && (
              <div className="profile-component__details-row">
                <dt>Company</dt>
                <dd>{profile.company}</dd>
              </div>
            )}
            {profile.website && (
              <div className="profile-component__details-row">
                <dt>Website</dt>
                <dd>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    {profile.website}
                  </a>
                </dd>
              </div>
            )}
            {profile.email && (
              <div className="profile-component__details-row">
                <dt>Email</dt>
                <dd>{profile.email}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      {profile.languages?.length > 0 && (
        <section className="profile-component__card">
          <h3 className="profile-component__card-title">&gt; Languages</h3>
          <div className="profile-component__tags">
            {profile.languages.map((language, index) => (
              <span key={index} className="profile-component__tag">
                {language}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="profile-component__card">
        <h3 className="profile-component__card-title">&gt; Actions</h3>
        {renderActions()}
      </section>
    </section>
  );
};

export default ProfileComponent;
