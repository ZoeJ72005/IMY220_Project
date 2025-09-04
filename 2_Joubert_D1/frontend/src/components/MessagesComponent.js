import React from 'react';
import { Link } from 'react-router-dom';

const MessagesComponent = ({ messages, canAddMessage }) => {
  return (
    <div className="messages-component">
      <h3 className="messages-title">
        &gt; PROJECT_ACTIVITY
        <span className="cursor">_</span>
      </h3>

      <div className="messages-list">
        {messages.map(message => (
          <div key={message.id} className="message-item">
            <div className="message-header">
              <Link to={`/profile/${message.user}`} className="message-user">
                {message.user}
              </Link>
              <span className="message-action">{message.action}</span>
              <span className="message-time">{message.time}</span>
            </div>
            
            {message.message && (
              <div className="message-content">
                "{message.message}"
              </div>
            )}
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="empty-messages">
          <p>No activity recorded</p>
          <p className="help-text">Project activity will appear here</p>
        </div>
      )}
    </div>
  );
};

export default MessagesComponent;