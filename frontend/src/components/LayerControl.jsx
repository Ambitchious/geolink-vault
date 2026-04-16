// frontend/src/components/LayerControl.jsx
import React from 'react';
import { RELATION_COLORS } from '../utils/mapUtils';

const LAYERS = [
  { id: 'alliances',     label: 'Alliances',    color: RELATION_COLORS.alliance,    icon: '🤝' },
  { id: 'trade',         label: 'Trade Routes',  color: RELATION_COLORS.trade,       icon: '📦' },
  { id: 'sanctions',     label: 'Sanctions',     color: RELATION_COLORS.sanction,    icon: '🚫' },
  { id: 'conflicts',     label: 'Conflicts',     color: RELATION_COLORS.conflict,    icon: '⚔️' },
  { id: 'rivalry',       label: 'Rivalries',     color: RELATION_COLORS.rivalry,     icon: '⚡' },
  { id: 'cooperation',   label: 'Cooperation',   color: RELATION_COLORS.cooperation, icon: '🔗' },
  { id: 'heatmap',       label: 'Conflict Heat', color: '#ff3860',                   icon: '🔥' },
  { id: 'markers',       label: 'Event Markers', color: '#ffb020',                   icon: '📍' },
];

const REGIONS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Middle East', 'Central Asia'];

export default function LayerControl({ activeLayers, onToggle, regionFilter, onRegionFilter }) {
  return (
    <div
      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'rgba(10, 15, 30, 0.92)',
        border: '1px solid rgba(26, 37, 64, 0.9)',
        backdropFilter: 'blur(16px)',
        width: '176px',
        zIndex: 800,
        boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 border-b"
        style={{ borderColor: 'rgba(26,37,64,0.8)', background: 'rgba(0,212,255,0.05)' }}
      >
        <div className="flex items-center gap-1.5">
          <svg width="10" height="10" fill="none" stroke="#00d4ff" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="text-[10px] font-display font-bold text-[#00d4ff] tracking-widest uppercase">
            Layers
          </span>
        </div>
      </div>

      {/* Layer toggles */}
      <div className="p-2 space-y-0.5">
        {LAYERS.map(layer => {
          const active = activeLayers.includes(layer.id);
          return (
            <button
              key={layer.id}
              onClick={() => onToggle(layer.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded transition-all text-left"
              style={{
                background: active ? `${layer.color}15` : 'transparent',
                border: `1px solid ${active ? layer.color + '35' : 'transparent'}`,
              }}
            >
              {/* Toggle dot */}
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0 transition-all"
                style={{
                  background: active ? layer.color : 'rgba(26,37,64,0.8)',
                  boxShadow: active ? `0 0 6px ${layer.color}80` : 'none',
                }}
              />
              <span className="text-[10px] leading-none" style={{ color: active ? layer.color : '#475569' }}>
                {layer.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Region filter */}
      <div
        className="border-t px-3 py-2"
        style={{ borderColor: 'rgba(26,37,64,0.8)' }}
      >
        <p className="text-[9px] font-mono text-[#334155] uppercase tracking-wider mb-1.5">Region Filter</p>
        <select
          value={regionFilter}
          onChange={e => onRegionFilter(e.target.value)}
          className="w-full text-[10px] px-2 py-1.5 rounded outline-none"
          style={{
            background: 'rgba(13,21,38,0.8)',
            border: '1px solid rgba(26,37,64,0.9)',
            color: regionFilter ? '#00d4ff' : '#64748b',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <option value="">All Regions</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Min strength filter */}
      <div
        className="border-t px-3 pb-2.5 pt-2"
        style={{ borderColor: 'rgba(26,37,64,0.8)' }}
      >
        <p className="text-[9px] font-mono text-[#334155] uppercase tracking-wider mb-1.5">
          Min Strength: <span className="text-[#00d4ff]">{activeLayers._minStrength || 0}</span>
        </p>
        <div className="timeline-slider">
          <input
            type="range"
            min="0" max="9" step="1"
            defaultValue="0"
            style={{ width: '100%' }}
            onChange={e => onToggle('_minStrength:' + e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
