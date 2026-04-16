// frontend/src/hooks/useActors.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchActors, fetchConnections, fetchConflictHeatmap } from '../utils/api';

export default function useActors() {
  const [actors, setActors] = useState([]);
  const [connections, setConnections] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const loadAll = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const [actorsRes, connectionsRes, heatRes] = await Promise.all([
        fetchActors({ limit: 300 }),
        fetchConnections(filters),
        fetchConflictHeatmap(filters),
      ]);

      setActors(actorsRes.data || []);
      setConnections(connectionsRes.data || []);

      // Transform heatmap: [[lat, lon, weight], ...]
      const heat = (heatRes.data || [])
        .filter(p => p.lat && p.lon)
        .map(p => [p.lat, p.lon, Math.min(1, p.weight / 10)]);
      setHeatmapPoints(heat);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('useActors load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    // Poll every 5 minutes for live updates
    intervalRef.current = setInterval(() => loadAll(), 5 * 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, [loadAll]);

  const refresh = (filters) => loadAll(filters);

  // Build actor lookup map for O(1) access
  const actorMap = actors.reduce((m, a) => {
    m[a.isoCode] = a;
    return m;
  }, {});

  return { actors, connections, heatmapPoints, loading, error, lastUpdated, refresh, actorMap };
}
