import React, { useState } from 'react';
import '../styles/DiscussionBoard.css';

const DiscussionBoard = ({
  discussion = [],
  canDiscuss,
  onSendMessage,
  loading = false,
}) => {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim() || !onSendMessage) {
      return;
    }

    setSubmitting(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="discussion-board">
      <header className="discussion-board__header">
        <div>
          <h3 className="discussion-board__title">
            &gt; Discussion Board<span className="discussion-board__cursor">_</span>
          </h3>
          <p className="discussion-board__subtitle">
            Coordinate with collaborators and track important project notes.
          </p>
        </div>
        {loading && <span className="discussion-board__loading">Loading...</span>}
      </header>

      {discussion.length === 0 && !loading && (
        <div className="discussion-board__empty">
          <p>No discussion messages yet.</p>
          <p>Kick off the conversation by posting an update.</p>
        </div>
      )}

      {discussion.length > 0 && (
        <div className="discussion-board__timeline">
          {discussion.map((entry) => (
            <article key={entry.id} className="discussion-board__entry">
              <header className="discussion-board__entry-header">
                <span className="discussion-board__author">
                  {entry.user?.username || 'unknown'}
                </span>
                {entry.createdAt && (
                  <time className="discussion-board__time">
                    {new Date(entry.createdAt).toLocaleString()}
                  </time>
                )}
              </header>
              <p className="discussion-board__message">{entry.message}</p>
            </article>
          ))}
        </div>
      )}

      {canDiscuss && (
        <form onSubmit={handleSubmit} className="discussion-board__form">
          <label className="discussion-board__form-label" htmlFor="discussion-input">
            New message
          </label>
          <textarea
            id="discussion-input"
            className="discussion-board__textarea"
            rows="3"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Share an update with your team..."
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="discussion-board__submit"
          >
            {submitting ? 'Posting...' : 'Post Message'}
          </button>
        </form>
      )}
    </section>
  );
};

export default DiscussionBoard;
