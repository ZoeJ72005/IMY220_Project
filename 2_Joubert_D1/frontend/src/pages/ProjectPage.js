import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ProjectComponent from '../components/ProjectComponent';
import FilesComponent from '../components/FilesComponent';
import MessagesComponent from '../components/MessagesComponent';
import EditProject from '../components/EditProject';

const ProjectPage = ({ user, onLogout }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    message: '',
    version: '',
    files: [],
  });
  const [checkinFileInputKey, setCheckinFileInputKey] = useState(0);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      if (data.success) {
        setProject(data.project);
      } else {
        setError(data.message || 'Unable to load project.');
      }
    } catch (fetchError) {
      setError('Network error while loading project.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (project?.version) {
      setCheckinForm((prev) => ({
        ...prev,
        version: project.version,
      }));
    }
  }, [project?.version]);

  const isOwner = project?.owner?.id === user.id;
  const isMember = project?.members?.some((member) => member.id === user.id);
  const isCheckedOutByUser =
    project?.checkoutStatus === 'checked-out' && project?.checkedOutBy?.id === user.id;

  const availableFriends = useMemo(() => {
    if (!project) return [];
    const memberIds = new Set(project.members?.map((member) => member.id));
    return (user.friends || []).filter((friend) => !memberIds.has(friend.id));
  }, [project, user.friends]);

  const updateProjectState = (updatedProject) => {
    setProject(updatedProject);
    setError('');
  };

  const handleEditToggle = () => setIsEditing((prev) => !prev);

  const handleProjectUpdate = async (formData) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        body: formData,
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update project.');
      }
      updateProjectState(data.project);
      setIsEditing(false);
    } catch (updateError) {
      alert(updateError.message || 'Unable to update project.');
      throw updateError;
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        'WARNING: Are you sure you want to delete this project? This action is permanent.'
      )
    ) {
      try {
        const response = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
          navigate('/home');
        } else {
          alert(data.message || 'Unable to delete project.');
        }
      } catch (deleteError) {
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
        updateProjectState(data.project);
        alert('Project checked out successfully.');
      } else {
        alert(data.message || 'Checkout failed.');
      }
    } catch (checkoutError) {
      alert('Network error during checkout.');
    }
  };

  const handleCheckinFilesChange = (event) => {
    setCheckinForm((prev) => ({
      ...prev,
      files: Array.from(event.target.files || []),
    }));
  };

  const handleCheckin = async () => {
    if (!checkinForm.message.trim()) {
      alert('Please provide a check-in message describing your changes.');
      return;
    }

    if (!checkinForm.version.trim()) {
      alert('Please provide the new project version.');
      return;
    }

    const payload = new FormData();
    payload.append('userId', user.id);
    payload.append('message', checkinForm.message.trim());
    payload.append('version', checkinForm.version.trim());
    checkinForm.files.forEach((file) => payload.append('projectFiles', file));

    try {
      const response = await fetch(`/api/projects/${project.id}/checkin`, {
        method: 'POST',
        body: payload,
      });
      const data = await response.json();
      if (data.success) {
        updateProjectState(data.project);
        setCheckinForm({
          message: '',
          version: data.project.version || checkinForm.version.trim(),
          files: [],
        });
        setCheckinFileInputKey((prev) => prev + 1);
        setActiveTab('activity');
        alert('Project checked in successfully.');
      } else {
        alert(data.message || 'Check-in failed.');
      }
    } catch (checkinError) {
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
        updateProjectState(data.project);
        alert('Download recorded. Use the file list to download individual files.');
      } else {
        alert(data.message || 'Unable to record download.');
      }
    } catch (downloadError) {
      alert('Network error during download.');
    }
  };

  const handleMessageAdded = (activity) => {
    setProject((prev) => ({
      ...prev,
      activity: [activity, ...(prev?.activity || [])],
    }));
  };

  const handleAddMember = async (friendId) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user.id,
          friendId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        updateProjectState(data.project);
        alert('Member added successfully.');
      } else {
        alert(data.message || 'Unable to add member.');
      }
    } catch (addError) {
      alert('Network error while adding member.');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from the project?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${project.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: user.id }),
      });
      const data = await response.json();
      if (data.success) {
        updateProjectState(data.project);
        alert('Member removed successfully.');
      } else {
        alert(data.message || 'Unable to remove member.');
      }
    } catch (removeError) {
      alert('Network error while removing member.');
    }
  };

  const handleTransferOwnership = async (newOwnerId) => {
    if (!window.confirm('Transfer ownership to this member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${project.id}/transfer-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user.id,
          newOwnerId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        updateProjectState(data.project);
        alert('Ownership transferred successfully.');
      } else {
        alert(data.message || 'Unable to transfer ownership.');
      }
    } catch (transferError) {
      alert('Network error while transferring ownership.');
    }
  };

  const handleTagNavigate = (tag) => {
    if (!tag) return;
    navigate(`/search?term=${encodeURIComponent(tag)}&type=tags`);
  };

  const toggleImageModal = () => setIsImageModalOpen((prev) => !prev);

  if (loading) {
    return (
      <div className="bg-terminal-bg min-h-screen">
        <Header user={user} onLogout={onLogout} />
        <div className="flex items-center justify-center mt-32">
          <div className="text-terminal-text text-lg font-share-tech-mono">
            Loading project data<span className="cursor animate-blink">_</span>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-terminal-bg min-h-screen">
        <Header user={user} onLogout={onLogout} />
        <div className="flex items-center justify-center mt-32">
          <div className="text-terminal-error text-lg font-share-tech-mono">
            {error || 'Project not found.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-terminal-bg min-h-screen">
      <Header user={user} onLogout={onLogout} />

      <main className="p-5 max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 border border-terminal-error text-terminal-error text-sm p-3 font-fira-code">
            ERROR: {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">
          <aside className="bg-terminal-bg border-2 border-terminal-border rounded-lg p-5 shadow-[0_0_10px_rgba(0,255,0,0.1)] sticky top-20">
            {isEditing && isOwner ? (
              <EditProject
                project={project}
                currentUser={user}
                onSave={handleProjectUpdate}
                onCancel={handleEditToggle}
              />
            ) : (
              <ProjectComponent
                project={project}
                isOwner={isOwner}
                isMember={isMember}
                currentUser={user}
                availableFriends={availableFriends}
                onEdit={handleEditToggle}
                onDelete={handleDelete}
                onCheckout={handleCheckout}
                onShowCheckin={() => setActiveTab('activity')}
                onDownload={handleDownload}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
                onTransferOwnership={handleTransferOwnership}
                onTagClick={handleTagNavigate}
                onImageClick={project.imageUrl ? toggleImageModal : undefined}
              />
            )}
          </aside>

          <div className="bg-terminal-bg border-2 border-terminal-border rounded-lg shadow-[0_0_10px_rgba(0,255,0,0.1)] min-h-[400px] flex flex-col">
            <div className="flex bg-terminal-dim border-b border-terminal-border">
              {['overview', 'files', 'activity'].map((tab) => (
                <button
                  key={tab}
                  className={`px-4 py-3 font-fira-code text-xs cursor-pointer border-r border-terminal-border transition-all duration-300 ease-in-out ${
                    activeTab === tab
                      ? 'bg-terminal-text text-terminal-bg'
                      : 'bg-transparent text-terminal-text hover:bg-terminal-button-hover hover:text-terminal-accent'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  &gt; {tab.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="p-5 flex-1 relative">
              <div
                className={`transition-opacity duration-250 ${
                  activeTab === 'overview' ? 'opacity-100 block' : 'opacity-0 hidden'
                }`}
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {project.imageUrl && (
                    <div className="max-w-xs flex-shrink-0">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={toggleImageModal}
                        onKeyDown={(e) => e.key === 'Enter' && toggleImageModal()}
                        className="cursor-pointer border border-terminal-border rounded overflow-hidden shadow-[0_0_15px_rgba(0,255,0,0.2)]"
                      >
                        <img
                          src={project.imageUrl}
                          alt={`${project.name} cover`}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <p className="text-[11px] text-terminal-dim mt-2 text-center">
                        Click to view full-size
                      </p>
                    </div>
                  )}

                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-xl font-bold text-terminal-text mb-2">
                        {project.name}
                      </h2>
                      <p className="text-terminal-dim leading-relaxed">{project.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-terminal-dim p-4 rounded">
                      <div className="flex flex-col">
                        <span className="text-xs text-terminal-dim tracking-wide">TYPE</span>
                        <span className="text-terminal-text text-sm uppercase">
                          {project.type?.replace('-', ' ') || 'N/A'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-terminal-dim tracking-wide">VERSION</span>
                        <span className="text-terminal-text text-sm">{project.version}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-terminal-dim tracking-wide">STATUS</span>
                        <span className="text-terminal-text text-sm">
                          {project.checkoutStatus === 'checked-out'
                            ? `Checked out by ${project.checkedOutBy?.username || 'unknown'}`
                            : 'Checked in'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-terminal-dim tracking-wide">DOWNLOADS</span>
                        <span className="text-terminal-text text-sm">{project.downloads}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-terminal-dim tracking-wide">OWNER</span>
                        <span className="text-terminal-text text-sm">
                          {project.owner?.username || 'unknown'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-terminal-dim tracking-wide">CREATED</span>
                        <span className="text-terminal-text text-sm">
                          {project.createdDate
                            ? new Date(project.createdDate).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {project.tags?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm text-terminal-accent">&gt; LANGUAGES</h4>
                        <div className="flex flex-wrap gap-2">
                          {project.tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => handleTagNavigate(tag)}
                              className="text-xs border border-terminal-dim text-terminal-text px-2 py-1 rounded hover:border-terminal-accent hover:text-terminal-accent transition-all duration-200"
                              type="button"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`transition-opacity duration-250 ${
                  activeTab === 'files' ? 'opacity-100 block' : 'opacity-0 hidden'
                }`}
              >
                <FilesComponent
                  files={project.files}
                  canEdit={isMember && isCheckedOutByUser}
                  checkoutStatus={project.checkoutStatus}
                />
              </div>

              <div
                className={`transition-opacity duration-250 ${
                  activeTab === 'activity' ? 'opacity-100 block' : 'opacity-0 hidden'
                }`}
              >
                <MessagesComponent
                  projectId={project.id}
                  messages={project.activity || []}
                  currentUser={user}
                  canAddMessage={isMember}
                  onMessageAdded={handleMessageAdded}
                />

                {isMember && (
                  <div className="mt-8 space-y-3 border border-terminal-dim rounded-lg bg-terminal-input-bg/40 p-4">
                    <h4 className="text-sm text-terminal-accent flex items-center justify-between">
                      &gt; CHECKIN_CHANGES
                      {project.checkoutStatus === 'checked-in' && (
                        <span className="text-terminal-warning text-xs">
                          Project must be checked out before submitting a check-in.
                        </span>
                      )}
                    </h4>

                    <textarea
                      className="terminal-input w-full text-sm p-2"
                      rows="3"
                      value={checkinForm.message}
                      onChange={(event) =>
                        setCheckinForm((prev) => ({ ...prev, message: event.target.value }))
                      }
                      placeholder="Describe your changes before checking in..."
                      disabled={!isCheckedOutByUser}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col">
                        <label className="text-xs text-terminal-dim mb-1">UPDATED_VERSION</label>
                        <input
                          type="text"
                          className="terminal-input text-sm p-2"
                          value={checkinForm.version}
                          onChange={(event) =>
                            setCheckinForm((prev) => ({ ...prev, version: event.target.value }))
                          }
                          disabled={!isCheckedOutByUser}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-terminal-dim mb-1">
                          UPLOAD_NEW_FILES (optional)
                        </label>
                        <input
                          key={checkinFileInputKey}
                          type="file"
                          multiple
                          className="terminal-input text-sm p-2"
                          onChange={handleCheckinFilesChange}
                          disabled={!isCheckedOutByUser}
                        />
                        {checkinForm.files.length > 0 && (
                          <div className="text-[11px] text-terminal-dim mt-1">
                            {checkinForm.files.length} file(s) selected
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCheckin}
                      className="terminal-button text-sm px-4 py-2 bg-transparent text-terminal-accent border border-terminal-accent w-full"
                      disabled={!isCheckedOutByUser}
                    >
                      {isCheckedOutByUser ? 'COMMIT & CHECKIN' : 'CHECKED_OUT_BY_ANOTHER_MEMBER'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {isImageModalOpen && project.imageUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4 max-w-3xl w-full shadow-[0_0_25px_rgba(0,255,0,0.2)]">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-terminal-accent text-sm font-fira-code">
                &gt; {project.name.toUpperCase()}_IMAGE
              </h4>
              <button
                type="button"
                onClick={toggleImageModal}
                className="terminal-button text-xs px-3 py-1 bg-transparent text-terminal-text border border-terminal-text"
              >
                CLOSE
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <img
                src={project.imageUrl}
                alt={`${project.name} full-size`}
                className="w-full h-auto rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectPage;
