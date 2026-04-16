// frontend/src/utils/mapUtils.js

// ─── Relation type colors ──────────────────────────────────────────────────────
export const RELATION_COLORS = {
  alliance:    '#00ff88',
  trade:       '#00d4ff',
  sanction:    '#ff3860',
  conflict:    '#ff6b35',
  rivalry:     '#ffb020',
  cooperation: '#9b5de5',
  neutral:     '#64748b',
};

export const RELATION_DASH = {
  alliance:    null,
  trade:       [8, 4],
  sanction:    [4, 4],
  conflict:    null,
  rivalry:     [6, 3],
  cooperation: [10, 3],
  neutral:     [2, 4],
};

// ─── Event type colors ─────────────────────────────────────────────────────────
export const EVENT_COLORS = {
  conflict:     '#ff3860',
  diplomatic:   '#00d4ff',
  economic:     '#ffb020',
  humanitarian: '#9b5de5',
  political:    '#64748b',
  other:        '#94a3b8',
};

// ─── Severity to radius (px) ──────────────────────────────────────────────────
export const severityToRadius = severity => 4 + severity * 2.5;

// ─── Fatalities to heat weight ────────────────────────────────────────────────
export const fatalitiesToWeight = fatalities => {
  if (fatalities === 0) return 0.3;
  if (fatalities < 10) return 0.5;
  if (fatalities < 50) return 0.7;
  if (fatalities < 200) return 0.85;
  return 1.0;
};

// ─── Curved midpoint for polylines ────────────────────────────────────────────
// Returns an array of [lat, lon] points forming a curved arc
export const curvedLine = (from, to, numPoints = 20, curvature = 0.25) => {
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;

  // Midpoint
  const mx = (lon1 + lon2) / 2;
  const my = (lat1 + lat2) / 2;

  // Perpendicular offset
  const dx = lon2 - lon1;
  const dy = lat2 - lat1;
  const len = Math.sqrt(dx * dx + dy * dy);

  const ctrl = [
    mx - dy * curvature,
    my + dx * curvature,
  ];

  // Quadratic Bezier
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const x = (1 - t) ** 2 * lon1 + 2 * (1 - t) * t * ctrl[0] + t ** 2 * lon2;
    const y = (1 - t) ** 2 * lat1 + 2 * (1 - t) * t * ctrl[1] + t ** 2 * lat2;
    points.push([y, x]); // Leaflet uses [lat, lon]
  }
  return points;
};

// ─── Strength to line weight ──────────────────────────────────────────────────
export const strengthToWeight = strength => 0.5 + (strength / 10) * 3.5;

// ─── Region colors for choropleth ────────────────────────────────────────────
export const REGION_COLORS = {
  'Africa':        '#22c55e',
  'Asia':          '#f97316',
  'Europe':        '#3b82f6',
  'North America': '#8b5cf6',
  'South America': '#06b6d4',
  'Oceania':       '#ec4899',
  'Middle East':   '#eab308',
  'Central Asia':  '#84cc16',
};

// ─── Flag fallback (emoji → text) ────────────────────────────────────────────
export const getCountryFlag = (isoCode) => {
  // Convert ISO2 to flag emoji
  const offset = 127397;
  if (!isoCode || isoCode.length !== 2) return '🌐';
  try {
    return Array.from(isoCode.toUpperCase())
      .map(c => String.fromCodePoint(c.codePointAt(0) + offset))
      .join('');
  } catch { return '🌐'; }
};

// ─── Format large numbers ─────────────────────────────────────────────────────
export const formatNumber = n => {
  if (!n) return 'N/A';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
};

// ─── Format date ──────────────────────────────────────────────────────────────
export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

// ─── Risk score color ─────────────────────────────────────────────────────────
export const riskColor = score => {
  if (score >= 8) return '#ff3860';
  if (score >= 5) return '#ffb020';
  if (score >= 2) return '#00d4ff';
  return '#00ff88';
};

// ─── Timeline: month label ────────────────────────────────────────────────────
export const monthLabel = (year, month) => {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};
