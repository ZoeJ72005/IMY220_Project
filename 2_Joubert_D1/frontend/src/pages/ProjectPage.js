import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import ProjectComponent from '../components/ProjectComponent';
import FilesComponent from '../components/FilesComponent';
import MessagesComponent from '../components/MessagesComponent';
import EditProject from '../components/EditProject';

const ProjectPage = ({ user, onLogout }) => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);

  // Dummy project data
  const dummyProject = {
    id: parseInt(projectId),
    name: "terminal-ui-framework",
    description: "A retro terminal-style UI framework built with React and CSS",
    owner: "code_master",
    tags: ["javascript", "react", "css", "framework"],
    type: "web-application",
    version: "v2.1.0",
    createdDate: "2023-01-15",
    lastActivity: "2 hours ago",
    checkoutStatus: "checked-in",
    checkedOutBy: null,
    members: ["code_master", "terminal_user", "ui_designer"],
    downloads: 127,
    image: "/assets/images/project1.png",
    files: [
      { id: 1, name: "package.json", size: "2.3 KB", modified: "2 hours ago" },
      { id: 2, name: "src/App.js", size: "15.7 KB", modified: "3 hours ago" },
      { id: 3, name: "src/styles/terminal.css", size: "8.9 KB", modified: "1 day ago" },
      { id: 4, name: "README.md", size: "4.2 KB", modified: "2 days ago" }
    ],
    messages: [
      { id: 1, user: "code_master", action: "checked-in", message: "Added responsive design features", time: "2 hours ago" },
      { id: 2, user: "terminal_user", action: "checked-out", message: "Working on mobile layout improvements", time: "4 hours ago" },
      { id: 3, user: "ui_designer", action: "checked-in", message: "Updated color scheme and typography", time: "1 day ago" }
    ]
  };

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setProject(dummyProject);
      setLoading(false);
    }, 500);
  }, [projectId]);

  const isOwner = project && project.owner === user.username;
  const isMember = project && (project.members.includes(user.username) || isOwner);

  if (loading) {
    return (
      <div className="project-page">
        <Header user={user} onLogout={onLogout} />
        <div className="loading-container">
          <div className="loading-text">
            Loading project data<span className="cursor">_</span>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-page">
        <Header user={user} onLogout={onLogout} />
        <div className="error-container">
          <div className="error-text">
            ERROR: Project not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="project-page">
      <Header user={user} onLogout={onLogout} />
      
      <main className="project-content">
        <div className="project-container">
          <div className="project-sidebar">
            {isEditing && isOwner ? (
              <EditProject
                project={project}
                onSave={(updatedData) => {
                  setProject(prev => ({ ...prev, ...updatedData }));
                  setIsEditing(false);
                }}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <ProjectComponent
                project={project}
                isOwner={isOwner}
                isMember={isMember}
                currentUser={user}
                onEdit={() => setIsEditing(true)}
              />
            )}
          </div>
          
          <div className="project-main">
            <div className="project-tabs">
              <button
                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                &gt; OVERVIEW
              </button>
              <button
                className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
                onClick={() => setActiveTab('files')}
              >
                &gt; FILES
              </button>
              <button
                className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                &gt; ACTIVITY
              </button>
            </div>
            
            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-content">
                  <h2 className="project-title">{project.name}</h2>
                  <p className="project-description">{project.description}</p>
                  <div className="project-stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">VERSION:</span>
                      <span className="stat-value">{project.version}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">DOWNLOADS:</span>
                      <span className="stat-value">{project.downloads}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">MEMBERS:</span>
                      <span className="stat-value">{project.members.length}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'files' && (
                <FilesComponent 
                  files={project.files} 
                  canEdit={isMember}
                  checkoutStatus={project.checkoutStatus}
                />
              )}
              
              {activeTab === 'activity' && (
                <MessagesComponent 
                  messages={project.messages}
                  canAddMessage={isMember}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectPage;