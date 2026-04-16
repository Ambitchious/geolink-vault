// frontend/src/components/TimelineSlider.jsx
import React, { useState, useEffect, useRef } from 'react';
import { fetchTimeline } from '../utils/api';
import { monthLabel } from '../utils/mapUtils';

export default function TimelineSlider({ onTimeChange }) {
  const [timeline, setTimeline] = useState([]);
  const [allMonths, setAllMonths] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef(null);

  useEffect(() => {
    fetchTimeline(3).then(res => {
      const data = res.data || [];
      setTimeline(data);

      // Build unique month list
      const months = [];
      const seen = new Set();
      data.forEach(d => {
        const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
        if (!seen.has(key)) {
          seen.add(key);
          months.push({ year: d.year, month: d.month, key });
        }
      });
      months.sort((a, b) => a.key.localeCompare(b.key));
      setAllMonths(months);
      setCurrentIndex(months.length - 1);
    }).catch(console.error);
  }, []);

  // Notify parent of time change
  useEffect(() => {
    if (currentIndex === null || allMonths.length === 0) return;
    const m = allMonths[currentIndex];
    if (m) onTimeChange(m);
  }, [currentIndex, allMonths]);

  // Auto-play
  useEffect(() => {
    if (playing) {
      playRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= allMonths.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 600);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [playing, allMonths.length]);

  if (allMonths.length === 0) return null;

  const current = currentIndex !== null ? allMonths[currentIndex] : null;

  // Bar chart data — conflict counts per month
  const maxCount = Math.max(1, ...allMonths.map(m => {
    const entries = timeline.filter(t => t.year === m.year && t.month === m.month && t.type === 'conflict');
    return entries.reduce((s, e) => s + e.count, 0);
  }));

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl overflow-hidden"
      style={{
        background: 'rgba(10, 15, 30, 0.94)',
        border: '1px solid rgba(26, 37, 64, 0.9)',
        backdropFilter: 'blur(16px)',
        width: 'min(700px, calc(100vw - 200px))',
        zIndex: 800,
        boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'rgba(26,37,64,0.8)' }}>
        <div className="flex items-center gap-2">
          <svg width="10" height="10" fill="none" stroke="#00d4ff" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          <span className="text-[10px] font-display font-bold text-[#00d4ff] tracking-widest uppercase">Timeline</span>
        </div>
        <div className="flex items-center gap-3">
          {current && (
            <span className="text-[11px] font-mono text-[#e2e8f0]">
              {monthLabel(current.year, current.month)}
            </span>
          )}
          <button
            onClick={() => setCurrentIndex(0)}
            className="text-[#475569] hover:text-[#00d4ff] transition-colors"
            title="Reset to start"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
            </svg>
          </button>
          <button
            onClick={() => setPlaying(p => !p)}
            className="w-6 h-6 rounded flex items-center justify-center transition-all"
            style={{
              background: playing ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.3)',
              color: '#00d4ff',
            }}
          >
            {playing ? (
              <svg width="8" height="8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            ) : (
              <svg width="8" height="8" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
            )}
          </button>
          <button
            onClick={() => setCurrentIndex(allMonths.length - 1)}
            className="text-[#475569] hover:text-[#00d4ff] transition-colors"
            title="Jump to latest"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="flex items-end gap-px px-4 pt-2" style={{ height: '28px' }}>
        {allMonths.map((m, i) => {
          const entries = timeline.filter(t => t.year === m.year && t.month === m.month && t.type === 'conflict');
          const count = entries.reduce((s, e) => s + e.count, 0);
          const h = Math.max(2, Math.round((count / maxCount) * 20));
          const isActive = i === currentIndex;
          return (
            <div
              key={m.key}
              className="flex-1 cursor-pointer transition-all rounded-t-sm"
              style={{
                height: `${h}px`,
                background: isActive ? '#ff3860' : i <= currentIndex ? 'rgba(255,56,96,0.35)' : 'rgba(26,37,64,0.6)',
                boxShadow: isActive ? '0 0 6px rgba(255,56,96,0.8)' : 'none',
                minWidth: '3px',
              }}
              onClick={() => setCurrentIndex(i)}
              title={`${monthLabel(m.year, m.month)}: ${count} conflicts`}
            />
          );
        })}
      </div>

      {/* Slider */}
      <div className="px-4 pb-2 pt-1 timeline-slider">
        <input
          type="range"
          min="0"
          max={allMonths.length - 1}
          value={currentIndex ?? 0}
          onChange={e => {
            setCurrentIndex(parseInt(e.target.value));
            setPlaying(false);
          }}
          style={{ width: '100%', accentColor: '#00d4ff' }}
        />
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] font-mono text-[#334155]">
            {allMonths[0] ? monthLabel(allMonths[0].year, allMonths[0].month) : ''}
          </span>
          <span className="text-[9px] font-mono text-[#334155]">
            {allMonths[allMonths.length - 1] ? monthLabel(allMonths[allMonths.length - 1].year, allMonths[allMonths.length - 1].month) : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
