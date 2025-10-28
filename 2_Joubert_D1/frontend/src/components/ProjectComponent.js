import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ProjectComponent = ({
  project,
  isOwner,
  isMember,
  currentUser,
  availableFriends,
  onEdit,
  onCheckout,
  onShowCheckin,
  onDelete,
  onDownload,
  onAddMember,
  onRemoveMember,
  onTransferOwnership,
  onTagClick,
  onImageClick,
}) => {
  const [selectedFriend, setSelectedFriend] = useState('');
  const [selectedNewOwner, setSelectedNewOwner] = useState('');

  const getStatusColor = (status) => {
    switch (status) {
      case 'checked-out':
        return 'var(--terminal-warning)';
      case 'checked-in':
        return 'var(--terminal-accent)';
      default:
        return 'var(--terminal-text)';
    }
  };

  const handleAddMember = (event) => {
    event.preventDefault();
    if (!selectedFriend) return;
    onAddMember?.(selectedFriend);
    setSelectedFriend('');
  };

  const handleTransferOwnership = (event) => {
    event.preventDefault();
    if (!selectedNewOwner) return;
    onTransferOwnership?.(selectedNewOwner);
    setSelectedNewOwner('');
  };

  const isCheckedOutByUser =
    project.checkoutStatus === 'checked-out' && project.checkedOutBy?.id === currentUser.id;

  const createdDate = project.createdDate
    ? new Date(project.createdDate).toLocaleDateString()
    : 'Unknown';

  return (
    <div className="flex flex-col gap-4 font-fira-code">
      <div className="pb-3.5 border-b border-terminal-dim">
        <h2 className="text-lg text-terminal-text mb-1.5">
          &gt; {project.name}
          <span className="cursor animate-blink">_</span>
        </h2>
        <div
          className="flex items-center gap-1.5 text-[10px] font-bold"
          style={{ color: getStatusColor(project.checkoutStatus) }}
        >
          <span className="text-xs animate-pulse">&gt;</span>
          <span>
            {project.checkoutStatus === 'checked-out'
              ? `LOCKED_BY: ${project.checkedOutBy?.username || 'unknown'}`
              : 'AVAILABLE'}
          </span>
        </div>
      </div>

      {project.imageUrl && (
        <div className="border border-terminal-dim rounded bg-terminal-input-bg/40 overflow-hidden">
          <button
            type="button"
            onClick={onImageClick}
            className="w-full"
            title="View full-size image"
          >
            <img src={project.imageUrl} alt={`${project.name} cover`} className="w-full h-40 object-cover" />
          </button>
        </div>
      )}

      <div className="p-3 border border-terminal-dim rounded bg-terminal-input-bg/50 flex flex-col gap-2">
        <h3 className="text-sm text-terminal-accent mb-1">&gt; DETAILS</h3>
        <div className="flex flex-col">
          <span className="text-[10px] text-terminal-dim">OWNER:</span>
          <Link
            to={`/profile/${project.owner?.id}`}
            className="text-xs text-terminal-accent hover:underline"
          >
            {project.owner?.username || 'unknown'}
          </Link>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-terminal-dim">TYPE:</span>
          <span className="text-xs text-terminal-text">
            {project.type?.replace('-', ' ') || 'unknown'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-terminal-dim">VERSION:</span>
          <span className="text-xs text-terminal-text">{project.version}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-terminal-dim">CREATED:</span>
          <span className="text-xs text-terminal-text">{createdDate}</span>
        </div>
      </div>

  {project.tags?.length > 0 && (
        <div className="p-3 border border-terminal-dim rounded bg-terminal-input-bg/50">
          <h3 className="text-sm text-terminal-accent mb-2.5">&gt; LANGUAGES</h3>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(tag)}
                className="bg-transparent border border-terminal-dim text-terminal-text px-2 py-1 rounded text-[10px] hover:border-terminal-accent hover:text-terminal-accent transition-colors duration-200"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border border-terminal-dim rounded bg-terminal-input-bg/50">
        <h3 className="text-sm text-terminal-accent mb-2.5">
          &gt; MEMBERS ({project.members?.length || 0})
        </h3>
        <div className="flex flex-col gap-2">
          {project.members?.map((member) => {
            const canRemove = isOwner && member.id !== project.owner?.id;
            return (
              <div key={member.id} className="flex items-center justify-between text-xs">
                <Link
                  to={`/profile/${member.id}`}
                  className="text-terminal-accent hover:underline"
                >
                  {member.username}
                </Link>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => onRemoveMember?.(member.id)}
                    className="terminal-button text-[10px] px-2 py-1 bg-transparent text-terminal-error border border-terminal-error"
                  >
                    REMOVE
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isMember && (
        <div className="p-3 border border-terminal-dim rounded bg-terminal-input-bg/50 flex flex-col gap-3">
          <h3 className="text-sm text-terminal-accent mb-1">&gt; TEAM_ACTIONS</h3>
          {availableFriends.length > 0 ? (
            <form onSubmit={handleAddMember} className="flex flex-col gap-2">
              <label className="text-[10px] text-terminal-dim">ADD_MEMBER:</label>
              <div className="flex gap-2">
                <select
                  value={selectedFriend}
                  onChange={(event) => setSelectedFriend(event.target.value)}
                  className="terminal-input text-xs flex-1"
                >
                  <option value="">Select a friend</option>
                  {availableFriends.map((friend) => (
                    <option key={friend.id} value={friend.id}>
                      {friend.username}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="terminal-button text-[11px] px-3 py-2 bg-transparent text-terminal-accent border border-terminal-accent"
                >
                  ADD
                </button>
              </div>
            </form>
          ) : (
            <p className="text-[11px] text-terminal-dim">
              All of your friends already belong to this project.
            </p>
          )}

          {isOwner && (
            <form onSubmit={handleTransferOwnership} className="flex flex-col gap-2 border-t border-terminal-dim pt-3">
              <label className="text-[10px] text-terminal-dim">TRANSFER_OWNERSHIP:</label>
              <div className="flex gap-2">
                <select
                  value={selectedNewOwner}
                  onChange={(event) => setSelectedNewOwner(event.target.value)}
                  className="terminal-input text-xs flex-1"
                >
                  <option value="">Select member</option>
                  {project.members
                    ?.filter((member) => member.id !== project.owner?.id)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.username}
                      </option>
                    ))}
                </select>
                <button
                  type="submit"
                  className="terminal-button text-[11px] px-3 py-2 bg-transparent text-terminal-warning border border-terminal-warning"
                >
                  TRANSFER
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="p-3 border border-terminal-dim rounded bg-terminal-input-bg/50 flex flex-col space-y-2">
        <h3 className="text-sm text-terminal-accent mb-1">&gt; ACTIONS</h3>
        <button
          onClick={onDownload}
          className="terminal-button text-xs px-2 py-2 w-full text-center bg-transparent text-[var(--terminal-text)] border-[var(--terminal-text)] hover:bg-[rgba(0,255,0,0.1)]"
        >
          DOWNLOAD
        </button>

        {isMember && project.checkoutStatus === 'checked-in' && (
          <button
            onClick={onCheckout}
            className="terminal-button text-xs px-2 py-2 w-full text-center bg-transparent text-[var(--terminal-warning)] border-[var(--terminal-warning)] hover:bg-[rgba(255,189,46,0.1)]"
          >
            CHECKOUT
          </button>
        )}

        <button
          onClick={onShowCheckin}
          className="terminal-button text-xs px-2 py-2 w-full text-center bg-transparent text-[var(--terminal-accent)] border-[var(--terminal-accent)] hover:bg-[rgba(0,255,0,0.1)]"
        >
          OPEN_CHECKIN_FORM
        </button>

        {isOwner && (
          <div className="pt-2 mt-2 border-t border-terminal-dim flex flex-col gap-2">
            <button
              onClick={onEdit}
              className="terminal-button text-xs px-2 py-2 w-full text-center bg-transparent text-[var(--terminal-accent)] border-[var(--terminal-accent)] hover:bg-[rgba(0,255,0,0.1)]"
            >
              EDIT_PROJECT
            </button>
            <button
              onClick={onDelete}
              className="terminal-button text-xs px-2 py-2 w-full text-center bg-transparent text-[var(--terminal-error)] border-[var(--terminal-error)] hover:bg-[rgba(255,0,0,0.1)]"
            >
              DELETE_PROJECT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectComponent;
