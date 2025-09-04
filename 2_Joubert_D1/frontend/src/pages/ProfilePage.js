import React, { useState, useEffect } from 'react';
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

  // Dummy profile data
  const dummyProfile = {
    id: parseInt(userId),
    username: isOwnProfile ? user.username : 'code_master',
    email: isOwnProfile ? user.email : 'master@terminal.dev',
    fullName: 'Terminal Code Master',
    bio: 'Full-stack developer passionate about retro computing and terminal interfaces',
    location: 'Cyberspace',
    joinDate: '2023-01-15',
    website: 'https://terminal-dev.io',
    company: 'Terminal Labs',
    //profileImage: '/assets/images/profile-default.png',
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
      {
        id: 1,
        name: 'terminal-ui-framework',
        description: 'A retro terminal-style UI framework',
        role: 'owner',
        lastActivity: '2 hours ago'
      },
      {
        id: 2,
        name: 'crypto-hash-validator',
        description: 'Terminal-based cryptocurrency hash validation tool',
        role: 'contributor',
        lastActivity: '1 day ago'
      }
    ]
  };

useEffect(() => {
  setLoading(true);
  // Only set dummy data if userId changes
  const timer = setTimeout(() => {
    setProfileUser(dummyProfile);
    setLoading(false);
  }, 500);

  return () => clearTimeout(timer);
  // Only run when userId changes
}, [userId]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleProfileUpdate = (updatedData) => {
    setProfileUser(prev => ({ ...prev, ...updatedData }));
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="profile-page">
        <Header user={user} onLogout={onLogout} />
        <div className="loading-container">
          <div className="loading-text">
            Loading user profile<span className="cursor">_</span>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="profile-page">
        <Header user={user} onLogout={onLogout} />
        <div className="error-container">
          <div className="error-text">
            ERROR: User profile not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Header user={user} onLogout={onLogout} />
      
      <main className="profile-content">
        <div className="profile-container">
          <div className="profile-sidebar">
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
          </div>
          
          <div className="profile-main">
            <div className="profile-tabs">
              <button
                className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                &gt; OVERVIEW
              </button>
              <button
                className={`tab-button ${activeTab === 'projects' ? 'active' : ''}`}
                onClick={() => setActiveTab('projects')}
              >
                &gt; PROJECTS
              </button>
              <button
                className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
                onClick={() => setActiveTab('friends')}
              >
                &gt; NETWORK
              </button>
              {isOwnProfile && (
                <button
                  className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
                  onClick={() => setActiveTab('create')}
                >
                  &gt; CREATE_PROJECT
                </button>
              )}
            </div>
            
            <div className="tab-content">
              {activeTab === 'profile' && (
                <div className="overview-content">
                  <div className="activity-section">
                    <h3 className="section-title">&gt; RECENT_ACTIVITY</h3>
                    <div className="activity-feed">
                      <div className="activity-item">
                        <span className="activity-time">2 hours ago</span>
                        <span className="activity-text">Checked in to terminal-ui-framework</span>
                      </div>
                      <div className="activity-item">
                        <span className="activity-time">1 day ago</span>
                        <span className="activity-text">Created new project: retro-game-engine</span>
                      </div>
                      <div className="activity-item">
                        <span className="activity-time">3 days ago</span>
                        <span className="activity-text">Added friend: crypto_dev</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="stats-section">
                    <h3 className="section-title">&gt; STATISTICS</h3>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-value">{profileUser.stats.projects}</div>
                        <div className="stat-label">PROJECTS</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{profileUser.stats.commits}</div>
                        <div className="stat-label">COMMITS</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{profileUser.stats.friends}</div>
                        <div className="stat-label">CONNECTIONS</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{profileUser.stats.downloads}</div>
                        <div className="stat-label">DOWNLOADS</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'projects' && (
                <ProjectList 
                  projects={profileUser.projects} 
                  isOwnProfile={isOwnProfile}
                />
              )}
              
              {activeTab === 'friends' && (
                <FriendsList 
                  friends={profileUser.friends} 
                  isOwnProfile={isOwnProfile}
                />
              )}
              
              {activeTab === 'create' && isOwnProfile && (
                <CreateProject 
                  user={user}
                  onProjectCreated={() => setActiveTab('projects')}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;