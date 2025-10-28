import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const MessagesComponent = ({ messages = [], canAddMessage, projectId, currentUser, onMessageAdded }) => {
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
    <div className="font-fira-code">
      <h3 className="text-base font-bold text-terminal-accent mb-4 border-b border-terminal-dim pb-2">
        &gt; PROJECT_ACTIVITY
        <span className="cursor animate-blink">_</span>
      </h3>

      <div className="messages-list flex flex-col space-y-3">
        {messages.map((message) => (
          <div key={message.id} className="p-3 bg-terminal-input-bg/70 border border-terminal-dim rounded-md shadow-inner">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <Link to={`/profile/${message.user?.id}`} className="text-terminal-accent font-bold hover:underline">
                {message.user?.username || 'unknown'}
              </Link>
              <span className="text-terminal-text">{message.action}</span>
              <span className="text-terminal-dim text-[10px] ml-auto">{message.time}</span>
            </div>
            
            {message.message && (
              <div className="text-terminal-text text-sm italic mt-2 border-l-2 border-terminal-accent pl-2">
                "{message.message}"
              </div>
            )}
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="text-center p-8 border-2 border-dashed border-terminal-dim rounded-lg text-terminal-text">
          <p>No activity recorded</p>
          <p className="text-xs text-terminal-dim mt-2">Project activity will appear here</p>
        </div>
      )}

      {canAddMessage && (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col space-y-3 border border-terminal-dim rounded-lg p-4 bg-terminal-input-bg/50">
          <h4 className="text-sm text-terminal-accent">&gt; POST_MESSAGE</h4>
          {error && (
            <div className="text-terminal-error text-xs border border-terminal-error bg-terminal-bg/40 p-2">
              {error}
            </div>
          )}
          <textarea
            className="terminal-input text-sm p-2"
            rows="3"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Share an update with your collaborators..."
          />
          <button
            type="submit"
            className="terminal-button text-xs px-3 py-2 bg-transparent text-terminal-accent border border-terminal-accent self-end"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'POSTING...' : 'POST_MESSAGE'}
          </button>
        </form>
      )}
    </div>
  );
};

export default MessagesComponent;
