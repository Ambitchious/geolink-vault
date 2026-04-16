// frontend/src/components/CountryPopup.jsx
import React, { useEffect, useState } from 'react';
import { fetchActor } from '../utils/api';
import { RELATION_COLORS, formatNumber, formatDate } from '../utils/mapUtils';

const Badge = ({ type, label }) => (
  <span className={`badge-${type} text-[10px] px-2 py-0.5 rounded font-mono font-medium`}>
    {label || type}
  </span>
);

export default function CountryPopup({ isoCode, onViewFull, onClose }) {
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // overview | relations | events

  useEffect(() => {
    if (!isoCode) return;
    setLoading(true);
    fetchActor(isoCode)
      .then(res => setActor(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isoCode]);

  if (loading) return (
    <div className="w-64 p-4 flex items-center justify-center gap-2">
      <div className="w-4 h-4 border border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
      <span className="text-[11px] font-mono text-[#64748b]">Loading…</span>
    </div>
  );

  if (!actor) return (
    <div className="w-64 p-4 text-[#ff3860] text-sm">Country data unavailable</div>
  );

  const recentEvents = actor.events
    ? [...actor.events].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4)
    : [];

  const activeRelations = actor.relations
    ? actor.relations.filter(r => r.status === 'active').slice(0, 5)
    : [];

  return (
    <div className="w-72" style={{ fontFamily: "'Syne', sans-serif" }}>
      {/* ── Header ── */}
      <div
        className="px-4 py-3 rounded-t-lg"
        style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(155,93,229,0.08))' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{actor.flag_emoji || '🌐'}</span>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">{actor.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-mono text-[#00d4ff] bg-[rgba(0,212,255,0.1)] px-1.5 py-0.5 rounded">
                  {actor.isoCode}
                </span>
                <span className="text-[10px] text-[#64748b]">{actor.region}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#475569] hover:text-[#00d4ff] transition-colors mt-0.5">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick stats row */}
        <div className="flex gap-3 mt-2.5">
          <StatChip label="Population" value={formatNumber(actor.population)} />
          <StatChip label="GDP" value={`$${formatNumber(actor.gdp)}B`} />
          <StatChip label="Relations" value={actor.relations?.length || 0} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b" style={{ borderColor: 'rgba(26,37,64,0.8)' }}>
        {['overview', 'relations', 'events'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 text-[10px] font-mono uppercase tracking-wider transition-all"
            style={{
              color: tab === t ? '#00d4ff' : '#475569',
              borderBottom: tab === t ? '2px solid #00d4ff' : '2px solid transparent',
              background: tab === t ? 'rgba(0,212,255,0.04)' : 'transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="p-3 max-h-52 overflow-y-auto">
        {tab === 'overview' && (
          <div className="space-y-2">
            <InfoRow label="Capital" value={actor.capital} />
            <InfoRow label="Government" value={actor.government_type} />
            <InfoRow label="Military $" value={`$${formatNumber(actor.military_spend)}B`} />
            <InfoRow label="UN Member" value={actor.un_member ? '✓ Yes' : '✗ No'} />
            <div className="mt-2 pt-2 border-t" style={{ borderColor: 'rgba(26,37,64,0.8)' }}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#64748b]">Conflict events</span>
                <span className="text-[11px] font-mono text-[#ff3860]">
                  {actor.events?.filter(e => e.type === 'conflict').length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-[#64748b]">Active relations</span>
                <span className="text-[11px] font-mono text-[#00d4ff]">
                  {actor.relations?.filter(r => r.status === 'active').length || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {tab === 'relations' && (
          <div className="space-y-1.5">
            {activeRelations.length === 0 && (
              <p className="text-[11px] text-[#475569] font-mono">No relations found</p>
            )}
            {activeRelations.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1.5 rounded"
                style={{ background: `${RELATION_COLORS[r.type]}11`, border: `1px solid ${RELATION_COLORS[r.type]}22` }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: RELATION_COLORS[r.type] }} />
                  <span className="text-[11px] text-[#cbd5e1]">{r.targetCountryName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge type={r.type} label={r.type} />
                  <span className="text-[9px] font-mono text-[#64748b]">{r.strength}/10</span>
                </div>
              </div>
            ))}
            {actor.relations?.length > 5 && (
              <p className="text-[9px] text-[#475569] font-mono text-center pt-1">
                +{actor.relations.length - 5} more relations
              </p>
            )}
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-2">
            {recentEvents.length === 0 && (
              <p className="text-[11px] text-[#475569] font-mono">No events recorded</p>
            )}
            {recentEvents.map((ev, i) => (
              <div key={i} className="relative pl-3">
                <div
                  className="absolute left-0 top-1 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: ev.type === 'conflict' ? '#ff3860'
                      : ev.type === 'diplomatic' ? '#00d4ff'
                      : ev.type === 'economic' ? '#ffb020' : '#9b5de5',
                  }}
                />
                <p className="text-[11px] text-[#cbd5e1] leading-snug">{ev.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-mono text-[#475569]">{formatDate(ev.date)}</span>
                  {ev.fatalities > 0 && (
                    <span className="text-[9px] font-mono text-[#ff3860]">
                      {ev.fatalities} fatalities
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-3 pb-3">
        <button
          onClick={() => onViewFull(actor)}
          className="w-full py-2 rounded text-[11px] font-medium transition-all"
          style={{
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            color: '#00d4ff',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,212,255,0.1)'}
        >
          View Full Profile →
        </button>
      </div>
    </div>
  );
}

const StatChip = ({ label, value }) => (
  <div className="flex-1 text-center">
    <div className="text-[10px] font-mono text-[#00d4ff]">{value}</div>
    <div className="text-[9px] text-[#475569]">{label}</div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-[10px] text-[#64748b]">{label}</span>
    <span className="text-[11px] text-[#cbd5e1] font-mono">{value || 'N/A'}</span>
  </div>
);
