import React from 'react';

const FilesComponent = ({ files, canEdit, checkoutStatus }) => {
  const buttonClass = (colorVar) => `
    terminal-button text-[10px] py-1 px-2 bg-transparent text-[${colorVar}] border-[${colorVar}] 
    hover:bg-[rgba(0,255,0,0.1)]
  `;

  return (
    <div className="font-fira-code">
      <div className="flex justify-between items-center mb-4 border-b border-terminal-dim pb-2">
        <h3 className="text-base font-bold text-terminal-accent">
          &gt; PROJECT_FILES
          <span className="cursor animate-blink">_</span>
        </h3>
        {canEdit && checkoutStatus === 'checked-out' && (
          <button className={`${buttonClass('var(--terminal-accent)')}`}>
            ADD_FILES
          </button>
        )}
      </div>

      {files.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed border-terminal-dim rounded-lg text-terminal-text">
          <p>No files in this project</p>
          <p className="text-xs text-terminal-dim mt-2">
            {canEdit ? 'Checkout the project to add files' : 'Files will appear here when added'}
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="min-w-full inline-block">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-2 text-terminal-dim text-[10px] uppercase font-bold border-b border-terminal-text pb-2 mb-1">
              <div className="col-span-1">FILENAME</div>
              <div className="col-span-1">SIZE</div>
              <div className="col-span-1">MODIFIED</div>
              <div className="col-span-1 text-right">ACTIONS</div>
            </div>
            
            {/* Table Rows */}
            <div className="flex flex-col space-y-2">
              {files.map(file => (
                <div key={file.id} className="grid grid-cols-4 gap-2 items-center text-terminal-text text-xs p-2 bg-terminal-input-bg/50 rounded hover:bg-terminal-input-bg/70 transition-colors">
                  <div className="col-span-1 flex items-center">
                    <span className="text-terminal-accent mr-1">&gt;</span>
                    <span className="truncate">{file.name}</span>
                  </div>
                  <div className="col-span-1 text-[11px] text-terminal-dim">{file.size}</div>
                  <div className="col-span-1 text-[11px] text-terminal-dim">{file.modified}</div>
                  <div className="col-span-1 flex justify-end space-x-2">
                    <button className={`${buttonClass('var(--terminal-text)')}`}>
                      VIEW
                    </button>
                    <button className={`${buttonClass('var(--terminal-accent)')}`}>
                      DOWNLOAD
                    </button>
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
