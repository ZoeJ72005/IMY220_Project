import React, { useState } from 'react';

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
    <div className="font-fira-code space-y-4">
      <div className="flex items-center justify-between border-b border-terminal-dim pb-2">
        <h3 className="text-base font-bold text-terminal-accent">
          &gt; DISCUSSION_BOARD
          <span className="cursor animate-blink">_</span>
        </h3>
        {loading && (
          <span className="text-terminal-dim text-xs">loading...</span>
        )}
      </div>

      {discussion.length === 0 && !loading && (
        <div className="text-center p-8 border-2 border-dashed border-terminal-dim rounded-lg text-terminal-text">
          <p>No discussion messages yet.</p>
          <p className="text-xs text-terminal-dim mt-2">
            Start the conversation by posting an update.
          </p>
        </div>
      )}

      {discussion.length > 0 && (
        <div className="flex flex-col gap-3">
          {discussion.map((entry) => (
            <div
              key={entry.id}
              className="p-3 bg-terminal-input-bg/70 border border-terminal-dim rounded-md shadow-inner flex flex-col gap-1 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-terminal-accent font-semibold">
                  {entry.user?.username || 'unknown'}
                </span>
                {entry.createdAt && (
                  <span className="text-terminal-dim text-[10px]">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-terminal-text leading-relaxed">{entry.message}</p>
            </div>
          ))}
        </div>
      )}

      {canDiscuss && (
        <form onSubmit={handleSubmit} className="space-y-2 border border-terminal-dim rounded-lg p-3 bg-terminal-input-bg/40">
          <label className="text-[10px] uppercase text-terminal-dim">
            New message
          </label>
          <textarea
            className="terminal-input text-sm p-2"
            rows="3"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Share an update with your team..."
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="terminal-button text-xs px-4 py-2 bg-transparent text-terminal-accent border border-terminal-accent w-full sm:w-auto"
          >
            {submitting ? 'POSTING...' : 'POST_MESSAGE'}
          </button>
        </form>
      )}
    </div>
  );
};

export default DiscussionBoard;
