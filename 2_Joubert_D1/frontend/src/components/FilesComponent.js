import React from 'react';
import './FilesComponent.css';

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const FilesComponent = ({ files = [], canEdit, checkoutStatus }) => {
  const canUploadMore = canEdit && checkoutStatus === 'checked-out';

  const openInNewTab = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="project-files">
      <header className="project-files__header">
        <div className="project-files__title-group">
          <h3 className="project-files__title">
            &gt; Project Files<span className="project-files__cursor">_</span>
          </h3>
          <p className="project-files__subtitle">
            Browse the repository assets that have been checked in.
          </p>
        </div>
        {canUploadMore && (
          <span className="project-files__status">
            Checked out by you — upload new files via the check-in form.
          </span>
        )}
      </header>

      {files.length === 0 ? (
        <div className="project-files__empty">
          <p>No files uploaded to this project yet.</p>
          <p>
            {canUploadMore
              ? 'Use the check-in form to add starter files or documentation.'
              : 'Files from your collaborators will appear here as they are checked in.'}
          </p>
        </div>
      ) : (
        <div className="project-files__table" role="table" aria-label="Project files">
          <div className="project-files__table-head" role="rowgroup">
            <div className="project-files__row project-files__row--head" role="row">
              <div className="project-files__cell project-files__cell--filename" role="columnheader">
                Filename
              </div>
              <div className="project-files__cell project-files__cell--size" role="columnheader">
                Size
              </div>
              <div className="project-files__cell project-files__cell--uploader" role="columnheader">
                Uploaded by
              </div>
              <div className="project-files__cell project-files__cell--actions" role="columnheader">
                Actions
              </div>
            </div>
          </div>
          <div className="project-files__table-body" role="rowgroup">
            {files.map((file) => (
              <div key={file.id} className="project-files__row" role="row">
                <div className="project-files__cell project-files__cell--filename" role="cell">
                  <span className="project-files__filename-indicator">&gt;</span>
                  <span className="project-files__filename" title={file.name}>
                    {file.name}
                  </span>
                </div>
                <div className="project-files__cell project-files__cell--size" role="cell">
                  {formatBytes(file.size)}
                </div>
                <div className="project-files__cell project-files__cell--uploader" role="cell">
                  <span>{file.uploadedBy?.username || 'unknown'}</span>
                  {file.uploadedAt && (
                    <time className="project-files__timestamp">
                      {new Date(file.uploadedAt).toLocaleString()}
                    </time>
                  )}
                </div>
                <div className="project-files__cell project-files__cell--actions" role="cell">
                  <button
                    type="button"
                    className="project-files__button"
                    onClick={() => openInNewTab(file.downloadUrl)}
                  >
                    View
                  </button>
                  <a
                    href={file.downloadUrl}
                    className="project-files__button project-files__button--accent"
                    download={file.name}
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default FilesComponent;
