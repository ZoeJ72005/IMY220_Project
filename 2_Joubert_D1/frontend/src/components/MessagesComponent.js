import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './MessagesComponent.css';

const MessagesComponent = ({
  messages = [],
  canAddMessage,
  projectId,
  currentUser,
  onMessageAdded,
}) => {
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!messageText.trim()) {
      setError('Please enter a message before posting.');
      return;
    }

    if (!currentUser?.id) {
      setError('You must be signed in to post a message.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, message: messageText.trim() }),
      });
      const data = await response.json();

      if (data.success && data.activity) {
        onMessageAdded?.(data.activity);
        setMessageText('');
      } else {
        setError(data.message || 'Unable to post message. Please try again.');
      }
    } catch (submitError) {
      setError('Network error while posting message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="project-messages">
      <div className="project-messages__header">
        <h3 className="project-messages__title">
          &gt; Project Activity<span className="project-messages__cursor">_</span>
        </h3>
        <p className="project-messages__subtitle">
          Live updates and collaboration notes for this project.
        </p>
      </div>

      <div className="project-messages__list" role="list">
        {messages.map((message) => (
          <article key={message.id} className="project-messages__item" role="listitem">
            <header className="project-messages__item-header">
              <Link
                to={`/profile/${message.user?.id}`}
                className="project-messages__author"
              >
                {message.user?.username || 'unknown'}
              </Link>
              <span className="project-messages__action">{message.action}</span>
              <time className="project-messages__time">{message.time}</time>
            </header>

            {message.message && (
              <p className="project-messages__comment">"{message.message}"</p>
            )}
          </article>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="project-messages__empty">
          <p>No activity recorded yet.</p>
          <p>Updates, check-ins, and messages will appear here.</p>
        </div>
      )}

      {canAddMessage && (
        <form onSubmit={handleSubmit} className="project-messages__form">
          <h4 className="project-messages__form-title">&gt; Post Message</h4>
          {error && <div className="project-messages__error">{error}</div>}
          <label className="project-messages__label" htmlFor="project-message">
            Share a status update with your collaborators
          </label>
          <textarea
            id="project-message"
            className="project-messages__textarea"
            rows="3"
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="Write a short summary of what changed..."
          />
          <button type="submit" className="project-messages__submit" disabled={isSubmitting}>
            {isSubmitting ? 'Posting...' : 'Post Message'}
          </button>
        </form>
      )}
    </section>
  );
};

export default MessagesComponent;


