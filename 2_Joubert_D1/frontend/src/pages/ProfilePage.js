import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import ProfileComponent from '../components/ProfileComponent';
import EditProfile from '../components/EditProfile';
import ProjectList from '../components/ProjectList';
import FriendsList from '../components/FriendsList';
import CreateProject from '../components/CreateProject';
import './ProfilePage.css';

const ProfilePage = ({ user, onLogout }) => {
  const { userId } = useParams();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);

  const isOwnProfile = user.id.toString() === userId;

  // Make dummy profile stable using useMemo
  const dummyProfile = useMemo(() => ({
    id: parseInt(userId),
    username: isOwnProfile ? user.username : 'code_master',
    email: isOwnProfile ? user.email : 'master@terminal.dev',
    fullName: 'Terminal Code Master',
    bio: 'Full-stack developer passionate about retro computing and terminal interfaces',
    location: 'Cyberspace',
    joinDate: '2023-01-15',
    website: 'https://terminal-dev.io',
    company: 'Terminal Labs',
    profileImage: '/assets/images/profile-default.png',
    stats: {
      projects: 12,
      commits: 256,
      friends: 42,
      downloads: 1337
    },
    languages: ['JavaScript', 'Python', 'C++', 'Rust', 'Shell'],
    friends: [
      { id: 2, username: 'crypto_dev', profileImage: '/assets/images/profile2.png' },
      { id: 3, username: 'game_wizard', profileImage: '/assets/images/profile3.png' },
      { id: 4, username: 'data_ninja', profileImage: '/assets/images/profile4.png' }
    ],
    projects: [
      { id: 1, name: 'terminal-ui-framework', description: 'A retro terminal-style UI framework', role: 'owner', lastActivity: '2 hours ago' },
      { id: 2, name: 'crypto-hash-validator', description: 'Terminal-based cryptocurrency hash validation tool', role: 'contributor', lastActivity: '1 day ago' }
    ]
  }), [user, userId, isOwnProfile]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setProfileUser(dummyProfile);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [dummyProfile]);

  const handleEditToggle = () => setIsEditing(prev => !prev);

  const handleProfileUpdate = (updatedData) => {
    setProfileUser(prev => ({ ...prev, ...updatedData }));
    setIsEditing(false);
  };

  if (loading) {
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
