import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import ProfileComponent from '../components/ProfileComponent';
import EditProfile from '../components/EditProfile';
import ProjectList from '../components/ProjectList';
import FriendsList from '../components/FriendsList';
import CreateProject from '../components/CreateProject';

const ProfilePage = ({ user, onLogout, onUserUpdate }) => {
  const { userId } = useParams();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);

  const isOwnProfile = user?.id?.toString() === userId;

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        if (data.success) {
            setProfileUser(data.profile);
            const viewerId = user?.id?.toString();
            if (viewerId) {
              const profileHasViewer = data.profile.friends.some(friend => friend.id === viewerId);
              setIsFriend(profileHasViewer);
            } else {
              setIsFriend(false);
            }
        } else {
            console.error(data.message);
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
    } finally {
        setLoading(false);
    }
  }, [userId, user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleEditToggle = () => setIsEditing(prev => !prev);

  const handleProfileUpdate = async (updatedData) => {
    try {
        const response = await fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),
        });
        const data = await response.json();

        if (data.success) {
            setProfileUser(data.profile);
            setIsEditing(false);

            if (isOwnProfile && data.profile && onUserUpdate) {
              onUserUpdate({
                ...user,
                fullName: data.profile.fullName,
                bio: data.profile.bio,
                location: data.profile.location,
                company: data.profile.company,
                website: data.profile.website,
                profileImage: data.profile.profileImage,
                languages: data.profile.languages,
              });
            }
        } else {
            console.error('Error updating profile:', data.message);
        }
    } catch (error) {
        console.error('Network error during profile update:', error);
    }
  };

  const handleAddFriend = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/friends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: user.id }),
      });
      const data = await response.json();
      if (data.success) {
        setIsFriend(true);
        if (data.profile) {
          setProfileUser(data.profile);
        }
        if (data.user && onUserUpdate) {
          onUserUpdate(data.user);
        }
        alert('Friend added successfully.');
      } else {
        alert('Failed to add friend: ' + data.message);
      }
    } catch (error) {
      alert('Network error adding friend.');
    }
  };

  const handleUnfriend = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/friends`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: user.id }),
      });
      const data = await response.json();
      if (data.success) {
        setIsFriend(false);
        if (data.profile) {
          setProfileUser(data.profile);
        }
        if (data.user && onUserUpdate) {
          onUserUpdate(data.user);
        }
        alert('Friend removed successfully.');
      } else {
        alert('Failed to remove friend: ' + data.message);
      }
    } catch (error) {
      alert('Network error removing friend.');
    }
  };

  if (loading || !profileUser) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <Header user={user} onLogout={onLogout} />
        <div className="text-terminal-text text-lg font-share-tech-mono">
          Loading user profile...<span className="cursor animate-blink">_</span>
        </div>
      </div>
    );
  }

  const tabClass = (tab) => `
    px-4 py-3 font-fira-code text-xs cursor-pointer border-r border-terminal-border transition-all duration-300 ease-in-out
    ${activeTab === tab ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent text-terminal-text hover:bg-terminal-button-hover hover:text-terminal-accent'}
  `;

  return (
    <div className="bg-terminal-bg min-h-screen">
      <Header user={user} onLogout={onLogout} />
      <main className="p-5 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-5 items-start">
          {/* Sidebar */}
          <aside className="bg-terminal-bg border-2 border-terminal-border rounded-lg p-5 shadow-[0_0_10px_rgba(0,255,0,0.1)] sticky top-20">
            {isEditing && isOwnProfile ? (
              <EditProfile
                profile={profileUser}
                onSave={handleProfileUpdate}
                onCancel={handleEditToggle}
              />
            ) : (
              <ProfileComponent
                profile={profileUser}
                isOwnProfile={isOwnProfile}
                onEdit={handleEditToggle}
                currentUser={user}
                isFriend={isFriend}
                onAddFriend={handleAddFriend}
                onUnfriend={handleUnfriend}
              />
            )}
          </aside>

          {/* Main */}
          <div className="bg-terminal-bg border-2 border-terminal-border rounded-lg shadow-[0_0_10px_rgba(0,255,0,0.1)] min-h-[400px] flex flex-col">
            <div className="flex bg-terminal-dim border-b border-terminal-border">
              {['profile', 'projects', 'friends', 'create'].map(tab => (
                (tab !== 'create' || isOwnProfile) && (
                  <button
                    key={tab}
                    className={tabClass(tab)}
                    onClick={() => setActiveTab(tab)}
                  >
                    &gt; {tab.toUpperCase()}
                  </button>
                )
              ))}
            </div>

            <div className="p-5 flex-1 relative">
              {/* Profile/Activity Tab */}
              <div className={`transition-opacity duration-250 ${activeTab === 'profile' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                <h3 className="text-sm font-bold text-terminal-accent mb-4">RECENT_ACTIVITY</h3>
                <div className="flex flex-col gap-3">
                  {profileUser.projects?.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex gap-4 p-2.5 bg-[rgba(0,17,0,0.3)] border border-terminal-dim rounded font-fira-code text-xs">
                      <span className="text-terminal-dim min-w-[80px]">{p.lastActivity}</span>
                      <span className="text-terminal-text">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects Tab */}
              <div className={`transition-opacity duration-250 ${activeTab === 'projects' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                <ProjectList projects={profileUser.projects} isOwnProfile={isOwnProfile} />
              </div>

              {/* Friends Tab */}
              <div className={`transition-opacity duration-250 ${activeTab === 'friends' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                <FriendsList friends={profileUser.friends} isOwnProfile={isOwnProfile} />
              </div>

              {/* Create Project Tab */}
              {isOwnProfile && (
                <div className={`transition-opacity duration-250 ${activeTab === 'create' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                  <CreateProject 
                    user={user} 
                    onProjectCreated={() => {
                      setActiveTab('projects');
                      fetchProfile();
                    }} 
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
