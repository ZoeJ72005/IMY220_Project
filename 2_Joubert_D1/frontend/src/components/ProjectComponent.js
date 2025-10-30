// 2_Joubert 05084360
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/ComponentBase.css';
import '../styles/ProjectComponent.css';

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

  const status = project.checkoutStatus || 'checked-in';
  const statusLabel =
    status === 'checked-out'
      ? `Locked by ${project.checkedOutBy?.username || 'unknown'}`
      : 'Available for checkout';

  const isCheckedOutByUser =
    project.checkoutStatus === 'checked-out' && project.checkedOutBy?.id === currentUser.id;

  const createdDate = project.createdDate
    ? new Date(project.createdDate).toLocaleDateString()
    : 'Unknown';

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

  const handleCancelTransfer = () => {
    setSelectedNewOwner('');
  };

  const members = project.members || [];

  return (
    <section className="project-view" aria-labelledby="project-view-title">
      <header className="project-view__header">
        <div className="project-view__title-block">
          <h2 id="project-view-title" className="project-view__title">
            &gt; {project.name}
            <span className="project-view__cursor">_</span>
          </h2>
          <time className="project-view__timestamp">Created: {createdDate}</time>
        </div>
        <span className={`project-view__status project-view__status--${status}`}>
          {statusLabel}
        </span>
      </header>

      {project.imageUrl && (
        <div className="project-view__hero">
          <button
            type="button"
            onClick={onImageClick}
            className="project-view__hero-button"
            title="View full-size image"
          >
            <img
              src={project.imageUrl}
              alt={`${project.name} cover`}
              className="project-view__hero-image"
            />
          </button>
        </div>
      )}

      {project.description && (
        <section className="project-view__card">
          <h3 className="project-view__card-title">&gt; Overview</h3>
          <p className="project-view__description">{project.description}</p>
        </section>
      )}

      <section className="project-view__card project-view__card--details">
        <h3 className="project-view__card-title">&gt; Project Details</h3>
        <dl className="project-view__details">
          <div className="project-view__details-row">
            <dt>Owner</dt>
            <dd>
              <Link to={`/profile/${project.owner?.id}`} className="project-view__link">
                {project.owner?.username || 'unknown'}
              </Link>
            </dd>
          </div>
          <div className="project-view__details-row">
            <dt>Type</dt>
            <dd>{project.type?.replace('-', ' ') || 'unknown'}</dd>
          </div>
          <div className="project-view__details-row">
            <dt>Version</dt>
            <dd>{project.version}</dd>
          </div>
          <div className="project-view__details-row">
            <dt>Members</dt>
            <dd>{members.length}</dd>
          </div>
        </dl>
        {isCheckedOutByUser && (
          <p className="project-view__notice">
            You currently have this project checked out. Remember to check it back in once your
            updates are complete.
          </p>
        )}
      </section>

      {project.tags?.length > 0 && (
        <section className="project-view__card">
          <h3 className="project-view__card-title">&gt; Languages / Tags</h3>
          <div className="project-view__tags">
            {project.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="project-view__tag"
                onClick={() => onTagClick?.(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="project-view__card">
        <h3 className="project-view__card-title">
          &gt; Team Members <span className="project-view__count">({members.length})</span>
        </h3>
        {members.length === 0 ? (
          <p className="project-view__empty">No members assigned yet.</p>
        ) : (
          <ul className="project-view__members">
            {members.map((member) => {
              const canRemove = isOwner && member.id !== project.owner?.id;
              return (
                <li key={member.id} className="project-view__member">
                  <Link to={`/profile/${member.id}`} className="project-view__member-link">
                    {member.username}
                  </Link>
                  {member.role && <span className="project-view__member-role">{member.role}</span>}
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => onRemoveMember?.(member.id)}
                      className="terminal-button project-view__member-action project-view__member-action--danger"
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isMember && (
        <section className="project-view__card project-view__card--actions">
          <h3 className="project-view__card-title">&gt; Team Actions</h3>

          {availableFriends.length > 0 ? (
            <form onSubmit={handleAddMember} className="project-view__form">
              <label className="project-view__form-label" htmlFor="project-add-member">
                Invite collaborator
              </label>
              <div className="project-view__form-controls">
                <select
                  id="project-add-member"
                  value={selectedFriend}
                  onChange={(event) => setSelectedFriend(event.target.value)}
                  className="project-view__select"
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
                  className="terminal-button project-view__form-button project-view__form-button--primary"
                >
                  Add
                </button>
              </div>
            </form>
          ) : (
            <p className="project-view__hint">
              All of your friends already belong to this project.
            </p>
          )}

          {isOwner && (
            <form onSubmit={handleTransferOwnership} className="project-view__form">
              <label className="project-view__form-label" htmlFor="project-transfer-owner">
                Transfer ownership
              </label>
              <div className="project-view__form-controls">
                <select
                  id="project-transfer-owner"
                  value={selectedNewOwner}
                  onChange={(event) => setSelectedNewOwner(event.target.value)}
                  className="project-view__select"
                >
                  <option value="">Select member</option>
                  {members
                    .filter((member) => member.id !== project.owner?.id)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.username}
                      </option>
                    ))}
                </select>
                <button
                  type="submit"
                  className="terminal-button project-view__form-button project-view__form-button--warning"
                >
                  Transfer
                </button>
                {selectedNewOwner && (
                  <button
                    type="button"
                    onClick={handleCancelTransfer}
                    className="terminal-button project-view__form-button project-view__form-button--ghost"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      )}

      <section className="project-view__card project-view__card--cta">
        <h3 className="project-view__card-title">&gt; Actions</h3>
        <div className="project-view__cta-buttons">
          <button
            type="button"
            onClick={onDownload}
            className="terminal-button project-view__cta project-view__cta--neutral"
          >
            Download
          </button>

          {(isMember || isOwner) && project.checkoutStatus === 'checked-in' && (
            <button
              type="button"
              onClick={onCheckout}
              className="terminal-button project-view__cta project-view__cta--warning"
            >
              Checkout
            </button>
          )}

          <button
            type="button"
            onClick={onShowCheckin}
            className="terminal-button project-view__cta project-view__cta--primary"
          >
            Open Check-in Form
          </button>

          {isOwner && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="terminal-button project-view__cta project-view__cta--primary"
              >
                Edit Project
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="terminal-button project-view__cta project-view__cta--danger"
              >
                Delete Project
              </button>
            </>
          )}
        </div>
      </section>
    </section>
  );
};

export default ProjectComponent;
