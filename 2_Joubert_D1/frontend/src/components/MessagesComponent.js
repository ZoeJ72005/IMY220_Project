import React from 'react';
import { Link } from 'react-router-dom';

const MessagesComponent = ({ messages, canAddMessage }) => {
  return (
    <div className="font-fira-code">
      <h3 className="text-base font-bold text-terminal-accent mb-4 border-b border-terminal-dim pb-2">
        &gt; PROJECT_ACTIVITY
        <span className="cursor animate-blink">_</span>
      </h3>

      <div className="messages-list flex flex-col space-y-3">
        {messages.map(message => (
          <div key={message.id} className="p-3 bg-terminal-input-bg/70 border border-terminal-dim rounded-md shadow-inner">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <Link to={`/profile/${message.user}`} className="text-terminal-accent font-bold hover:underline">
                {message.user}
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
    </div>
  );
};

export default MessagesComponent;
