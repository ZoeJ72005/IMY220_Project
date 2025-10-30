import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/FriendsList.css';
import { resolveProfileImage } from '../utils/avatar';

const FriendsList = ({ friends, isOwnProfile }) => {
  return (
    <section className="friends-list" aria-live="polite">
      <header className="friends-list__header">
        <h3 className="friends-list__title">
          &gt; {isOwnProfile ? 'My Network' : 'User Network'}
          <span className="friends-list__cursor">_</span>
        </h3>
        <p className="friends-list__subtitle">
          Stay connected with developers collaborating on your projects.
        </p>
      </header>

      {friends.length === 0 ? (
        <div className="friends-list__empty">
          <p>No connections found yet.</p>
          {isOwnProfile && (
            <p>Send a connection request to start building your network.</p>
          )}
        </div>
      ) : (
        <div className="friends-list__grid">
          {friends.map((friend) => (
            <article key={friend.id} className="friends-list__card">
              <div className="friends-list__avatar-wrapper">
                <img
                  src={resolveProfileImage(friend.profileImage, friend.id || friend.username, 96)}
                  alt={`${friend.username} profile`}
                  className="friends-list__avatar"
                />
              </div>
              <h4 className="friends-list__name">
                <Link to={`/profile/${friend.id}`} className="friends-list__link">
                  {friend.username}
                </Link>
              </h4>
              {friend.fullName && <p className="friends-list__meta">{friend.fullName}</p>}
              {!isOwnProfile && (
                <button type="button" className="friends-list__action">
                  Connect
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default FriendsList;
