import React from 'react';
import { Link } from 'react-router-dom';

const FriendsList = ({ friends, isOwnProfile }) => {
  return (
    <div className="friends-list">
      <h3 className="list-title">
        &gt; {isOwnProfile ? 'MY_NETWORK' : 'USER_NETWORK'}
        <span className="cursor">_</span>
      </h3>
      
      {friends.length === 0 ? (
        <div className="empty-state">
          <p>No connections found</p>
          {isOwnProfile && (
            <p className="help-text">Connect with other developers to expand your network!</p>
          )}
        </div>
      ) : (
        <div className="friends-grid">
          {friends.map(friend => (
            <div key={friend.id} className="friend-card">
              <img 
                src={friend.profileImage || '/assets/images/profile-default.png'} 
                alt={`${friend.username} profile`}
                className="friend-avatar"
              />
              <div className="friend-info">
                <Link to={`/profile/${friend.id}`} className="friend-name">
                  {friend.username}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendsList;