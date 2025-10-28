import React from 'react';

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
    <div className="font-fira-code">
      <div className="flex justify-between items-center mb-4 border-b border-terminal-dim pb-2">
        <h3 className="text-base font-bold text-terminal-accent">
          &gt; PROJECT_FILES
          <span className="cursor animate-blink">_</span>
        </h3>
        {canUploadMore && (
          <span className="text-[10px] text-terminal-warning uppercase">
            Checked out by you &mdash; upload new files via the check-in form.
          </span>
        )}
      </div>

      {files.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed border-terminal-dim rounded-lg text-terminal-text">
          <p>No files in this project yet.</p>
          <p className="text-xs text-terminal-dim mt-2">
            {canUploadMore
              ? 'Use the check-in form to add files to this project.'
              : 'Files will appear here once added by project members.'}
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="min-w-full inline-block">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 text-terminal-dim text-[10px] uppercase font-bold border-b border-terminal-text pb-2 mb-1">
              <div>Filename</div>
              <div>Size</div>
              <div>Uploaded by</div>
              <div className="text-right">Actions</div>
            </div>

            <div className="flex flex-col space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 items-center text-terminal-text text-xs p-2 bg-terminal-input-bg/50 rounded hover:bg-terminal-input-bg/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-terminal-accent">&gt;</span>
                    <span className="truncate">{file.name}</span>
                  </div>
                  <div className="text-[11px] text-terminal-dim">{formatBytes(file.size)}</div>
                  <div className="text-[11px] text-terminal-dim">
                    {file.uploadedBy?.username || 'unknown'}
                    {file.uploadedAt && (
                      <span className="block text-[10px] text-terminal-dim/80">
                        {new Date(file.uploadedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="terminal-button text-[10px] px-2 py-1 bg-transparent text-terminal-text border border-terminal-text hover:bg-[rgba(0,255,0,0.1)]"
                      onClick={() => openInNewTab(file.downloadUrl)}
                    >
                      VIEW
                    </button>
                    <a
                      href={file.downloadUrl}
                      className="terminal-button text-[10px] px-2 py-1 bg-transparent text-terminal-accent border border-terminal-accent hover:bg-[rgba(0,255,0,0.1)]"
                      download={file.name}
                    >
                      DOWNLOAD
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesComponent;
