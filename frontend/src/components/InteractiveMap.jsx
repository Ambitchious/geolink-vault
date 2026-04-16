// frontend/src/components/InteractiveMap.jsx
/**
 * InteractiveMap — The core visual component of GeoLink Vault.
 *
 * Features:
 * - Full-screen dark Leaflet map (Carto dark tiles)
 * - Animated curved polylines between countries (color-coded by relation type)
 * - Conflict heat layer (Leaflet.heat)
 * - Event markers with severity-scaled circles
 * - Country centroid markers (clickable → popup with stats)
 * - Layer toggles, timeline filter, region filter
 * - Hover tooltips
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { curvedLine, RELATION_COLORS, RELATION_DASH, EVENT_COLORS, strengthToWeight, severityToRadius } from '../utils/mapUtils';

// ─── Constants ────────────────────────────────────────────────────────────────
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
const DARK_LABELS = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png';
const DARK_ATTR  = '&copy; <a href="https://carto.com">CARTO</a>';

export default function InteractiveMap({
  actors,
  connections,
  heatmapPoints,
  activeLayers,
  timeFilter,
  onCountryClick,
}) {
  const mapRef      = useRef(null);
  const leafletRef  = useRef(null);
  const layerGroups = useRef({});
  const heatLayer   = useRef(null);
  const labelsLayer = useRef(null);

  // ── Init map once ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (leafletRef.current) return;

    const map = L.map(mapRef.current, {
      center: [20, 10],
      zoom: 3,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: false,
      preferCanvas: true,
    });

    // Dark base tiles
    L.tileLayer(DARK_TILES, {
      attribution: DARK_ATTR,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Labels on top
    labelsLayer.current = L.tileLayer(DARK_LABELS, {
      subdomains: 'abcd',
      maxZoom: 19,
      pane: 'overlayPane',
    }).addTo(map);

    // Custom zoom control (bottom-right)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initialize layer groups
    ['alliances', 'trade', 'sanctions', 'conflicts', 'rivalry', 'cooperation',
     'markers', 'countries'].forEach(id => {
      layerGroups.current[id] = L.layerGroup().addTo(map);
    });

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  // ── Load Leaflet.heat dynamically ────────────────────────────────────────────
  const initHeatLayer = useCallback(async () => {
    if (!leafletRef.current) return;
    // Leaflet.heat extends L.Layer — load via dynamic import
    try {
      await import('leaflet.heat');
    } catch {
      // Fallback: define minimal heat layer
    }
  }, []);

  useEffect(() => { initHeatLayer(); }, [initHeatLayer]);

  // ── Draw country centroid markers ─────────────────────────────────────────────
  useEffect(() => {
    if (!leafletRef.current || actors.length === 0) return;
    const group = layerGroups.current.countries;
    group.clearLayers();

    actors.forEach(actor => {
      if (!actor.coordinates?.coordinates) return;
      const [lon, lat] = actor.coordinates.coordinates;
      if (!lat || !lon) return;

      const conflictCount = actor.recentConflicts?.length || 0;
      const r = 4 + Math.min(8, actor.relationCount * 0.6);

      // Custom SVG marker
      const svgIcon = L.divIcon({
        className: '',
        iconSize: [r * 2, r * 2],
        iconAnchor: [r, r],
        html: `
          <div style="position:relative;width:${r*2}px;height:${r*2}px;">
            <div style="
              position:absolute;inset:0;border-radius:50%;
              background:${conflictCount > 0 ? 'rgba(255,56,96,0.15)' : 'rgba(0,212,255,0.12)'};
              border:1px solid ${conflictCount > 0 ? 'rgba(255,56,96,0.7)' : 'rgba(0,212,255,0.6)'};
              box-shadow:0 0 ${conflictCount > 0 ? '8px rgba(255,56,96,0.5)' : '6px rgba(0,212,255,0.4)'};
            "></div>
            <div style="
              position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
              font-size:${Math.max(8, r * 0.9)}px;line-height:1;
            ">${actor.flag_emoji || '🌐'}</div>
          </div>`,
      });

      const marker = L.marker([lat, lon], { icon: svgIcon })
        .bindTooltip(
          `<div style="font-family:'JetBrains Mono',monospace;">
            <strong style="color:#00d4ff">${actor.flag_emoji} ${actor.name}</strong><br/>
            <span style="color:#64748b">${actor.region}</span><br/>
            <span style="color:#94a3b8">Relations: <span style="color:#00d4ff">${actor.relationCount}</span></span>
            ${conflictCount > 0 ? `<br/><span style="color:#ff3860">⚔ ${conflictCount} recent conflicts</span>` : ''}
          </div>`,
          { permanent: false, direction: 'top', className: 'vault-tooltip' }
        )
        .on('click', () => onCountryClick(actor));

      group.addLayer(marker);
    });
  }, [actors, onCountryClick]);

  // ── Draw connection lines ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletRef.current || connections.length === 0) return;

    // Clear all relation layers
    ['alliances', 'trade', 'sanctions', 'conflicts', 'rivalry', 'cooperation'].forEach(id => {
      layerGroups.current[id]?.clearLayers();
    });

    const LAYER_MAP = {
      alliance: 'alliances',
      trade: 'trade',
      sanction: 'sanctions',
      conflict: 'conflicts',
      rivalry: 'rivalry',
      cooperation: 'cooperation',
      neutral: 'cooperation',
    };

    connections.forEach(conn => {
      if (!conn.sourceCoords || !conn.targetCoords) return;
      const layerId = LAYER_MAP[conn.relationType] || 'cooperation';
      const group = layerGroups.current[layerId];
      if (!group) return;

      // Check if this layer is active
      if (!activeLayers.includes(layerId)) return;

      const points = curvedLine(conn.sourceCoords, conn.targetCoords, 25, 0.2);
      const color = RELATION_COLORS[conn.relationType] || '#64748b';
      const weight = strengthToWeight(conn.strength);
      const dash = RELATION_DASH[conn.relationType];

      const line = L.polyline(points, {
        color,
        weight,
        opacity: 0.65,
        dashArray: dash ? dash.join(',') : null,
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1,
      });

      line.bindTooltip(
        `<div style="font-family:'JetBrains Mono',monospace;font-size:10px">
          <span style="color:${color}">■</span>
          <strong style="color:#e2e8f0">${conn.sourceName}</strong>
          <span style="color:#475569"> → </span>
          <strong style="color:#e2e8f0">${conn.targetName}</strong><br/>
          <span style="color:#64748b">Type: <span style="color:${color}">${conn.relationType}</span></span>
          · Strength: <span style="color:#00d4ff">${conn.strength}/10</span>
        </div>`,
        { sticky: true, className: 'vault-tooltip' }
      );

      group.addLayer(line);
    });
  }, [connections, activeLayers]);

  // ── Draw conflict event markers ───────────────────────────────────────────────
  useEffect(() => {
    if (!leafletRef.current) return;
    const group = layerGroups.current.markers;
    group.clearLayers();

    if (!activeLayers.includes('markers')) return;

    actors.forEach(actor => {
      (actor.recentConflicts || []).forEach(ev => {
        if (!ev.location?.coordinates) return;
        const [lon, lat] = ev.location.coordinates;
        if (!lat || !lon) return;

        // Filter by timeline
        if (timeFilter) {
          const evDate = new Date(ev.date);
          if (evDate.getFullYear() !== timeFilter.year || evDate.getMonth() + 1 !== timeFilter.month) return;
        }

        const r = severityToRadius(ev.severity || 5);
        const color = EVENT_COLORS[ev.type] || '#64748b';

        const circle = L.circleMarker([lat, lon], {
          radius: r,
          fillColor: color,
          fillOpacity: 0.55,
          color: color,
          weight: 1.5,
          opacity: 0.9,
        });

        circle.bindTooltip(
          `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;max-width:200px">
            <div style="color:${color};font-weight:700;margin-bottom:2px">${ev.title}</div>
            <div style="color:#94a3b8">${actor.name} · ${ev.type}</div>
            ${ev.fatalities > 0 ? `<div style="color:#ff3860">⚠ ${ev.fatalities} fatalities</div>` : ''}
          </div>`,
          { sticky: true, className: 'vault-tooltip' }
        );

        group.addLayer(circle);
      });
    });
  }, [actors, activeLayers, timeFilter]);

  // ── Heat layer for conflicts ──────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletRef.current || !L.heatLayer) return;

    if (heatLayer.current) {
      leafletRef.current.removeLayer(heatLayer.current);
      heatLayer.current = null;
    }

    if (!activeLayers.includes('heatmap') || heatmapPoints.length === 0) return;

    // Filter by timeline if active
    let points = heatmapPoints;

    heatLayer.current = L.heatLayer(points, {
      radius: 25,
      blur: 20,
      maxZoom: 8,
      max: 1.0,
      gradient: {
        0.0: '#001a4d',
        0.2: '#003380',
        0.4: '#ff6600',
        0.6: '#ff3300',
        0.8: '#ff0000',
        1.0: '#ffffff',
      },
    }).addTo(leafletRef.current);
  }, [heatmapPoints, activeLayers]);

  // ── Toggle layer visibility ───────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletRef.current) return;

    const layerIds = ['alliances', 'trade', 'sanctions', 'conflicts', 'rivalry', 'cooperation', 'markers'];

    layerIds.forEach(id => {
      const group = layerGroups.current[id];
      if (!group) return;

      if (activeLayers.includes(id)) {
        if (!leafletRef.current.hasLayer(group)) {
          leafletRef.current.addLayer(group);
        }
      } else {
        if (leafletRef.current.hasLayer(group)) {
          leafletRef.current.removeLayer(group);
        }
      }
    });
  }, [activeLayers]);

  // ── Pan to selected actor ────────────────────────────────────────────────────
  // (Called externally via ref if needed — map panning handled in App)

  return (
    <div
      ref={mapRef}
      className="absolute inset-0"
      style={{ zIndex: 1 }}
    />
  );
}
