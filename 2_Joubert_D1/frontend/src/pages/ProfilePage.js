import React, { useState, useEffect, useCallback } from 'react';

import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ProfileComponent from '../components/ProfileComponent';
import EditProfile from '../components/EditProfile';
import ProjectList from '../components/ProjectList';
import FriendsList from '../components/FriendsList';
import CreateProject from '../components/CreateProject';

const ProfilePage = ({ user, onLogout, onUserUpdate }) => {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [friendStatus, setFriendStatus] = useState('none');
  const [saveError, setSaveError] = useState('');

  const isOwnProfile = user?.id?.toString() === userId;

  const getValidTab = useCallback(
    (tabValue) => {
      const allowedTabs = isOwnProfile
        ? ['profile', 'projects', 'friends', 'create']
        : ['profile', 'projects', 'friends'];
      if (tabValue && allowedTabs.includes(tabValue)) {
        return tabValue;
      }
      return 'profile';
    },
    [isOwnProfile]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedTab = params.get('tab');
    const nextTab = getValidTab(requestedTab);
    setActiveTab(nextTab);
  }, [location.search, getValidTab]);

  const computeFriendStatus = useCallback(
    (viewer, profile) => {
      if (!viewer?.id || !profile?.id) {
        return 'none';
      }

      if (viewer.id.toString() === profile.id.toString()) {
        return 'self';
      }

      const viewerFriends = viewer.friends || [];
      const pending = viewer.pendingFriendRequests || [];
      const outgoing = viewer.outgoingFriendRequests || [];

      if (viewerFriends.some((friend) => friend.id === profile.id)) {
        return 'friend';
      }

      if (pending.some((request) => request.id === profile.id)) {
        return 'incoming';
      }

      if (outgoing.some((request) => request.id === profile.id)) {
        return 'pending';
      }

      return 'none';
    },
    []
  );

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
        const params = new URLSearchParams();
        if (user?.id) {
            params.set('viewerId', user.id);
        }
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`/api/users/${userId}${query}`);
        const data = await response.json();
        if (data.success) {
            setProfileUser(data.profile);
            setFriendStatus(computeFriendStatus(user, data.profile));
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

  useEffect(() => {
    if (profileUser) {
      setFriendStatus(computeFriendStatus(user, profileUser));
    }
  }, [user, profileUser, computeFriendStatus]);

  const handleEditToggle = () => {
    setSaveError('');
    setIsEditing(prev => !prev);
  };

  const handleTabChange = (tab) => {
    const nextTab = getValidTab(tab);
    setActiveTab(nextTab);

    const params = new URLSearchParams(location.search);
    if (nextTab === 'profile') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }

    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true }
    );
  };

  const handleProfileUpdate = async (updatedData) => {
    setSaveError('');

    const targetId = profileUser?.id || user?.id;
    if (!targetId) {
      setSaveError('Unable to determine which profile to update.');
      return;
    }

    try {
        const response = await fetch(`/api/users/${targetId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),
        });
        const data = await response.json();

        if (response.ok && data.success) {
            const viewerUpdate =
              isOwnProfile && data.profile
                ? { ...user, ...data.profile }
                : user;

            setProfileUser(data.profile);
            setIsEditing(false);

            if (isOwnProfile && data.profile && onUserUpdate && user) {
              onUserUpdate(viewerUpdate);
            }

            setFriendStatus(computeFriendStatus(viewerUpdate, data.profile));
        } else {
            setSaveError(data.message || 'Unable to save profile changes.');
        }
    } catch (error) {
        setSaveError('Network error during profile update. Please try again.');
    }
  };

  const syncFriendData = (updatedUserPayload, updatedProfilePayload) => {
    if (updatedProfilePayload) {
      setProfileUser(updatedProfilePayload);
    }

    if (updatedUserPayload && onUserUpdate) {
      onUserUpdate(updatedUserPayload);
    }

    const viewer = updatedUserPayload || user;
    const profile = updatedProfilePayload || profileUser;
    if (viewer && profile) {
      setFriendStatus(computeFriendStatus(viewer, profile));
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: user.id }),
      });
      const data = await response.json();
      if (data.success) {
        syncFriendData(data.user, data.profile);
        alert('Friend request sent.');
      } else {
        alert('Failed to send request: ' + data.message);
      }
    } catch (error) {
      alert('Network error sending friend request.');
    }
  };

  const handleAcceptFriendRequest = async () => {
    try {
      const response = await fetch(`/api/users/${user.id}/friend-requests/${profileUser.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        syncFriendData(data.user, data.profile);
        alert('Friend request accepted.');
      } else {
        alert('Failed to accept request: ' + data.message);
      }
    } catch (error) {
      alert('Network error accepting friend request.');
    }
  };

  const handleDeclineFriendRequest = async () => {
    try {
      const response = await fetch(`/api/users/${user.id}/friend-requests/${profileUser.id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        syncFriendData(data.user, data.profile);
        alert('Friend request declined.');
      } else {
        alert('Failed to decline request: ' + data.message);
      }
    } catch (error) {
      alert('Network error declining friend request.');
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
        syncFriendData(data.user, data.profile);
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
                errorMessage={saveError}
              />
            ) : (
              <ProfileComponent
                profile={profileUser}
                isOwnProfile={isOwnProfile}
                onEdit={handleEditToggle}
                friendStatus={friendStatus}
                onSendFriendRequest={handleSendFriendRequest}
                onUnfriend={handleUnfriend}
                onAcceptFriend={handleAcceptFriendRequest}
                onDeclineFriend={handleDeclineFriendRequest}
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
                    onClick={() => handleTabChange(tab)}
                  >
                    &gt; {tab.toUpperCase()}
                  </button>
                )
              ))}
            </div>

            <div className="p-5 flex-1 relative">
              {activeTab === 'profile' && (
                <div className="animate-fade-in">
                  <h3 className="text-sm font-bold text-terminal-accent mb-4">RECENT_ACTIVITY</h3>
                  <div className="flex flex-col gap-3">
                    {profileUser.projects?.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        className="flex gap-4 p-2.5 bg-[rgba(0,17,0,0.3)] border border-terminal-dim rounded font-fira-code text-xs"
                      >
                        <span className="text-terminal-dim min-w-[80px]">{p.lastActivity}</span>
                        <span className="text-terminal-text">{p.name}</span>
                      </div>
                    ))}
                    {(!profileUser.projects || profileUser.projects.length === 0) && (
                      <div className="text-terminal-dim text-xs font-fira-code">
                        No recent project activity recorded.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'projects' && (
                <div key="projects" className="animate-fade-in">
                  {profileUser.relation === 'restricted' ? (
                    <div className="text-terminal-dim text-xs font-fira-code">
                      Projects are private until you connect with this user.
                    </div>
                  ) : (
                    <ProjectList projects={profileUser.projects} isOwnProfile={isOwnProfile} />
                  )}
                </div>
              )}

              {activeTab === 'friends' && (
                <div key="friends" className="animate-fade-in">
                  {profileUser.relation === 'restricted' ? (
                    <div className="text-terminal-dim text-xs font-fira-code">
                      Add this user to view their network.
                    </div>
                  ) : (
                    <FriendsList friends={profileUser.friends} isOwnProfile={isOwnProfile} />
                  )}
                </div>
              )}

              {activeTab === 'create' && isOwnProfile && (
                <div key="create" className="animate-fade-in">
                  <CreateProject
                    user={user}
                    onProjectCreated={() => {
                      handleTabChange('projects');
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

