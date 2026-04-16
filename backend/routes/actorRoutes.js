// backend/routes/actorRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/actorController');

// ── Analytics & Map data (specific routes BEFORE /:isoCode) ──────────────────
router.get('/search/autocomplete', ctrl.autocomplete);
router.get('/map/connections', ctrl.getMapConnections);
router.get('/map/conflicts', ctrl.getConflictHeatmap);
router.get('/analytics/top-connected', ctrl.getTopConnected);
router.get('/analytics/conflict-risk', ctrl.getConflictRisk);
router.get('/analytics/timeline', ctrl.getTimeline);

// ── CRUD ─────────────────────────────────────────────────────────────────────
router.get('/', ctrl.getAllActors);
router.post('/', ctrl.createActor);
router.get('/:isoCode', ctrl.getActorByIso);

// ── Nested resource routes ────────────────────────────────────────────────────
router.post('/:isoCode/relations', ctrl.addRelation);
router.post('/:isoCode/events', ctrl.addEvent);

module.exports = router;
