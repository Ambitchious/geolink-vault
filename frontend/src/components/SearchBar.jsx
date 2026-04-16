// frontend/src/components/SearchBar.jsx
import React, { useRef, useEffect } from 'react';
import useAutocomplete from '../hooks/useAutocomplete';
import { RELATION_COLORS } from '../utils/mapUtils';

/**
 * Floating live-search bar (Atlas Search autocomplete).
 * Every keystroke fires a new query with 120ms debounce.
 */
export default function SearchBar({ onSelect, onAddNew }) {
  const { query, setQuery, results, loading, open, setOpen, clear } = useAutocomplete();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setOpen]);

  const handleSelect = (actor) => {
    onSelect(actor);
    clear();
  };

  const noResults = open && !loading && query.length >= 2 && results.length === 0;

  return (
    <div className="relative w-full max-w-sm" style={{ zIndex: 1000 }}>
      {/* ── Input ── */}
      <div className="relative flex items-center">
        {/* Search icon */}
        <div className="absolute left-3 text-[#00d4ff] pointer-events-none">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search countries, events…"
          className="w-full pl-9 pr-8 py-2.5 text-sm rounded-lg outline-none transition-all duration-200"
          style={{
            background: 'rgba(10, 15, 30, 0.95)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            color: '#e2e8f0',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            boxShadow: open ? '0 0 20px rgba(0,212,255,0.15)' : 'none',
          }}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Loading spinner / clear */}
        <div className="absolute right-3">
          {loading ? (
            <div className="w-3 h-3 border border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
          ) : query ? (
            <button onClick={clear} className="text-[#64748b] hover:text-[#00d4ff] transition-colors">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Dropdown ── */}
      {open && (results.length > 0 || noResults) && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden"
          style={{
            background: 'rgba(10, 15, 30, 0.98)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(0,212,255,0.08)',
          }}
        >
          {results.length > 0 && (
            <ul>
              {results.map((actor, i) => (
                <li key={actor._id || i}>
                  <button
                    onClick={() => handleSelect(actor)}
                    className="w-full px-3 py-2.5 text-left flex items-center gap-2.5 transition-colors hover:bg-[rgba(0,212,255,0.08)] group"
                  >
                    {/* Flag */}
                    <span className="text-lg leading-none flex-shrink-0">{actor.flag_emoji || '🌐'}</span>

                    {/* Country info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[#e2e8f0] group-hover:text-[#00d4ff] transition-colors truncate">
                          {actor.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#64748b] flex-shrink-0">
                          {actor.isoCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#64748b]">{actor.region}</span>
                        {actor.capital && (
                          <>
                            <span className="text-[#1a2540]">·</span>
                            <span className="text-[10px] text-[#475569]">{actor.capital}</span>
                          </>
                        )}
                      </div>

                      {/* Matched relations */}
                      {actor.matchedRelations?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {actor.matchedRelations.slice(0, 3).map((r, ri) => (
                            <span
                              key={ri}
                              className="text-[9px] px-1.5 py-0.5 rounded"
                              style={{
                                background: `${RELATION_COLORS[r.type]}22`,
                                color: RELATION_COLORS[r.type],
                                border: `1px solid ${RELATION_COLORS[r.type]}44`,
                              }}
                            >
                              {r.targetCountryName} · {r.type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Score */}
                    {actor.score && (
                      <span className="text-[9px] font-mono text-[#334155] flex-shrink-0">
                        {actor.score.toFixed(2)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* No results — offer to add */}
          {noResults && (
            <div className="p-3">
              <p className="text-[11px] text-[#64748b] mb-2 font-mono">
                No results for "<span className="text-[#00d4ff]">{query}</span>"
              </p>
              <button
                onClick={() => { onAddNew({ prefill: query }); setOpen(false); }}
                className="w-full py-2 px-3 rounded text-[12px] font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  color: '#00d4ff',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add "{query}" to database
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
