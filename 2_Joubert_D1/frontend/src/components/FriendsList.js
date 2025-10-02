import React from 'react';
import { Link } from 'react-router-dom';

const FriendsList = ({ friends, isOwnProfile }) => {
  return (
    <div className="font-fira-code">
      <h3 className="text-base font-bold text-terminal-accent mb-4 border-b border-terminal-dim pb-2">
        &gt; {isOwnProfile ? 'MY_NETWORK' : 'USER_NETWORK'}
        <span className="cursor animate-blink">_</span>
      </h3>
      
      {friends.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed border-terminal-dim rounded-lg text-terminal-text">
          <p>No connections found</p>
          {isOwnProfile && (
            <p className="text-xs text-terminal-dim mt-2">Connect with other developers to expand your network!</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {friends.map(friend => (
            <div key={friend.id} className="p-3 border border-terminal-dim rounded-lg bg-[rgba(0,17,0,0.3)] flex flex-col items-center text-center transition-all duration-300 hover:border-terminal-accent hover:shadow-[0_0_10px_rgba(0,255,0,0.2)]">
              <img 
                src={friend.profileImage || 'https://via.placeholder.com/80'} 
                alt={`${friend.username} profile`}
                className="w-16 h-16 rounded-full object-cover mb-2 border border-terminal-text"
              />
              <div className="text-sm font-bold">
                <Link to={`/profile/${friend.id}`} className="text-terminal-text hover:text-terminal-accent no-underline">
                  {friend.username}
                </Link>
              </div>
              {!isOwnProfile && (
                 <button className="terminal-button mt-2 text-[10px] py-1 px-2 border-terminal-dim text-terminal-dim">
                    CONNECT
                 </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendsList;
