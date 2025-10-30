import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Feed from '../components/Feed';
import PendingRequestsCard from '../components/PendingRequestsCard';


const HomePage = ({ user, onLogout, onUserUpdate, theme, onToggleTheme }) => {
  const [feedType, setFeedType] = useState('local'); // 'local' or 'global'
  const navigate = useNavigate();
  const feedRef = useRef(null);

  const scrollToFeed = () => {
    if (feedRef.current) {
      feedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNewProject = () => {
    if (user?.id) {
      navigate(`/profile/${user.id}?tab=create`);
    } else {
      navigate('/profile');
    }
  };

  const handleBrowseProjects = () => {
    setFeedType('global');
    scrollToFeed();
  };

  const handleViewProfile = () => {
    if (user?.id) {
      navigate(`/profile/${user.id}`);
    }
  };

  const buttonClass = `terminal-button text-xs px-3 py-2 text-left`;

  return (
    <div className="min-h-screen bg-terminal-bg">
      <Header user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />
      
      <main className="p-5 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          
          {/* Main Terminal Window (Feed) */}
          <div
            ref={feedRef}
            className="bg-terminal-bg border-2 border-terminal-border rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,255,0,0.2)]"
          >
            <div className="bg-terminal-dim p-2.5 px-4 flex items-center border-b border-terminal-border">
              <div className="flex space-x-2 mr-4">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]"></span>
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]"></span>
                <span className="w-3 h-3 rounded-full bg-[#27ca3f]"></span>
              </div>
              <span className="font-fira-code text-sm text-terminal-text">PROJECT_FEED.exe</span>
            </div>
            
            <div className="bg-terminal-input-bg p-4 border-b border-terminal-border flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="flex space-x-2.5 mb-2 md:mb-0">
                <button 
                  className={`border border-terminal-text px-4 py-2 font-fira-code text-xs cursor-pointer transition-all duration-300 ease-in-out ${feedType === 'local' ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent text-terminal-text hover:bg-terminal-button-hover hover:shadow-[0_0_10px_var(--terminal-text)]'}`}
                  onClick={() => setFeedType('local')}
                >
                  &gt; LOCAL_FEED
                </button>
                <button 
                  className={`border border-terminal-text px-4 py-2 font-fira-code text-xs cursor-pointer transition-all duration-300 ease-in-out ${feedType === 'global' ? 'bg-terminal-text text-terminal-bg' : 'bg-transparent text-terminal-text hover:bg-terminal-button-hover hover:shadow-[0_0_10px_var(--terminal-text)]'}`}
                  onClick={() => setFeedType('global')}
                >
                  &gt; GLOBAL_FEED
                </button>
              </div>
              
              <div className="font-fira-code text-[11px] text-terminal-dim">
                <span>
                  {feedType === 'local' 
                    ? 'Showing activity from your network' 
                    : 'Showing all system activity'
                  }
                </span>
              </div>
            </div>
            
            <div className="min-h-[500px] max-h-[70vh] overflow-y-auto p-5">
              <Feed feedType={feedType} user={user} />
            </div>
          </div>
          
          {/* Sidebar */}
          <aside className="flex flex-col gap-5 lg:order-none order-first">
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4 shadow-[0_0_10px_rgba(0,255,0,0.1)]">
              <h3 className="font-fira-code text-sm text-terminal-accent mb-4 border-b border-terminal-dim pb-2">&gt; QUICK_ACTIONS</h3>
              <div className="flex flex-col space-y-2.5">
                <button className={buttonClass} onClick={handleNewProject}>
                  + NEW_PROJECT
                </button>
                <button className={buttonClass} onClick={handleBrowseProjects}>
                  BROWSE_PROJECTS
                </button>
                <button className={buttonClass} onClick={handleViewProfile}>
                  VIEW_PROFILE
                </button>
              </div>
            </div>

            <PendingRequestsCard user={user} onUserUpdate={onUserUpdate} />
            
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4 shadow-[0_0_10px_rgba(0,255,0,0.1)]">
              <h3 className="font-fira-code text-sm text-terminal-accent mb-4 border-b border-terminal-dim pb-2">&gt; SYSTEM_STATUS</h3>
              <div className="flex flex-col space-y-2.5">
                <div className="flex justify-between items-center font-fira-code text-[11px]">
                  <span className="text-terminal-dim">USERS_ONLINE:</span>
                  <span className="text-terminal-accent font-bold">1,337</span>
                </div>
                <div className="flex justify-between items-center font-fira-code text-[11px]">
                  <span className="text-terminal-dim">ACTIVE_PROJECTS:</span>
                  <span className="text-terminal-accent font-bold">42</span>
                </div>
                <div className="flex justify-between items-center font-fira-code text-[11px]">
                  <span className="text-terminal-dim">COMMITS_TODAY:</span>
                  <span className="text-terminal-accent font-bold">256</span>
                </div>
              </div>
            </div>
            
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4 shadow-[0_0_10px_rgba(0,255,0,0.1)]">
              <h3 className="font-fira-code text-sm text-terminal-accent mb-4 border-b border-terminal-dim pb-2">&gt; RECENT_COMMITS</h3>
              <div className="flex flex-col space-y-2">
                <div className="flex flex-col p-3 border border-terminal-dim rounded-md bg-gradient-to-br from-[rgba(0,17,0,0.4)] to-[rgba(0,17,0,0.2)] shadow-[inset_0_0_5px_rgba(0,0,0,0.2)] transition-all duration-300 hover:border-terminal-accent hover:shadow-[inset_0_0_5px_rgba(0,0,0,0.2),_0_0_10px_rgba(0,255,0,0.2)]">
                  <span className="font-fira-code text-[10px] text-terminal-accent">#a1b2c3d</span>
                  <span className="font-fira-code text-[11px] text-terminal-text">Fixed authentication bug</span>
                </div>
                <div className="flex flex-col p-3 border border-terminal-dim rounded-md bg-gradient-to-br from-[rgba(0,17,0,0.4)] to-[rgba(0,17,0,0.2)] shadow-[inset_0_0_5px_rgba(0,0,0,0.2)] transition-all duration-300 hover:border-terminal-accent hover:shadow-[inset_0_0_5px_rgba(0,0,0,0.2),_0_0_10px_rgba(0,255,0,0.2)]">
                  <span className="font-fira-code text-[10px] text-terminal-accent">#e4f5g6h</span>
                  <span className="font-fira-code text-[11px] text-terminal-text">Added terminal theme</span>
                </div>
                <div className="flex flex-col p-3 border border-terminal-dim rounded-md bg-gradient-to-br from-[rgba(0,17,0,0.4)] to-[rgba(0,17,0,0.2)] shadow-[inset_0_0_5px_rgba(0,0,0,0.2)] transition-all duration-300 hover:border-terminal-accent hover:shadow-[inset_0_0_5px_rgba(0,0,0,0.2),_0_0_10px_rgba(0,255,0,0.2)]">
                  <span className="font-fira-code text-[10px] text-terminal-accent">#i7j8k9l</span>
                  <span className="font-fira-code text-[11px] text-terminal-text">Updated README</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
