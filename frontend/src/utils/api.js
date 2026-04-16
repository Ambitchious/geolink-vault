// frontend/src/utils/api.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// ─── Actors ───────────────────────────────────────────────────────────────────
export const fetchActors = (params = {}) =>
  api.get('/actors', { params }).then(r => r.data);

export const fetchActor = isoCode =>
  api.get(`/actors/${isoCode}`).then(r => r.data);

export const createActor = data =>
  api.post('/actors', data).then(r => r.data);

export const addRelation = (isoCode, relation) =>
  api.post(`/actors/${isoCode}/relations`, relation).then(r => r.data);

export const addEvent = (isoCode, event) =>
  api.post(`/actors/${isoCode}/events`, event).then(r => r.data);

// ─── Search ───────────────────────────────────────────────────────────────────
export const autocomplete = q =>
  api.get('/actors/search/autocomplete', { params: { q } }).then(r => r.data);

// ─── Map data ─────────────────────────────────────────────────────────────────
export const fetchConnections = (params = {}) =>
  api.get('/actors/map/connections', { params }).then(r => r.data);

export const fetchConflictHeatmap = (params = {}) =>
  api.get('/actors/map/conflicts', { params }).then(r => r.data);

// ─── Analytics ────────────────────────────────────────────────────────────────
export const fetchTopConnected = () =>
  api.get('/actors/analytics/top-connected').then(r => r.data);

export const fetchConflictRisk = () =>
  api.get('/actors/analytics/conflict-risk').then(r => r.data);

export const fetchTimeline = (years = 5) =>
  api.get('/actors/analytics/timeline', { params: { years } }).then(r => r.data);
