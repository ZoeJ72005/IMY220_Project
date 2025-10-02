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

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        const data = await response.json();
        if (data.success) {
          setProject(data.project);
        } else {
          console.error(data.message);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [projectId]);

  const isOwner = project && project.owner === user.username;
  const isMember = project && project.members.includes(user.username);

  if (loading || !project) {
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

  const handleEditToggle = () => setIsEditing(prev => !prev);
  
  const handleProjectUpdate = async (updatedData) => {
    try {
        const response = await fetch(`/api/projects/${project.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),
        });
        const data = await response.json();

        if (data.success) {
            setProject(prev => ({ ...prev, ...updatedData }));
            setIsEditing(false);
        } else {
            console.error('Error updating project:', data.message);
        }
    } catch (error) {
        console.error('Network error during project update:', error);
    }
  };


  return (
    <div className="project-page">
      <Header user={user} onLogout={onLogout} />
      
      <main className="project-content">
        <div className="project-container">
          <div className="project-sidebar">
            {isEditing && isOwner ? (
              <EditProject
                project={project}
                onSave={handleProjectUpdate}
                onCancel={handleEditToggle}
              />
            ) : (
              <ProjectComponent
                project={project}
                isOwner={isOwner}
                isMember={isMember}
                currentUser={user}
                onEdit={handleEditToggle}
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
                  messages={project.activity}
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