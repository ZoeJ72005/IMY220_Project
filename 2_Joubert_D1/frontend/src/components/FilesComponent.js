import React, { useState } from 'react';
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

const INLINE_TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'text/markdown',
  'application/x-sh',
  'application/x-yaml',
]);

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'];
const TEXT_EXTENSIONS = ['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'cs', 'go', 'rs', 'html', 'css', 'scss', 'less', 'yml', 'yaml', 'sh', 'sql'];

const getExtension = (filename = '') => {
  if (!filename) return '';
  const clean = filename.toLowerCase();
  if (clean === 'dockerfile') {
    return 'dockerfile';
  }
  const parts = clean.split('.');
  return parts.length > 1 ? parts.pop() : '';
};

const isInlineTextType = (mimeType = '', fileName = '') => {
  if (mimeType && INLINE_TEXT_MIME_TYPES.has(mimeType.toLowerCase())) {
    return true;
  }
  const ext = getExtension(fileName);
  return TEXT_EXTENSIONS.includes(ext);
};

const isImageType = (mimeType = '', fileName = '') => {
  if (mimeType && mimeType.startsWith('image/')) {
    return true;
  }
  const ext = getExtension(fileName);
  return IMAGE_EXTENSIONS.includes(ext);
};

const FilesComponent = ({ files = [], canEdit, checkoutStatus }) => {
  const canUploadMore = canEdit && checkoutStatus === 'checked-out';
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const openInNewTab = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewContent('');
    setPreviewUrl('');
    setPreviewLoading(false);
    setPreviewError('');
  };

  const handleViewFile = async (file) => {
    if (!file?.downloadUrl) {
      return;
    }

    if (isImageType(file.mimeType, file.name)) {
      closePreview();
      setPreviewFile(file);
      setPreviewUrl(file.downloadUrl);
      return;
    }

    if (!isInlineTextType(file.mimeType, file.name)) {
      openInNewTab(file.downloadUrl);
      return;
    }

    closePreview();
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewContent('');

    try {
      const response = await fetch(file.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to load file (${response.status})`);
      }
      const text = await response.text();
      setPreviewContent(text);
    } catch (error) {
      setPreviewError(error.message || 'Unable to preview this file.');
    } finally {
      setPreviewLoading(false);
    }
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
            Checked out by you - upload new files via the check-in form.
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
                    onClick={() => handleViewFile(file)}
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
      {previewFile && (
        <div className="project-files__preview-overlay" role="dialog" aria-modal="true">
          <div className="project-files__preview">
            <header className="project-files__preview-header">
              <div>
                <h4 className="project-files__preview-title">{previewFile.name}</h4>
                <span className="project-files__preview-meta">
                  {previewFile.mimeType || 'unknown'} - {formatBytes(previewFile.size)}
                </span>
              </div>
              <button type="button" className="project-files__preview-close" onClick={closePreview}>
                Close
              </button>
            </header>

            <div className="project-files__preview-body">
              {previewLoading && <div className="project-files__preview-status">Loading preview...</div>}
              {previewError && (
                <div className="project-files__preview-error">ERROR: {previewError}</div>
              )}
              {!previewLoading && !previewError && previewUrl && (
                <div className="project-files__preview-media">
                  <img src={previewUrl} alt={previewFile.name} />
                </div>
              )}
              {!previewLoading && !previewError && !previewUrl && (
                <pre className="project-files__preview-code">
                  <code>{previewContent || 'This file is empty.'}</code>
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FilesComponent;


