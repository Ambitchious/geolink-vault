// frontend/src/hooks/useAutocomplete.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { autocomplete } from '../utils/api';

export default function useAutocomplete() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const search = useCallback(async (q) => {
    if (!q || q.trim().length === 0) {
      setResults([]);
      setOpen(false);
      return;
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const data = await autocomplete(q.trim());
      setResults(data.data || []);
      setOpen(true);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Autocomplete error:', err);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Debounce: fire after 120ms of no typing
    clearTimeout(debounceRef.current);
    if (query.length === 0) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 120);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  const clear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return { query, setQuery, results, loading, open, setOpen, clear };
}
