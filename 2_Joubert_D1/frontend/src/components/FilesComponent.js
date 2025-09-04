import React from 'react';

const FilesComponent = ({ files, canEdit, checkoutStatus }) => {
  return (
    <div className="files-component">
      <div className="files-header">
        <h3 className="files-title">
          &gt; PROJECT_FILES
          <span className="cursor">_</span>
        </h3>
        {canEdit && checkoutStatus === 'checked-out' && (
          <button className="add-file-btn terminal-button">
            ADD_FILES
          </button>
        )}
      </div>

      <div className="files-list">
        <div className="files-table">
          <div className="table-header">
            <div className="col-name">FILENAME</div>
            <div className="col-size">SIZE</div>
            <div className="col-modified">MODIFIED</div>
            <div className="col-actions">ACTIONS</div>
          </div>
          
          {files.map(file => (
            <div key={file.id} className="table-row">
              <div className="col-name">
                <span className="file-icon">&gt;</span>
                <span className="file-name">{file.name}</span>
              </div>
              <div className="col-size">{file.size}</div>
              <div className="col-modified">{file.modified}</div>
              <div className="col-actions">
                <button className="file-action-btn terminal-button">
                  VIEW
                </button>
                <button className="file-action-btn terminal-button">
                  DOWNLOAD
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {files.length === 0 && (
        <div className="empty-files">
          <p>No files in this project</p>
          <p className="help-text">
            {canEdit ? 'Checkout the project to add files' : 'Files will appear here when added'}
          </p>
        </div>
      )}
    </div>
  );
};

export default FilesComponent;