import React, { useState } from 'react';
import '../styles/SearchInput.css';

const SearchInput = ({ onSearch, placeholder = "search_terminal..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('projects');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim(), searchType);
    }
  };

  const handleChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="search-input-container">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-type-selector">
          <select 
            className="search-type terminal-input"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
          >
            <option value="projects">PROJECTS</option>
            <option value="users">USERS</option>
            <option value="tags">TAGS</option>
          </select>
        </div>
        
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input terminal-input"
            value={searchTerm}
            onChange={handleChange}
            placeholder={placeholder}
          />
          <button type="submit" className="search-button terminal-button">
            SEARCH
          </button>
        </div>
      </form>
      
      {searchTerm && (
        <div className="search-suggestions">
          <div className="suggestion-header">
            &gt; SUGGESTIONS:
          </div>
          <div className="suggestion-list">
            <button className="suggestion-item">
              {searchType === 'projects' && `"${searchTerm}" in project names`}
              {searchType === 'users' && `"${searchTerm}" in usernames`}
              {searchType === 'tags' && `#${searchTerm} tag`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchInput;