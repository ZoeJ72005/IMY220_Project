import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import ProfileComponent from '../components/ProfileComponent';
import EditProfile from '../components/EditProfile';
import ProjectList from '../components/ProjectList';
import FriendsList from '../components/FriendsList';
import CreateProject from '../components/CreateProject';
import '../styles/ProfilePage.css';

const ProfilePage = ({ user, onLogout }) => {
  const { userId } = useParams();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);

  const isOwnProfile = user.id.toString() === userId;

  useEffect(() => {
    const fetchProfile = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/users/${userId}`);
            const data = await response.json();
            if (data.success) {
                setProfileUser(data.profile);
            } else {
                console.error(data.message);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    fetchProfile();
  }, [userId]);

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
        } else {
            console.error('Error updating profile:', data.message);
        }
    } catch (error) {
        console.error('Network error during profile update:', error);
    }
  };

  if (loading || !profileUser) {
    return (
      <div className="profile-page">
        <Header user={user} onLogout={onLogout} />
        <div className="loading-container">Loading user profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Header user={user} onLogout={onLogout} />
      <main className="profile-content">
        <div className="profile-container">
          {/* Sidebar */}
          <aside className="profile-sidebar">
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
              />
            )}
          </aside>

          {/* Main */}
          <div className="profile-main">
            <div className="profile-tabs">
              {['profile', 'projects', 'friends', 'create'].map(tab => (
                (tab !== 'create' || isOwnProfile) && (
                  <button
                    key={tab}
                    className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.toUpperCase()}
                  </button>
                )
              ))}
            </div>

            <div className="tab-content">
              {/* Keep all panels mounted, just toggle visibility */}
              <div className={`tab-panel ${activeTab === 'profile' ? 'visible' : 'hidden'}`}>
                <h3 className="section-title">Recent Activity</h3>
                <div className="activity-feed">
                  {profileUser.projects.slice(0, 3).map(p => (
                    <div key={p.id} className="activity-item">
                      <span className="activity-time">{p.lastActivity}</span>
                      <span className="activity-text">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`tab-panel ${activeTab === 'projects' ? 'visible' : 'hidden'}`}>
                <ProjectList projects={profileUser.projects} isOwnProfile={isOwnProfile} />
              </div>

              <div className={`tab-panel ${activeTab === 'friends' ? 'visible' : 'hidden'}`}>
                <FriendsList friends={profileUser.friends} isOwnProfile={isOwnProfile} />
              </div>

              {isOwnProfile && (
                <div className={`tab-panel ${activeTab === 'create' ? 'visible' : 'hidden'}`}>
                  <CreateProject user={user} onProjectCreated={() => setActiveTab('projects')} />
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