import React, { useState } from 'react';

const SearchInput = ({ onSearch, placeholder = "search_terminal..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('projects');
  const [searchResults, setSearchResults] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
        await fetchSearch(searchTerm.trim(), searchType);
    } else {
        setSearchResults([]);
    }
  };

  const fetchSearch = async (term, type) => {
    try {
        // Assuming onSearch is a function passed down to handle navigation/state updates
        // For D2 completion, we'll implement the fetch here to get results
        const response = await fetch(`/api/search?term=${term}&type=${type}`);
        const data = await response.json();
        
        if (data.success) {
            setSearchResults(data.results);
        } else {
            console.error('Search failed:', data.message);
            setSearchResults([]);
        }
    } catch (error) {
        console.error('Network error during search:', error);
        setSearchResults([]);
    }
  };

  const handleChange = (e) => {
    setSearchTerm(e.target.value);
    // Optional: debounce search input if performance is an issue
  };
  
  const handleSuggestionClick = (term, type) => {
      fetchSearch(term, type);
      setSearchTerm(term);
  };

  const buttonClass = `terminal-button text-[11px] px-3 py-1.5 bg-transparent text-terminal-text border border-terminal-text cursor-pointer transition-all duration-300 hover:bg-terminal-button-hover hover:shadow-[0_0_10px_var(--terminal-text)]`;

  return (
    <div className="relative w-full font-fira-code">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 items-center">
        
        {/* Search Type Selector */}
        <div className="w-full sm:min-w-[120px] sm:w-auto">
          <select 
            className="terminal-input text-[11px] px-2 py-1.5 w-full bg-terminal-input-bg border border-terminal-text text-terminal-text"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
          >
            <option value="projects">PROJECTS</option>
            <option value="users">USERS</option>
            <option value="tags">TAGS</option>
          </select>
        </div>
        
        {/* Input and Button */}
        <div className="flex flex-1 w-full gap-2">
          <input
            type="text"
            className="terminal-input flex-1 text-sm px-2.5 py-1.5 bg-terminal-input-bg border border-terminal-text text-terminal-text"
            value={searchTerm}
            onChange={handleChange}
            placeholder={placeholder}
          />
          <button type="submit" className={buttonClass}>
            SEARCH
          </button>
        </div>
      </form>
      
      {/* Search Results / Suggestions */}
      {searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-terminal-bg border border-terminal-border border-t-0 rounded-b-lg shadow-[0_5px_15px_rgba(0,255,0,0.2)] z-10 mt-0.5">
          <div className="p-3 text-[10px] text-terminal-accent bg-terminal-input-bg border-b border-terminal-dim">
            &gt; {searchResults.length} RESULTS FOUND:
          </div>
          <div className="py-1.5">
            {searchResults.map(result => (
                <Link 
                    key={result.id} 
                    to={`/${result.type === 'users' ? 'profile' : 'project'}/${result.id}`}
                    className="w-full p-2.5 block no-underline text-terminal-text text-[11px] text-left transition-colors duration-300 hover:bg-terminal-button-hover hover:text-terminal-accent"
                >
                    <span className="font-bold">{result.name}</span> 
                    <span className="text-terminal-dim ml-2">({result.type.toUpperCase()})</span>
                </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchInput;
