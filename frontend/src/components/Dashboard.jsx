// frontend/src/components/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { fetchTopConnected, fetchConflictRisk } from '../utils/api';
import { RELATION_COLORS, riskColor, formatNumber } from '../utils/mapUtils';

export default function Dashboard({ actors, onSelectCountry, onClose }) {
  const [topConnected, setTopConnected] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [tab, setTab] = useState('network'); // network | risk | stats
  const svgRef = useRef(null);

  useEffect(() => {
    fetchTopConnected().then(r => setTopConnected(r.data || [])).catch(console.error);
    fetchConflictRisk().then(r => setRiskData(r.data || [])).catch(console.error);
  }, []);

  // ── D3 force graph ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'network' || !svgRef.current || actors.length === 0) return;

    const el = svgRef.current;
    const W = el.clientWidth || 280;
    const H = 240;

    d3.select(el).selectAll('*').remove();

    const svg = d3.select(el)
      .attr('width', W)
      .attr('height', H);

    // Background
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'transparent');

    // Build nodes from top-connected actors (limit 12 for clarity)
    const topActors = actors.slice(0, 12);
    const nodes = topActors.map(a => ({
      id: a.isoCode,
      name: a.name,
      flag: a.flag_emoji || '🌐',
      relationCount: a.relationCount || 0,
      r: 5 + Math.min(12, (a.relationCount || 1) * 1.5),
    }));

    const nodeIds = new Set(nodes.map(n => n.id));

    // Build edges from relations
    const links = [];
    topActors.forEach(a => {
      (a.relations || []).forEach(r => {
        if (nodeIds.has(r.targetCountry)) {
          links.push({
            source: a.isoCode,
            target: r.targetCountry,
            type: r.type,
            strength: r.strength,
          });
        }
      });
    });

    // Deduplicate links
    const seenLinks = new Set();
    const uniqueLinks = links.filter(l => {
      const key = [l.source, l.target].sort().join('-');
      if (seenLinks.has(key)) return false;
      seenLinks.add(key);
      return true;
    });

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(uniqueLinks).id(d => d.id).distance(50).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-80))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(d => d.r + 4));

    // Links
    const link = svg.append('g')
      .selectAll('line')
      .data(uniqueLinks)
      .enter().append('line')
      .attr('stroke', d => RELATION_COLORS[d.type] || '#334155')
      .attr('stroke-width', d => 0.5 + (d.strength / 10) * 1.5)
      .attr('stroke-opacity', 0.5);

    // Nodes group
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .style('cursor', 'pointer')
      .on('click', (e, d) => {
        const actor = actors.find(a => a.isoCode === d.id);
        if (actor) onSelectCountry(actor);
      });

    // Node circle
    node.append('circle')
      .attr('r', d => d.r)
      .attr('fill', 'rgba(0,212,255,0.12)')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 0.8)
      .attr('stroke-opacity', 0.6);

    // Node label
    node.append('text')
      .text(d => d.flag)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('font-size', d => `${d.r * 1.1}px`)
      .style('pointer-events', 'none');

    // Tooltip
    node.append('title').text(d => `${d.name} (${d.relationCount} relations)`);

    // Drag
    node.call(
      d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
    );

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${Math.max(d.r, Math.min(W - d.r, d.x))},${Math.max(d.r, Math.min(H - d.r, d.y))})`);
    });

    return () => sim.stop();
  }, [tab, actors, onSelectCountry]);

  return (
    <div
      className="absolute right-4 top-16 bottom-20 rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'rgba(10, 15, 30, 0.92)',
        border: '1px solid rgba(26, 37, 64, 0.9)',
        backdropFilter: 'blur(16px)',
        width: '280px',
        zIndex: 800,
        boxShadow: '-4px 0 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(26,37,64,0.8)', background: 'rgba(0,212,255,0.04)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
          <span className="text-[10px] font-display font-bold text-[#00d4ff] tracking-widest uppercase">
            Intel Dashboard
          </span>
        </div>
        <button onClick={onClose} className="text-[#475569] hover:text-[#00d4ff] transition-colors">
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: 'rgba(26,37,64,0.8)' }}>
        {[
          { id: 'network', label: 'Network' },
          { id: 'risk',    label: 'Risk' },
          { id: 'stats',   label: 'Top Nations' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 text-[9px] font-mono uppercase tracking-wider transition-all"
            style={{
              color: tab === t.id ? '#00d4ff' : '#475569',
              borderBottom: tab === t.id ? '2px solid #00d4ff' : '2px solid transparent',
              background: tab === t.id ? 'rgba(0,212,255,0.04)' : 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Network Tab ── */}
        {tab === 'network' && (
          <div>
            <svg ref={svgRef} className="w-full" style={{ height: '240px' }} />
            <div className="px-3 pb-3">
              <p className="text-[9px] font-mono text-[#334155] text-center mb-2">
                Click a node to select country · Drag to rearrange
              </p>
              {/* Legend */}
              <div className="grid grid-cols-3 gap-1">
                {Object.entries(RELATION_COLORS).slice(0, 6).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1">
                    <div className="w-2 h-0.5 rounded" style={{ background: color }} />
                    <span className="text-[8px] text-[#475569] capitalize">{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Risk Tab ── */}
        {tab === 'risk' && (
          <div className="p-3 space-y-2">
            <p className="text-[9px] font-mono text-[#334155] uppercase tracking-wider mb-2">Conflict Risk by Region</p>
            {riskData.length === 0 ? (
              <p className="text-[11px] text-[#475569] font-mono">Loading risk data…</p>
            ) : riskData.map(r => (
              <div key={r.region} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-[#cbd5e1]">{r.region || 'Unknown'}</span>
                  <span className="text-[10px] font-mono" style={{ color: riskColor(r.riskScore || 0) }}>
                    {(r.riskScore || 0).toFixed(1)} risk
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(26,37,64,0.8)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((r.riskScore || 0) / 30) * 100)}%`,
                      background: riskColor(r.riskScore || 0),
                      boxShadow: `0 0 6px ${riskColor(r.riskScore || 0)}80`,
                    }}
                  />
                </div>
                <div className="flex gap-3">
                  <span className="text-[9px] text-[#475569] font-mono">{r.totalEvents || 0} events</span>
                  <span className="text-[9px] text-[#475569] font-mono">{r.totalFatalities?.toLocaleString() || 0} fatalities</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Stats Tab ── */}
        {tab === 'stats' && (
          <div className="p-3 space-y-1.5">
            <p className="text-[9px] font-mono text-[#334155] uppercase tracking-wider mb-2">Most Connected Nations</p>
            {topConnected.length === 0 ? (
              <p className="text-[11px] text-[#475569] font-mono">Loading…</p>
            ) : topConnected.slice(0, 15).map((c, i) => (
              <button
                key={c.isoCode}
                onClick={() => onSelectCountry({ isoCode: c.isoCode })}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded transition-all text-left"
                style={{ background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span className="text-[9px] font-mono text-[#334155] w-4">{i + 1}</span>
                <span className="text-base leading-none">{c.flag_emoji || '🌐'}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-[#cbd5e1] block truncate">{c.name}</span>
                  <span className="text-[9px] text-[#475569] font-mono">{c.region}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[11px] font-mono text-[#00d4ff]">{c.totalRelations}</div>
                  <div className="text-[8px] text-[#334155]">links</div>
                </div>
                {/* Mini relation breakdown */}
                <div className="flex gap-0.5">
                  {c.allianceCount > 0 && <div className="w-1 rounded-full" style={{ height: `${Math.max(4, c.allianceCount * 2)}px`, background: '#00ff88' }} />}
                  {c.tradeCount > 0 && <div className="w-1 rounded-full" style={{ height: `${Math.max(4, c.tradeCount * 2)}px`, background: '#00d4ff' }} />}
                  {c.sanctionCount > 0 && <div className="w-1 rounded-full" style={{ height: `${Math.max(4, c.sanctionCount * 2)}px`, background: '#ff3860' }} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div
        className="flex border-t px-3 py-2 gap-2 flex-shrink-0"
        style={{ borderColor: 'rgba(26,37,64,0.8)' }}
      >
        <MiniStat label="Countries" value={actors.length} color="#00d4ff" />
        <MiniStat
          label="Connections"
          value={actors.reduce((s, a) => s + (a.relationCount || 0), 0)}
          color="#00ff88"
        />
        <MiniStat
          label="Events"
          value={actors.reduce((s, a) => s + (a.eventCount || 0), 0)}
          color="#ff3860"
        />
      </div>
    </div>
  );
}

const MiniStat = ({ label, value, color }) => (
  <div className="flex-1 text-center">
    <div className="text-[12px] font-mono font-bold" style={{ color }}>{value?.toLocaleString() || 0}</div>
    <div className="text-[8px] text-[#334155] uppercase tracking-wider">{label}</div>
  </div>
);
