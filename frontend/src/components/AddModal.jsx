// frontend/src/components/AddModal.jsx
import React, { useState } from 'react';
import { createActor, addRelation, addEvent } from '../utils/api';

const RELATION_TYPES = ['alliance', 'trade', 'sanction', 'rivalry', 'neutral', 'cooperation', 'conflict'];
const EVENT_TYPES    = ['conflict', 'diplomatic', 'economic', 'humanitarian', 'political', 'other'];
const REGIONS        = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Middle East', 'Central Asia'];

export default function AddModal({ prefill, targetIso, onClose, onSuccess }) {
  const [mode, setMode] = useState(targetIso ? 'event' : 'country'); // country | relation | event
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ── Country form ──────────────────────────────────────────────────────────────
  const [countryForm, setCountryForm] = useState({
    name: prefill?.prefill || '',
    isoCode: '', isoCode3: '', capital: '',
    region: '', lat: '', lon: '',
    population: '', gdp: '', government_type: '',
  });

  // ── Relation form ─────────────────────────────────────────────────────────────
  const [relForm, setRelForm] = useState({
    sourceIso: targetIso || '',
    targetCountry: '', targetCountryName: '',
    type: 'alliance', strength: 5, description: '', tradeVolume: '',
  });

  // ── Event form ────────────────────────────────────────────────────────────────
  const [evForm, setEvForm] = useState({
    countryIso: targetIso || '',
    title: '', type: 'conflict', date: new Date().toISOString().split('T')[0],
    lat: '', lon: '', placeName: '',
    fatalities: 0, severity: 5,
    description: '', tags: '',
  });

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'country') {
        await createActor({
          name: countryForm.name,
          isoCode: countryForm.isoCode.toUpperCase(),
          isoCode3: countryForm.isoCode3.toUpperCase(),
          capital: countryForm.capital,
          region: countryForm.region,
          coordinates: {
            type: 'Point',
            coordinates: [parseFloat(countryForm.lon), parseFloat(countryForm.lat)],
          },
          population: countryForm.population ? parseInt(countryForm.population) : undefined,
          gdp: countryForm.gdp ? parseFloat(countryForm.gdp) : undefined,
          government_type: countryForm.government_type,
        });
      } else if (mode === 'relation') {
        await addRelation(relForm.sourceIso.toUpperCase(), {
          targetCountry: relForm.targetCountry.toUpperCase(),
          targetCountryName: relForm.targetCountryName,
          type: relForm.type,
          strength: parseInt(relForm.strength),
          description: relForm.description,
          tradeVolume: relForm.tradeVolume ? parseFloat(relForm.tradeVolume) : undefined,
        });
      } else {
        await addEvent(evForm.countryIso.toUpperCase(), {
          title: evForm.title,
          type: evForm.type,
          date: new Date(evForm.date),
          location: {
            type: 'Point',
            coordinates: evForm.lon && evForm.lat ? [parseFloat(evForm.lon), parseFloat(evForm.lat)] : [0, 0],
            placeName: evForm.placeName,
          },
          fatalities: parseInt(evForm.fatalities) || 0,
          severity: parseInt(evForm.severity),
          description: evForm.description,
          tags: evForm.tags ? evForm.tags.split(',').map(t => t.trim()) : [],
          source: 'manual',
        });
      }
      setSuccess(true);
      setTimeout(() => { onSuccess?.(); onClose(); }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl overflow-hidden"
        style={{
          background: 'rgba(10, 15, 30, 0.98)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          boxShadow: '0 0 60px rgba(0,212,255,0.1)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'rgba(26,37,64,0.8)', background: 'rgba(0,212,255,0.04)' }}
        >
          <div>
            <h2 className="text-sm font-bold text-white font-display tracking-wide">
              + Add to GeoLink Vault
            </h2>
            <p className="text-[10px] text-[#475569] mt-0.5 font-mono">Contribute geopolitical data</p>
          </div>
          <button onClick={onClose} className="text-[#475569] hover:text-[#00d4ff] transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b" style={{ borderColor: 'rgba(26,37,64,0.8)' }}>
          {['country', 'relation', 'event'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2.5 text-[10px] font-mono uppercase tracking-wider transition-all"
              style={{
                color: mode === m ? '#00d4ff' : '#475569',
                borderBottom: mode === m ? '2px solid #00d4ff' : '2px solid transparent',
                background: mode === m ? 'rgba(0,212,255,0.04)' : 'transparent',
              }}
            >
              {m === 'country' ? '🌍 Country' : m === 'relation' ? '🔗 Relation' : '⚡ Event'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="p-5 space-y-3 max-h-[55vh] overflow-y-auto">
          {success && (
            <div className="flex items-center gap-2 p-3 rounded" style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}>
              <span className="text-[#00ff88] text-sm">✓</span>
              <span className="text-[12px] text-[#00ff88]">Successfully added!</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded" style={{ background: 'rgba(255,56,96,0.1)', border: '1px solid rgba(255,56,96,0.3)' }}>
              <span className="text-[#ff3860] text-sm">⚠</span>
              <span className="text-[12px] text-[#ff3860]">{error}</span>
            </div>
          )}

          {/* ── Country Form ── */}
          {mode === 'country' && (
            <>
              <FormRow label="Country Name *">
                <Input value={countryForm.name} onChange={v => setCountryForm(f => ({ ...f, name: v }))} placeholder="e.g. Finland" />
              </FormRow>
              <div className="grid grid-cols-2 gap-2">
                <FormRow label="ISO-2 Code *">
                  <Input value={countryForm.isoCode} onChange={v => setCountryForm(f => ({ ...f, isoCode: v.toUpperCase() }))} placeholder="FI" maxLength={2} />
                </FormRow>
                <FormRow label="ISO-3 Code">
                  <Input value={countryForm.isoCode3} onChange={v => setCountryForm(f => ({ ...f, isoCode3: v.toUpperCase() }))} placeholder="FIN" maxLength={3} />
                </FormRow>
              </div>
              <FormRow label="Capital">
                <Input value={countryForm.capital} onChange={v => setCountryForm(f => ({ ...f, capital: v }))} placeholder="Helsinki" />
              </FormRow>
              <FormRow label="Region *">
                <Select value={countryForm.region} onChange={v => setCountryForm(f => ({ ...f, region: v }))} options={REGIONS} />
              </FormRow>
              <div className="grid grid-cols-2 gap-2">
                <FormRow label="Latitude *">
                  <Input type="number" value={countryForm.lat} onChange={v => setCountryForm(f => ({ ...f, lat: v }))} placeholder="60.19" />
                </FormRow>
                <FormRow label="Longitude *">
                  <Input type="number" value={countryForm.lon} onChange={v => setCountryForm(f => ({ ...f, lon: v }))} placeholder="24.94" />
                </FormRow>
              </div>
              <FormRow label="Government Type">
                <Input value={countryForm.government_type} onChange={v => setCountryForm(f => ({ ...f, government_type: v }))} placeholder="Parliamentary Republic" />
              </FormRow>
            </>
          )}

          {/* ── Relation Form ── */}
          {mode === 'relation' && (
            <>
              <FormRow label="Source Country ISO *">
                <Input value={relForm.sourceIso} onChange={v => setRelForm(f => ({ ...f, sourceIso: v.toUpperCase() }))} placeholder="US" maxLength={2} />
              </FormRow>
              <div className="grid grid-cols-2 gap-2">
                <FormRow label="Target ISO *">
                  <Input value={relForm.targetCountry} onChange={v => setRelForm(f => ({ ...f, targetCountry: v.toUpperCase() }))} placeholder="DE" maxLength={2} />
                </FormRow>
                <FormRow label="Target Name *">
                  <Input value={relForm.targetCountryName} onChange={v => setRelForm(f => ({ ...f, targetCountryName: v }))} placeholder="Germany" />
                </FormRow>
              </div>
              <FormRow label="Type *">
                <Select value={relForm.type} onChange={v => setRelForm(f => ({ ...f, type: v }))} options={RELATION_TYPES} />
              </FormRow>
              <FormRow label={`Strength: ${relForm.strength}/10`}>
                <div className="timeline-slider">
                  <input
                    type="range" min="1" max="10" value={relForm.strength}
                    onChange={e => setRelForm(f => ({ ...f, strength: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </FormRow>
              <FormRow label="Trade Volume (USD Billions)">
                <Input type="number" value={relForm.tradeVolume} onChange={v => setRelForm(f => ({ ...f, tradeVolume: v }))} placeholder="120" />
              </FormRow>
              <FormRow label="Description">
                <textarea
                  rows={2}
                  value={relForm.description}
                  onChange={e => setRelForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of the relationship..."
                  className="w-full px-3 py-2 rounded text-[12px] outline-none resize-none"
                  style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(26,37,64,0.9)', color: '#e2e8f0', fontFamily: "'Syne'" }}
                />
              </FormRow>
            </>
          )}

          {/* ── Event Form ── */}
          {mode === 'event' && (
            <>
              <FormRow label="Country ISO *">
                <Input value={evForm.countryIso} onChange={v => setEvForm(f => ({ ...f, countryIso: v.toUpperCase() }))} placeholder="UA" maxLength={2} />
              </FormRow>
              <FormRow label="Event Title *">
                <Input value={evForm.title} onChange={v => setEvForm(f => ({ ...f, title: v }))} placeholder="Armed clash in northern region" />
              </FormRow>
              <div className="grid grid-cols-2 gap-2">
                <FormRow label="Type *">
                  <Select value={evForm.type} onChange={v => setEvForm(f => ({ ...f, type: v }))} options={EVENT_TYPES} />
                </FormRow>
                <FormRow label="Date *">
                  <Input type="date" value={evForm.date} onChange={v => setEvForm(f => ({ ...f, date: v }))} />
                </FormRow>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormRow label="Latitude">
                  <Input type="number" value={evForm.lat} onChange={v => setEvForm(f => ({ ...f, lat: v }))} placeholder="48.5" />
                </FormRow>
                <FormRow label="Longitude">
                  <Input type="number" value={evForm.lon} onChange={v => setEvForm(f => ({ ...f, lon: v }))} placeholder="31.2" />
                </FormRow>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormRow label="Fatalities">
                  <Input type="number" value={evForm.fatalities} onChange={v => setEvForm(f => ({ ...f, fatalities: v }))} placeholder="0" />
                </FormRow>
                <FormRow label={`Severity: ${evForm.severity}/10`}>
                  <div className="timeline-slider">
                    <input
                      type="range" min="1" max="10" value={evForm.severity}
                      onChange={e => setEvForm(f => ({ ...f, severity: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </FormRow>
              </div>
              <FormRow label="Tags (comma-separated)">
                <Input value={evForm.tags} onChange={v => setEvForm(f => ({ ...f, tags: v }))} placeholder="conflict, missile, ceasefire" />
              </FormRow>
              <FormRow label="Description">
                <textarea
                  rows={2}
                  value={evForm.description}
                  onChange={e => setEvForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Event details..."
                  className="w-full px-3 py-2 rounded text-[12px] outline-none resize-none"
                  style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(26,37,64,0.9)', color: '#e2e8f0', fontFamily: "'Syne'" }}
                />
              </FormRow>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-3" style={{ borderColor: 'rgba(26,37,64,0.8)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded text-[12px] font-medium transition-all"
            style={{ background: 'rgba(26,37,64,0.5)', border: '1px solid rgba(26,37,64,0.8)', color: '#64748b' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || success}
            className="flex-1 py-2.5 rounded text-[12px] font-medium transition-all flex items-center justify-center gap-2"
            style={{
              background: success ? 'rgba(0,255,136,0.15)' : 'rgba(0,212,255,0.12)',
              border: `1px solid ${success ? 'rgba(0,255,136,0.4)' : 'rgba(0,212,255,0.35)'}`,
              color: success ? '#00ff88' : '#00d4ff',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <div className="w-3 h-3 border border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
            ) : success ? '✓ Saved!' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mini form helpers ──────────────────────────────────────────────────────────
const FormRow = ({ label, children }) => (
  <div>
    <label className="block text-[9px] font-mono text-[#475569] uppercase tracking-wider mb-1">{label}</label>
    {children}
  </div>
);

const Input = ({ value, onChange, type = 'text', placeholder, maxLength }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    maxLength={maxLength}
    className="w-full px-3 py-2 rounded text-[12px] outline-none transition-all"
    style={{
      background: 'rgba(13,21,38,0.8)',
      border: '1px solid rgba(26,37,64,0.9)',
      color: '#e2e8f0',
      fontFamily: "'JetBrains Mono', monospace",
    }}
    onFocus={e => e.target.style.borderColor = 'rgba(0,212,255,0.4)'}
    onBlur={e => e.target.style.borderColor = 'rgba(26,37,64,0.9)'}
  />
);

const Select = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-full px-3 py-2 rounded text-[12px] outline-none"
    style={{
      background: 'rgba(13,21,38,0.8)',
      border: '1px solid rgba(26,37,64,0.9)',
      color: '#e2e8f0',
      fontFamily: "'JetBrains Mono', monospace",
    }}
  >
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);
