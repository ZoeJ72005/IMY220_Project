import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ProjectComponent from '../components/ProjectComponent';
import FilesComponent from '../components/FilesComponent';
import MessagesComponent from '../components/MessagesComponent';
import EditProject from '../components/EditProject';
// No external CSS import needed

const ProjectPage = ({ user, onLogout }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');

  const fetchProject = useCallback(async () => {
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
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const isOwner = project && project.owner?.id === user.id;
  const isMember = project && project.members?.some(member => member.id === user.id);
  const isCheckedOutByUser = project && project.checkedOutBy?.id === user.id;

  const handleEditToggle = () => setIsEditing(prev => !prev);
  
  const handleProjectUpdate = async (updatedData) => {
    try {
        const response = await fetch(`/api/projects/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData),
        });
        const data = await response.json();
        if (data.success) {
            setProject(data.project);
            setIsEditing(false);
        } else {
            console.error('Error updating project:', data.message);
        }
    } catch (error) {
        console.error('Network error during project update:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('WARNING: Are you sure you want to delete this project? This action is permanent.')) {
        try {
            const response = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                alert('Project deleted successfully.');
                navigate('/home'); 
            } else {
                alert('Error deleting project: ' + data.message);
            }
        } catch (error) {
            alert('Network error during project deletion.');
        }
    }
  };

  const handleCheckout = async () => {
    try {
        const response = await fetch(`/api/projects/${project.id}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
        });
        const data = await response.json();
        if (data.success) {
            alert('Project checked out successfully.');
            if (data.project) {
              setProject(data.project);
            } else {
              fetchProject();
            }
        } else {
            alert('Checkout failed: ' + data.message);
        }
    } catch (error) {
        alert('Network error during checkout.');
    }
  };

  const handleCheckin = async () => {
    if (!checkoutMessage) {
      alert('Please provide a check-in message describing your changes.');
      return;
    }
    try {
        const response = await fetch(`/api/projects/${project.id}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, message: checkoutMessage }),
        });
        const data = await response.json();
        if (data.success) {
            alert('Project checked in successfully.');
            setCheckoutMessage('');
            if (data.project) {
              setProject(data.project);
            } else {
              fetchProject();
            }
            setActiveTab('activity'); // View new activity
        } else {
            alert('Check-in failed: ' + data.message);
        }
    } catch (error) {
        alert('Network error during check-in.');
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json();
      if (data.success) {
        if (data.project) {
          setProject(data.project);
        }
        alert('Download recorded successfully.');
      } else {
        alert('Download failed: ' + data.message);
      }
    } catch (error) {
      alert('Network error during download.');
    }
  };

  const handleMessageAdded = (newActivity) => {
    setProject(prev => ({
      ...prev,
      activity: [newActivity, ...(prev?.activity || [])],
    }));
  };

  if (loading || !project) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <Header user={user} onLogout={onLogout} />
        <div className="text-terminal-text text-lg font-share-tech-mono">
          Loading project data<span className="cursor animate-blink">_</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-terminal-bg min-h-screen">
      <Header user={user} onLogout={onLogout} />
      
      <main className="p-5 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-5 items-start">
          {/* Project Sidebar */}
          <aside className="bg-terminal-bg border-2 border-terminal-border rounded-lg p-5 shadow-[0_0_10px_rgba(0,255,0,0.1)] sticky top-20">
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
                onDelete={handleDelete}
                onCheckout={handleCheckout}
                onCheckin={handleCheckin}
                onDownload={handleDownload}
              />
            )}
          </aside>
          
          {/* Project Main Content */}
          <div className="bg-terminal-bg border-2 border-terminal-border rounded-lg shadow-[0_0_10px_rgba(0,255,0,0.1)] min-h-[400px] flex flex-col">
            <div className="flex bg-terminal-dim border-b border-terminal-border">
              {['overview', 'files', 'activity'].map(tab => (
                <button
                  key={tab}
                  className={`px-4 py-3 font-fira-code text-xs cursor-pointer border-r border-terminal-border transition-all duration-300 ease-in-out ${activeTab === tab ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent text-terminal-text hover:bg-terminal-button-hover hover:text-terminal-accent'}`}
                  onClick={() => setActiveTab(tab)}
                >
                  &gt; {tab.toUpperCase()}
                </button>
              ))}
            </div>
            
            <div className="p-5 flex-1 relative">
              
              {/* Overview Tab */}
              <div className={`transition-opacity duration-250 ${activeTab === 'overview' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                <h2 className="text-lg font-bold mb-2 text-terminal-text">{project.name}</h2>
                <p className="text-terminal-dim mb-6">{project.description}</p>
                <div className="grid grid-cols-3 gap-5 border border-terminal-dim p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-terminal-dim">VERSION:</span>
                    <span className="text-base text-terminal-text">{project.version}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-terminal-dim">DOWNLOADS:</span>
                    <span className="text-base text-terminal-text">{project.downloads}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-terminal-dim">MEMBERS:</span>
                    <span className="text-base text-terminal-text">{project.members?.length || 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Files Tab */}
              <div className={`transition-opacity duration-250 ${activeTab === 'files' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                <FilesComponent 
                  files={project.files} 
                  canEdit={isMember}
                  checkoutStatus={project.checkoutStatus}
                />
              </div>
              
              {/* Activity Tab */}
              <div className={`transition-opacity duration-250 ${activeTab === 'activity' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                <MessagesComponent 
                  projectId={project.id}
                  messages={project.activity || []}
                  currentUser={user}
                  canAddMessage={isMember}
                  onMessageAdded={handleMessageAdded}
                />

                {isMember && project.checkoutStatus === 'checked-out' && isCheckedOutByUser && (
                    <div className="mt-8 p-4 border border-terminal-warning rounded-lg bg-terminal-input-bg">
                        <h4 className="text-terminal-warning mb-3">&gt; CHECKIN_MESSAGE:</h4>
                        <textarea
                            className="terminal-input w-full p-2 text-sm"
                            rows="2"
                            value={checkoutMessage}
                            onChange={(e) => setCheckoutMessage(e.target.value)}
                            placeholder="Describe your changes before checking in..."
                        />
                        <button 
                            onClick={handleCheckin} 
                            className="terminal-button mt-3 w-full bg-terminal-accent/20 border-terminal-accent text-terminal-accent"
                        >
                            COMMIT & CHECKIN
                        </button>
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectPage;
