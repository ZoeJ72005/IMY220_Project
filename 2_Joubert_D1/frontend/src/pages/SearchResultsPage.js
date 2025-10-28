import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Header from '../components/Header';

const SearchResultsPage = ({ user, onLogout }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const term = searchParams.get('term') || '';
  const type = searchParams.get('type') || 'projects';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const runSearch = async () => {
      if (!term || !type) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/search?term=${encodeURIComponent(term)}&type=${encodeURIComponent(type)}`);
        const data = await response.json();
        if (data.success) {
          setResults(data.results || []);
        } else {
          setError(data.message || 'Unable to load search results.');
        }
      } catch (fetchError) {
        setError('Network error while searching.');
      } finally {
        setLoading(false);
      }
    };

    runSearch();
  }, [term, type]);

  const renderResultLink = (result) => {
    if (result.type === 'users') {
      return `/profile/${result.id}`;
    }
    if (result.type === 'activity') {
      return result.projectId
        ? `/project/${result.projectId}`
        : `/search?term=${encodeURIComponent(result.name)}&type=projects`;
    }
    return `/project/${result.id}`;
  };

  return (
    <div className="bg-terminal-bg min-h-screen">
      <Header user={user} onLogout={onLogout} />

      <main className="p-5 max-w-5xl mx-auto">
        <div className="mb-4 font-fira-code text-terminal-text">
          <h1 className="text-xl mb-2">
            &gt; SEARCH_RESULTS
            <span className="cursor animate-blink">_</span>
          </h1>
          <p className="text-xs text-terminal-dim">
            Showing results for <span className="text-terminal-accent">"{term}"</span> in{' '}
            <span className="text-terminal-accent">{type.toUpperCase()}</span>
          </p>
        </div>

        {loading && (
          <div className="text-terminal-text text-sm font-fira-code">
            Searching<span className="cursor animate-blink">_</span>
          </div>
        )}

        {!loading && error && (
          <div className="text-terminal-error text-sm font-fira-code border border-terminal-error p-3 bg-terminal-input-bg/40">
            ERROR: {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="text-terminal-text text-sm font-fira-code border border-terminal-dim border-dashed rounded p-6">
            No results found. Try a different search term.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((result) => (
            <Link
              key={`${result.type}-${result.id}`}
              to={renderResultLink(result)}
              className="border border-terminal-border rounded-lg p-4 bg-terminal-bg/80 hover:border-terminal-accent transition-all duration-200 shadow-[0_0_10px_rgba(0,255,0,0.1)] no-underline"
            >
              <div className="flex justify-between items-center mb-2 font-fira-code text-xs text-terminal-dim uppercase">
                <span>{result.type}</span>
              </div>
              <h2 className="text-terminal-text text-base font-fira-code mb-2">&gt; {result.name}</h2>
              <p className="text-terminal-dim text-[11px] font-fira-code leading-relaxed">
                {result.description}
              </p>
              {result.type === 'activity' && result.user && (
                <p className="text-terminal-accent text-[10px] mt-2">
                  {result.user.username}
                  {result.time && <span className="text-terminal-dim ml-2">{result.time}</span>}
                </p>
              )}
              {(result.imageUrl || result.projectImage) && (
                <div className="mt-3 border border-terminal-dim rounded overflow-hidden">
                  <img
                    src={result.imageUrl || result.projectImage}
                    alt={`${result.name} preview`}
                    className="w-full h-32 object-cover"
                  />
                </div>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default SearchResultsPage;



