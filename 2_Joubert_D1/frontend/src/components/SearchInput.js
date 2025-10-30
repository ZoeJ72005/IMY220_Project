import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './SearchInput.css';

const SearchInput = ({ onSearch, placeholder = 'search_terminal...' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('projects');
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const termFromUrl = params.get('term');
    const typeFromUrl = params.get('type');

    if (termFromUrl !== null) {
      setSearchTerm(termFromUrl);
    }
    if (typeFromUrl && ['projects', 'users', 'tags', 'activity'].includes(typeFromUrl)) {
      setSearchType(typeFromUrl);
    } else if (!typeFromUrl) {
      setSearchType('projects');
    }

    setSearchResults([]);
  }, [location.search]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const trimmedTerm = searchTerm.trim();
    if (onSearch) {
      await fetchSearch(trimmedTerm, searchType);
      onSearch(trimmedTerm, searchType);
    } else {
      setSearchResults([]);
      navigate(
        `/search?term=${encodeURIComponent(trimmedTerm)}&type=${encodeURIComponent(searchType)}`
      );
    }
  };

  const fetchSearch = async (term, type) => {
    try {
      const response = await fetch(
        `/api/search?term=${encodeURIComponent(term)}&type=${encodeURIComponent(type)}`
      );
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

  const handleChange = (event) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className="search-input">
      <form onSubmit={handleSubmit} className="search-input__form">
        <div className="search-input__type">
          <label className="search-input__label" htmlFor="global-search-type">
            Search scope
          </label>
          <select
            id="global-search-type"
            className="search-input__select"
            value={searchType}
            onChange={(event) => setSearchType(event.target.value)}
          >
            <option value="projects">Projects</option>
            <option value="users">Users</option>
            <option value="tags">Tags</option>
            <option value="activity">Check-ins</option>
          </select>
        </div>

        <div className="search-input__controls">
          <label className="search-input__label" htmlFor="global-search-input">
            Search term
          </label>
          <input
            id="global-search-input"
            type="text"
            className="search-input__field"
            value={searchTerm}
            onChange={handleChange}
            placeholder={placeholder}
            autoComplete="off"
          />
          <button type="submit" className="search-input__button">
            Search
          </button>
        </div>
      </form>

      {searchResults.length > 0 && (
        <div className="search-input__results" role="listbox">
          <div className="search-input__results-header">
            &gt; {searchResults.length} results found
          </div>
          <div className="search-input__results-body">
            {searchResults.map((result) => {
              const isUser = result.type === 'users';
              const isActivity = result.type === 'activity';
              const linkTarget = isUser
                ? `/profile/${result.id}`
                : isActivity
                ? result.projectId
                  ? `/project/${result.projectId}`
                  : `/search?term=${encodeURIComponent(searchTerm)}&type=projects`
                : `/project/${result.id}`;

              return (
                <Link
                  key={result.id}
                  to={linkTarget}
                  className="search-input__result"
                  role="option"
                >
                  <span className="search-input__result-name">{result.name}</span>
                  <span className="search-input__result-type">
                    ({result.type.toUpperCase()})
                  </span>
                  {result.description && (
                    <span className="search-input__result-description">
                      {result.description.length > 80
                        ? `${result.description.slice(0, 80)}...`
                        : result.description}
                    </span>
                  )}
                  {isActivity && result.user && (
                    <span className="search-input__result-meta">
                      by {result.user.username}
                      {result.time && ` • ${result.time}`}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchInput;
