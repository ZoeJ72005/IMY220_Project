import React, { useState, useEffect } from 'react';
import Header from '../components/Header';

const AdminDashboard = ({ user, onLogout, onUserUpdate = () => {}, theme, onToggleTheme }) => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [newType, setNewType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const isAdmin = user?.role === 'admin';

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    let data = {};
    try {
      data = await response.json();
    } catch (parseError) {
      // ignore JSON parse errors; data stays as {}
    }

    const successFlag = data?.success;
    if (!response.ok || successFlag === false) {
      const error = new Error(data?.message || `Request failed (${response.status})`);
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  };

  const refetchUsers = async () => {
    const data = await requestJson(`/api/admin/users?adminId=${user.id}`);
    setUsers(data.users);
    return data;
  };

  const refetchProjects = async () => {
    const data = await requestJson(`/api/admin/projects?adminId=${user.id}`);
    setProjects(data.projects);
    return data;
  };

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [dashboardData, usersData, projectsData, typesData] = await Promise.all([
          requestJson(`/api/admin/dashboard?adminId=${user.id}`),
          requestJson(`/api/admin/users?adminId=${user.id}`),
          requestJson(`/api/admin/projects?adminId=${user.id}`),
          requestJson('/api/project-types'),
        ]);

        setStats(dashboardData.stats);
        setUsers(usersData.users);
        setProjects(projectsData.projects);
        setProjectTypes(typesData.types);
      } catch (loadError) {
        console.error('Admin dashboard load error:', loadError);
        setError(loadError.message || 'Unable to load admin data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAdmin, user.id]);

  const handleAddType = async (event) => {
    event.preventDefault();
    if (!newType.trim()) return;

    try {
      const response = await fetch('/api/admin/project-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, name: newType }),
      });
      const data = await response.json();
      if (data.success) {
        setProjectTypes(data.types);
        setNewType('');
      } else {
        alert(data.message || 'Unable to add project type.');
      }
    } catch (addError) {
      alert('Network error while adding project type.');
    }
  };

  const handleDeleteType = async (name) => {
    if (!window.confirm(`Delete project type "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/project-types/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id }),
      });
      const data = await response.json();
      if (data.success) {
        setProjectTypes(data.types);
      } else {
        alert(data.message || 'Unable to delete project type.');
      }
    } catch (deleteError) {
      alert('Network error while deleting project type.');
    }
  };

  const handleToggleRole = async (adminUser) => {
    const nextRole = adminUser.role === 'admin' ? 'user' : 'admin';
    setUpdatingUserId(adminUser.id);
    try {
      const data = await requestJson(`/api/admin/users/${adminUser.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, role: nextRole }),
      });

      await refetchUsers();

      if (data.user.id === user.id) {
        onUserUpdate({ ...user, role: data.user.role });
      }
      setAdminMessage(
        `User "${data.user.username}" role updated to ${data.user.role.toUpperCase()}.`
      );
    } catch (updateError) {
      if (updateError.status === 404) {
        await refetchUsers();
        setAdminMessage(
          `User "${adminUser.username}" could not be found and has been removed from the list.`
        );
      } else {
        alert(updateError.message || 'Unable to update user role.');
      }
    } finally {
      setUpdatingUserId('');
    }
  };

  const adminCount = users.reduce((count, adminUser) => {
    return adminUser.role === 'admin' ? count + 1 : count;
  }, 0);

  const promptField = (label, defaultValue = '') => {
    const result = window.prompt(label, defaultValue ?? '');
    if (result === null) {
      throw new Error('USER_CANCELLED');
    }
    return result.trim();
  };

  const handleProjectEdit = async (targetProject) => {
    try {
      let currentDetails = {
        name: targetProject.name,
        description: targetProject.description || '',
        type: targetProject.type || '',
        version: targetProject.version || '',
        tags: targetProject.tags || [],
      };

      try {
        const detailResponse = await fetch(`/api/projects/${targetProject.id}`);
        const detailData = await detailResponse.json();
        if (detailData.success && detailData.project) {
          currentDetails = {
            name: detailData.project.name,
            description: detailData.project.description || '',
            type: detailData.project.type || '',
            version: detailData.project.version || '',
            tags: detailData.project.tags || [],
          };
        }
      } catch (detailError) {
        console.warn('Unable to fetch project details for admin edit:', detailError);
      }

      const name = promptField('Project name', currentDetails.name);
      const description = promptField('Project description', currentDetails.description);
      const type = promptField('Project type', currentDetails.type);
      const version = promptField('Project version', currentDetails.version);
      const tagsInput = promptField(
        'Project tags (comma separated)',
        (currentDetails.tags || []).join(', ')
      );

      const data = await requestJson(`/api/admin/projects/${targetProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          name,
          description,
          type,
          version,
          tags: tagsInput,
        }),
      });

      await refetchProjects();
      setAdminMessage(`Project "${data.project.name}" updated successfully.`);
    } catch (updateError) {
      if (updateError.message !== 'USER_CANCELLED') {
        if (updateError.status === 404) {
          await refetchProjects();
          setAdminMessage(
            `Project "${targetProject.name}" is no longer available and has been removed from the list.`
          );
        } else {
          alert(updateError.message || 'Unable to update project.');
        }
      }
    }
  };

  const handleProjectDelete = async (targetProject) => {
    if (!window.confirm(`Delete project "${targetProject.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await requestJson(`/api/admin/projects/${targetProject.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id }),
      });
      await refetchProjects();
      setAdminMessage(`Project "${targetProject.name}" deleted.`);
    } catch (deleteError) {
      if (deleteError.status === 404) {
        await refetchProjects();
        setAdminMessage(
          `Project "${targetProject.name}" was already removed. The list has been refreshed.`
        );
      } else {
        alert(deleteError.message || 'Unable to delete project.');
      }
    }
  };

  const handleUserEdit = async (targetUser) => {
    try {
      const username = promptField('Username', targetUser.username);
      const email = promptField('Email', targetUser.email);
      const fullName = promptField('Full name', targetUser.fullName || '');
      const bio = promptField('Bio', targetUser.bio || '');

      const data = await requestJson(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          username,
          email,
          fullName,
          bio,
        }),
      });

      await refetchUsers();
      setAdminMessage(`User "${data.user.username}" updated.`);
    } catch (userError) {
      if (userError.message !== 'USER_CANCELLED') {
        if (userError.status === 404) {
          await refetchUsers();
          setAdminMessage(
            `User "${targetUser.username}" could not be found and was removed from the list.`
          );
        } else {
          alert(userError.message || 'Unable to update user.');
        }
      }
    }
  };

  const handleUserDelete = async (targetUser) => {
    if (!window.confirm(`Delete user "${targetUser.username}" and associated data?`)) {
      return;
    }

    try {
      await requestJson(`/api/admin/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id }),
      });
      await refetchUsers();
      setAdminMessage(`User "${targetUser.username}" deleted.`);
    } catch (deleteError) {
      if (deleteError.status === 404) {
        await refetchUsers();
        setAdminMessage(
          `User "${targetUser.username}" no longer exists and has been removed from the list.`
        );
      } else {
        alert(deleteError.message || 'Unable to delete user.');
      }
    }
  };

  const handleVerifyUser = async (targetUser) => {
    try {
      const data = await requestJson(`/api/admin/users/${targetUser.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id }),
      });
      await refetchUsers();
      setAdminMessage(`User "${targetUser.username}" verified.`);
    } catch (verifyError) {
      if (verifyError.status === 404) {
        await refetchUsers();
        setAdminMessage(
          `User "${targetUser.username}" could not be found and was removed from the list.`
        );
      } else {
        alert(verifyError.message || 'Unable to verify user.');
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-terminal-bg min-h-screen">
        <Header user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />
        <div className="flex items-center justify-center mt-32 text-terminal-error font-fira-code">
          Access denied. Administrator privileges required.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-terminal-bg min-h-screen">
      <Header user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />
      <main className="p-5 max-w-7xl mx-auto font-fira-code space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-terminal-accent">
            &gt; ADMIN_DASHBOARD<span className="cursor animate-blink">_</span>
          </h1>
          {loading && <span className="text-terminal-dim text-xs">loading...</span>}
        </div>

        {error && (
          <div className="border border-terminal-error text-terminal-error text-sm p-3">
            ERROR: {error}
          </div>
        )}

        {adminMessage && (
          <div className="border border-terminal-border text-terminal-text text-xs p-3 bg-terminal-input-bg/40 flex items-center justify-between">
            <span>{adminMessage}</span>
            <button
              type="button"
              className="terminal-button text-[10px] px-2 py-1 bg-transparent text-terminal-text border border-terminal-border"
              onClick={() => setAdminMessage('')}
            >
              DISMISS
            </button>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats).map(([key, value]) => (
              <div
                key={key}
                className="border border-terminal-border rounded-lg p-4 bg-terminal-input-bg/40 text-center"
              >
                <div className="text-terminal-dim text-xs uppercase">{key}</div>
                <div className="text-terminal-text text-lg font-bold">{value}</div>
              </div>
            ))}
          </div>
        )}

        <section className="border border-terminal-border rounded-lg p-4 bg-terminal-input-bg/40 space-y-4">
          <h2 className="text-terminal-accent text-sm uppercase">&gt; Manage Project Types</h2>
          <form onSubmit={handleAddType} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              className="terminal-input text-sm flex-1 p-2"
              value={newType}
              onChange={(event) => setNewType(event.target.value)}
              placeholder="Add new project type (e.g., cli-tool)"
            />
            <button
              type="submit"
              className="terminal-button text-xs px-4 py-2 bg-transparent text-terminal-accent border border-terminal-accent"
            >
              ADD TYPE
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {projectTypes.map((type) => (
              <div key={type} className="flex items-center gap-2 border border-terminal-dim px-2 py-1 text-xs rounded">
                <span className="text-terminal-text">{type}</span>
                {!DEFAULT_TYPES.includes(type) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteType(type)}
                    className="terminal-button text-[10px] px-2 py-1 bg-transparent text-terminal-error border border-terminal-error"
                  >
                    REMOVE
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="border border-terminal-border rounded-lg p-4 bg-terminal-input-bg/40 space-y-3">
          <h2 className="text-terminal-accent text-sm uppercase">&gt; Users</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-terminal-text">
              <thead>
                <tr className="text-terminal-dim text-[10px] uppercase border-b border-terminal-dim">
                  <th className="text-left py-2 pr-4">Username</th>
                  <th className="text-left py-2 pr-4">Email</th>
                  <th className="text-left py-2 pr-4">Role</th>
                  <th className="text-left py-2 pr-4">Verified</th>
                  <th className="text-left py-2 pr-4">Friends</th>
                  <th className="text-left py-2 pr-4">Projects</th>
                  <th className="text-left py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((adminUser) => (
                  <tr key={adminUser.id} className="border-b border-terminal-dim/50">
                    <td className="py-2 pr-4">{adminUser.username}</td>
                    <td className="py-2 pr-4 text-terminal-dim">{adminUser.email}</td>
                    <td className="py-2 pr-4 uppercase">{adminUser.role}</td>
                    <td className="py-2 pr-4">{adminUser.verified ? 'Yes' : 'No'}</td>
                    <td className="py-2 pr-4">{adminUser.friends}</td>
                    <td className="py-2 pr-4">{adminUser.projects}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            updatingUserId === adminUser.id ||
                            (adminUser.role === 'admin' && adminCount <= 1 && adminUser.id === user.id)
                          }
                          onClick={() => handleToggleRole(adminUser)}
                          className="terminal-button text-[10px] px-3 py-1 bg-transparent border border-terminal-accent text-terminal-accent disabled:border-terminal-dim disabled:text-terminal-dim"
                        >
                          {adminUser.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUserEdit(adminUser)}
                          className="terminal-button text-[10px] px-3 py-1 bg-transparent border border-terminal-border text-terminal-text"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUserDelete(adminUser)}
                          className="terminal-button text-[10px] px-3 py-1 bg-transparent border border-terminal-error text-terminal-error"
                        >
                          Delete
                        </button>
                        {!adminUser.verified && (
                          <button
                            type="button"
                            onClick={() => handleVerifyUser(adminUser)}
                            className="terminal-button text-[10px] px-3 py-1 bg-transparent border border-terminal-accent text-terminal-accent"
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border border-terminal-border rounded-lg p-4 bg-terminal-input-bg/40 space-y-3">
          <h2 className="text-terminal-accent text-sm uppercase">&gt; Projects</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-terminal-text">
              <thead>
                <tr className="text-terminal-dim text-[10px] uppercase border-b border-terminal-dim">
                  <th className="text-left py-2 pr-4">Name</th>
                  <th className="text-left py-2 pr-4">Owner</th>
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">Members</th>
                  <th className="text-left py-2 pr-4">Downloads</th>
                  <th className="text-left py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((adminProject) => (
                  <tr key={adminProject.id} className="border-b border-terminal-dim/50">
                    <td className="py-2 pr-4">{adminProject.name}</td>
                    <td className="py-2 pr-4">{adminProject.owner}</td>
                    <td className="py-2 pr-4 uppercase">{adminProject.type}</td>
                    <td className="py-2 pr-4">{adminProject.members}</td>
                    <td className="py-2 pr-4">{adminProject.downloads}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleProjectEdit(adminProject)}
                          className="terminal-button text-[10px] px-3 py-1 bg-transparent border border-terminal-border text-terminal-text"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProjectDelete(adminProject)}
                          className="terminal-button text-[10px] px-3 py-1 bg-transparent border border-terminal-error text-terminal-error"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

const DEFAULT_TYPES = [
  'web-application',
  'desktop-application',
  'mobile-application',
  'framework',
  'library',
  'tool',
  'game',
  'service',
  'other',
];

export default AdminDashboard;
