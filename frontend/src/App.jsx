// frontend/src/App.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import InteractiveMap from './components/InteractiveMap';
import SearchBar from './components/SearchBar';
import CountryPopup from './components/CountryPopup';
import LayerControl from './components/LayerControl';
import TimelineSlider from './components/TimelineSlider';
import Dashboard from './components/Dashboard';
import AddModal from './components/AddModal';
import useActors from './hooks/useActors';

const DEFAULT_LAYERS = ['alliances', 'trade', 'sanctions', 'conflicts', 'rivalry', 'cooperation', 'markers'];

export default function App() {
  const { actors, connections, heatmapPoints, loading, error, lastUpdated, refresh } = useActors();

  const [activeLayers, setActiveLayers] = useState(DEFAULT_LAYERS);
  const [selectedIso, setSelectedIso] = useState(null);
  const [popupPos, setPopupPos] = useState(null);
  const [timeFilter, setTimeFilter] = useState(null);
  const [regionFilter, setRegionFilter] = useState('');
  const [showDashboard, setShowDashboard] = useState(true);
  const [addModal, setAddModal] = useState(null); // null | { prefill? }
  const leafletMapRef = useRef(null);

  // ── Layer toggle handler ──────────────────────────────────────────────────────
  const handleLayerToggle = useCallback((id) => {
    if (id.startsWith('_minStrength:')) return; // handled separately
    setActiveLayers(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  }, []);

  // ── Country selection (from search, map click, or dashboard) ─────────────────
  const handleCountrySelect = useCallback((actor) => {
    if (!actor?.isoCode) return;
    setSelectedIso(actor.isoCode);

    // Pan map to country
    if (actor.coordinates?.coordinates) {
      const [lon, lat] = actor.coordinates.coordinates;
      // Access Leaflet map via window (InteractiveMap doesn't expose ref easily)
      setTimeout(() => {
        const maps = document.querySelectorAll('.leaflet-container');
        if (maps.length > 0) {
          const map = maps[0]._leaflet_id && L.map ? null : null;
          // We'll use a simpler pan approach via a custom event
          window.dispatchEvent(new CustomEvent('geolink:panTo', { detail: { lat, lon } }));
        }
      }, 100);
    }
  }, []);

  // ── Close popup ───────────────────────────────────────────────────────────────
  const handleClosePopup = useCallback(() => setSelectedIso(null), []);

  // ── Open "View Full" from popup (future route) ────────────────────────────────
  const handleViewFull = useCallback((actor) => {
    // For now, keep popup open but could navigate to /country/:iso
    console.log('View full:', actor.name);
  }, []);

  // ── Filtered connections by active layers ────────────────────────────────────
  const filteredConnections = connections.filter(c => {
    const layerMap = {
      alliance: 'alliances', trade: 'trade', sanction: 'sanctions',
      conflict: 'conflicts', rivalry: 'rivalry', cooperation: 'cooperation', neutral: 'cooperation',
    };
    const layer = layerMap[c.relationType];
    return layer && activeLayers.includes(layer);
  });

  // ── Region-filtered actors ────────────────────────────────────────────────────
  const filteredActors = regionFilter
    ? actors.filter(a => a.region === regionFilter)
    : actors;

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#030712' }}>
      {/* ── Full-screen Map ── */}
      <InteractiveMap
        actors={filteredActors}
        connections={filteredConnections}
        heatmapPoints={heatmapPoints}
        activeLayers={activeLayers}
        timeFilter={timeFilter}
        onCountryClick={handleCountrySelect}
      />

      {/* ── Top bar ── */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center px-4 py-2.5 gap-3"
        style={{
          background: 'linear-gradient(180deg, rgba(6,11,22,0.98) 0%, rgba(6,11,22,0.0) 100%)',
          zIndex: 900,
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0 mr-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.3)',
              boxShadow: '0 0 12px rgba(0,212,255,0.2)',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="#00d4ff" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-display font-bold text-[#00d4ff] tracking-widest leading-none">
              GEOLINK
            </div>
            <div className="text-[8px] font-mono text-[#334155] tracking-widest leading-none">
              VAULT
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-sm">
          <SearchBar
            onSelect={handleCountrySelect}
            onAddNew={(opts) => setAddModal(opts || {})}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {/* Add new button */}
          <button
            onClick={() => setAddModal({})}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.25)',
              color: '#00d4ff',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,212,255,0.08)'}
          >
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Data
          </button>

          {/* Dashboard toggle */}
          <button
            onClick={() => setShowDashboard(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: showDashboard ? 'rgba(155,93,229,0.15)' : 'rgba(13,21,38,0.6)',
              border: `1px solid ${showDashboard ? 'rgba(155,93,229,0.4)' : 'rgba(26,37,64,0.8)'}`,
              color: showDashboard ? '#9b5de5' : '#475569',
            }}
          >
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Intel
          </button>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(13,21,38,0.6)', border: '1px solid rgba(26,37,64,0.8)' }}>
            <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-[#ffb020] animate-pulse' : 'bg-[#00ff88]'}`} style={{ boxShadow: loading ? '0 0 4px #ffb020' : '0 0 4px #00ff88' }} />
            <span className="text-[9px] font-mono text-[#475569]">
              {loading ? 'LOADING' : 'LIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Layer control panel (left) ── */}
      <LayerControl
        activeLayers={activeLayers}
        onToggle={handleLayerToggle}
        regionFilter={regionFilter}
        onRegionFilter={setRegionFilter}
      />

      {/* ── Country popup (floating card) ── */}
      {selectedIso && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 rounded-xl overflow-hidden"
          style={{ zIndex: 1000, boxShadow: '0 8px 40px rgba(0,0,0,0.7)' }}
        >
          <CountryPopup
            isoCode={selectedIso}
            onViewFull={handleViewFull}
            onClose={handleClosePopup}
          />
        </div>
      )}

      {/* ── Dashboard sidebar (right) ── */}
      {showDashboard && (
        <Dashboard
          actors={filteredActors}
          onSelectCountry={handleCountrySelect}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {/* ── Timeline slider (bottom center) ── */}
      <TimelineSlider onTimeChange={setTimeFilter} />

      {/* ── Loading overlay ── */}
      {loading && actors.length === 0 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{ background: 'rgba(6,11,22,0.92)', zIndex: 2000 }}
        >
          <div className="relative">
            <div className="w-16 h-16 border border-[rgba(0,212,255,0.2)] rounded-full" />
            <div
              className="absolute inset-0 border-t-2 border-[#00d4ff] rounded-full animate-spin"
              style={{ boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}
            />
            <svg
              className="absolute inset-0 m-auto"
              width="24" height="24" fill="none" stroke="#00d4ff" strokeWidth="1.5" viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div className="text-center">
            <div className="text-sm font-display font-bold text-[#00d4ff] tracking-widest mb-1">GEOLINK VAULT</div>
            <div className="text-[11px] font-mono text-[#475569]">Loading geopolitical intelligence…</div>
          </div>
        </div>
      )}

      {/* ── Error toast ── */}
      {error && (
        <div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg flex items-center gap-2"
          style={{
            background: 'rgba(255,56,96,0.12)',
            border: '1px solid rgba(255,56,96,0.3)',
            color: '#ff6b87',
            zIndex: 1500,
          }}
        >
          <span className="text-sm">⚠</span>
          <span className="text-[11px] font-mono">API Error: {error} — Is the backend running?</span>
        </div>
      )}

      {/* ── Stats ribbon ── */}
      {!loading && actors.length > 0 && (
        <div
          className="absolute bottom-4 left-4 flex items-center gap-3 px-3 py-1.5 rounded-lg"
          style={{
            background: 'rgba(10,15,30,0.85)',
            border: '1px solid rgba(26,37,64,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 800,
          }}
        >
          <StatPill icon="🌍" value={actors.length} label="Countries" />
          <div className="w-px h-4" style={{ background: 'rgba(26,37,64,0.8)' }} />
          <StatPill icon="🔗" value={connections.length} label="Relations" />
          <div className="w-px h-4" style={{ background: 'rgba(26,37,64,0.8)' }} />
          <StatPill icon="⚡" value={actors.reduce((s, a) => s + (a.eventCount || 0), 0)} label="Events" />
          {lastUpdated && (
            <>
              <div className="w-px h-4" style={{ background: 'rgba(26,37,64,0.8)' }} />
              <span className="text-[9px] font-mono text-[#334155]">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Add Modal ── */}
      {addModal !== null && (
        <AddModal
          prefill={addModal}
          onClose={() => setAddModal(null)}
          onSuccess={() => { refresh(); setAddModal(null); }}
        />
      )}
    </div>
  );
}

const StatPill = ({ icon, value, label }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-sm leading-none">{icon}</span>
    <div>
      <div className="text-[10px] font-mono font-bold text-[#00d4ff] leading-none">{value?.toLocaleString()}</div>
      <div className="text-[8px] text-[#334155] uppercase tracking-wider leading-none mt-0.5">{label}</div>
    </div>
  </div>
);
