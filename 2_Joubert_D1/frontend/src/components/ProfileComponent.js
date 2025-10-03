import React from 'react';
import { Link } from 'react-router-dom';


const ProfileComponent = ({ profile, isOwnProfile, onEdit, isFriend, onAddFriend, onUnfriend }) => {
  // Fixes potential issue where joinDate might be an object if MongoDB schema is strict
  const formatDate = (date) => {
    if (date instanceof Date) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    // Fallback if date is a string (from MongoDB aggregation result)
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
    
  const buttonClass = (colorVar) => `
    terminal-button text-xs px-2 py-2 w-full text-center bg-transparent 
    text-[${colorVar}] border-[${colorVar}] hover:bg-[rgba(0,255,0,0.1)]
  `;

  return (
    <div className="flex flex-col gap-5 font-fira-code">
      
      {/* Profile Header */}
      <div className="text-center pb-3.5 border-b border-terminal-dim">
        <div className="relative inline-block mb-3.5"> 
          <img
            src={profile.profileImage || 'https://via.placeholder.com/120'}
            alt={`${profile.username} profile`}
            className="w-30 h-30 rounded-full border-2 border-terminal-border object-cover bg-terminal-input-bg"
          />

          <div className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full border-2 border-terminal-bg bg-terminal-accent"></div>
        </div>
        <h2 className="text-lg text-terminal-text mb-1.5">&gt; {profile.username}<span className="cursor animate-blink">_</span></h2>
        {profile.fullName && <p className="text-xs text-terminal-dim mb-2">{profile.fullName}</p>}
        <div className="text-[10px] text-terminal-dim">JOINED: {formatDate(profile.joinDate)}</div>
      </div>

      {/* Bio Section */}
      {profile.bio && (
        <div className="py-3.5 border-b border-terminal-dim">
          <h3 className="text-sm text-terminal-accent mb-2.5">&gt; BIO</h3>
          <p className="text-xs text-terminal-text leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Details Section */}
      <div className="py-3.5 border-b border-terminal-dim flex flex-col gap-2">
        <h3 className="text-sm text-terminal-accent mb-1">&gt; DETAILS</h3>
        {profile.location && <div className="flex flex-col"><span className="text-[10px] text-terminal-dim">LOCATION:</span> <span className="text-xs text-terminal-text">{profile.location}</span></div>}
        {profile.company && <div className="flex flex-col"><span className="text-[10px] text-terminal-dim">COMPANY:</span> <span className="text-xs text-terminal-text">{profile.company}</span></div>}
        {profile.website && <div className="flex flex-col"><span className="text-[10px] text-terminal-dim">WEBSITE:</span> <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-xs text-terminal-accent hover:underline">{profile.website}</a></div>}
        <div className="flex flex-col"><span className="text-[10px] text-terminal-dim">EMAIL:</span> <span className="text-xs text-terminal-text">{profile.email}</span></div>
      </div>

      {/* Languages Section */}
      {profile.languages?.length > 0 && (
        <div className="py-3.5 border-b border-terminal-dim">
          <h3 className="text-sm text-terminal-accent mb-2.5">&gt; LANGUAGES</h3>
          <div className="flex flex-wrap gap-2">{profile.languages.map((l,i)=><span key={i} className="bg-[rgba(0,255,0,0.1)] border border-terminal-dim text-terminal-text px-2 py-1 rounded text-[10px]">{l}</span>)}</div>
        </div>
      )}

      {/* Actions */}
      <div className="pt-3.5">
        {isOwnProfile 
          ? <button onClick={onEdit} className={`${buttonClass('var(--terminal-accent)')} edit-btn`}>EDIT PROFILE</button>
          : <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
              {isFriend ? (
                  <button onClick={onUnfriend} className={`${buttonClass('var(--terminal-error)')} friend-btn`}>UNFRIEND</button>
              ) : (
                  <button onClick={onAddFriend} className={`${buttonClass('var(--terminal-text)')} friend-btn`}>ADD FRIEND</button>
              )}
              <button className={`${buttonClass('var(--terminal-dim)')} message-btn`}>SEND MESSAGE</button>
            </div>
        }
      </div>
    </div>
  );
};

export default ProfileComponent;