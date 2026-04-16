// backend/controllers/actorController.js
const Actor = require('../models/Actor');

// ─── GET /api/actors ──────────────────────────────────────────────────────────
// Returns lightweight list (for map markers + connection lines)
exports.getAllActors = async (req, res) => {
  try {
    const { region, hasConflict, limit = 250 } = req.query;

    const filter = { isActive: true };
    if (region) filter.region = region;

    const actors = await Actor.find(filter)
      .select('name isoCode isoCode3 region coordinates flag_emoji mapColor relations events capital population')
      .limit(parseInt(limit))
      .lean();

    // Project only what the map needs from nested arrays
    const mapped = actors.map(a => ({
      _id: a._id,
      name: a.name,
      isoCode: a.isoCode,
      isoCode3: a.isoCode3,
      region: a.region,
      capital: a.capital,
      population: a.population,
      flag_emoji: a.flag_emoji,
      mapColor: a.mapColor,
      coordinates: a.coordinates,
      relationCount: a.relations ? a.relations.length : 0,
      eventCount: a.events ? a.events.length : 0,
      recentConflicts: a.events
        ? a.events.filter(e => e.type === 'conflict').slice(-3)
        : [],
      relations: a.relations
        ? a.relations.map(r => ({
            _id: r._id,
            targetCountry: r.targetCountry,
            targetCountryName: r.targetCountryName,
            type: r.type,
            strength: r.strength,
            status: r.status,
          }))
        : [],
    }));

    res.json({ success: true, count: mapped.length, data: mapped });
  } catch (err) {
    console.error('getAllActors error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/actors/:isoCode ─────────────────────────────────────────────────
// Returns full actor detail
exports.getActorByIso = async (req, res) => {
  try {
    const actor = await Actor.findOne({
      isoCode: req.params.isoCode.toUpperCase(),
      isActive: true,
    }).lean();

    if (!actor) {
      return res.status(404).json({ success: false, message: 'Country not found' });
    }

    res.json({ success: true, data: actor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/actors ─────────────────────────────────────────────────────────
// Add a new country/actor
exports.createActor = async (req, res) => {
  try {
    const actor = new Actor(req.body);
    const saved = await actor.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Country already exists' });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── POST /api/actors/:isoCode/relations ──────────────────────────────────────
// Add a relation to a country
exports.addRelation = async (req, res) => {
  try {
    const actor = await Actor.findOne({ isoCode: req.params.isoCode.toUpperCase() });
    if (!actor) return res.status(404).json({ success: false, message: 'Country not found' });

    // Prevent duplicate relation to same target
    const existing = actor.relations.find(r => r.targetCountry === req.body.targetCountry?.toUpperCase());
    if (existing) {
      return res.status(409).json({ success: false, message: 'Relation already exists' });
    }

    actor.relations.push(req.body);
    await actor.save();

    res.status(201).json({ success: true, data: actor.relations[actor.relations.length - 1] });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── POST /api/actors/:isoCode/events ─────────────────────────────────────────
// Add an event to a country
exports.addEvent = async (req, res) => {
  try {
    const actor = await Actor.findOne({ isoCode: req.params.isoCode.toUpperCase() });
    if (!actor) return res.status(404).json({ success: false, message: 'Country not found' });

    actor.events.push(req.body);
    await actor.save();

    const newEvent = actor.events[actor.events.length - 1];
    res.status(201).json({ success: true, data: newEvent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── GET /api/actors/search/autocomplete ─────────────────────────────────────
// Atlas Search autocomplete — letter-by-letter
exports.autocomplete = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Try Atlas Search first
    try {
      const results = await Actor.aggregate([
        {
          $search: {
            index: 'geolink_autocomplete',
            compound: {
              should: [
                {
                  autocomplete: {
                    query: q,
                    path: 'name',
                    fuzzy: { maxEdits: 1 },
                    score: { boost: { value: 5 } },
                  },
                },
                {
                  autocomplete: {
                    query: q,
                    path: 'capital',
                    score: { boost: { value: 2 } },
                  },
                },
              ],
            },
          },
        },
        { $limit: 8 },
        {
          $project: {
            name: 1, isoCode: 1, region: 1,
            capital: 1, flag_emoji: 1,
            score: { $meta: 'searchScore' },
          },
        },
      ]);

      // If Atlas Search returns empty, fall through to regex
      if (results.length > 0) {
        return res.json({ success: true, data: results });
      }
    } catch (atlasErr) {
      console.warn('Atlas Search not ready:', atlasErr.message);
    }

    // REGEX FALLBACK — always works, no index needed
    const regex = new RegExp(q.trim(), 'i');
    const fallback = await Actor.find({
      $or: [
        { name: regex },
        { capital: regex },
        { isoCode: regex },
        { region: regex },
      ],
      isActive: true,
    })
      .select('name isoCode isoCode3 region capital flag_emoji')
      .limit(8)
      .lean();

    res.json({ success: true, data: fallback, fallback: true });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/actors/map/connections ─────────────────────────────────────────
// Returns all connection lines for the map (type, strength, coordinates)
exports.getMapConnections = async (req, res) => {
  try {
    const { type, minStrength = 0, startDate, endDate } = req.query;

    const matchFilter = { isActive: true };
    if (type) matchFilter['relations.type'] = type;

    const actors = await Actor.aggregate([
      { $match: matchFilter },
      {
        $project: {
          name: 1,
          isoCode: 1,
          coordinates: 1,
          relations: {
            $filter: {
              input: '$relations',
              as: 'rel',
              cond: {
                $and: [
                  { $eq: ['$$rel.status', 'active'] },
                  { $gte: ['$$rel.strength', parseInt(minStrength)] },
                  ...(type ? [{ $eq: ['$$rel.type', type] }] : []),
                ],
              },
            },
          },
        },
      },
      { $unwind: '$relations' },
      {
        $lookup: {
          from: 'actors',
          localField: 'relations.targetCountry',
          foreignField: 'isoCode',
          as: 'targetActor',
        },
      },
      { $unwind: { path: '$targetActor', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          sourceIso: '$isoCode',
          sourceName: '$name',
          sourceCoords: '$coordinates.coordinates',
          targetIso: '$relations.targetCountry',
          targetName: '$relations.targetCountryName',
          targetCoords: '$targetActor.coordinates.coordinates',
          relationType: '$relations.type',
          strength: '$relations.strength',
          status: '$relations.status',
        },
      },
      { $match: { targetCoords: { $exists: true, $ne: null } } },
    ]);

    res.json({ success: true, count: actors.length, data: actors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/actors/map/conflicts ────────────────────────────────────────────
// Heat map data: conflict events with lat/lon/weight for Leaflet.heat
exports.getConflictHeatmap = async (req, res) => {
  try {
    const { startDate, endDate, minFatalities = 0 } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const pipeline = [
      { $match: { isActive: true } },
      { $unwind: '$events' },
      {
        $match: {
          'events.type': 'conflict',
          'events.fatalities': { $gte: parseInt(minFatalities) },
          ...(Object.keys(dateFilter).length > 0 ? { 'events.date': dateFilter } : {}),
        },
      },
      {
        $project: {
          lat: { $arrayElemAt: ['$events.location.coordinates', 1] },
          lon: { $arrayElemAt: ['$events.location.coordinates', 0] },
          weight: {
            $add: [
              1,
              { $divide: ['$events.fatalities', 10] },
              { $multiply: ['$events.severity', 0.5] },
            ],
          },
          fatalities: '$events.fatalities',
          severity: '$events.severity',
          title: '$events.title',
          date: '$events.date',
          country: '$name',
          isoCode: '$isoCode',
        },
      },
      { $match: { lat: { $ne: null }, lon: { $ne: null } } },
      { $sort: { weight: -1 } },
      { $limit: 2000 },
    ];

    const conflicts = await Actor.aggregate(pipeline);
    res.json({ success: true, count: conflicts.length, data: conflicts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/actors/analytics/top-connected ─────────────────────────────────
// PIPELINE 1: Top connected countries by relation count & strength
exports.getTopConnected = async (req, res) => {
  try {
    const results = await Actor.aggregate([
      { $match: { isActive: true } },
      {
        $project: {
          name: 1,
          isoCode: 1,
          region: 1,
          flag_emoji: 1,
          totalRelations: { $size: '$relations' },
          activeRelations: {
            $size: {
              $filter: {
                input: '$relations',
                as: 'r',
                cond: { $eq: ['$$r.status', 'active'] },
              },
            },
          },
          avgStrength: { $avg: '$relations.strength' },
          allianceCount: {
            $size: {
              $filter: { input: '$relations', as: 'r', cond: { $eq: ['$$r.type', 'alliance'] } },
            },
          },
          tradeCount: {
            $size: {
              $filter: { input: '$relations', as: 'r', cond: { $eq: ['$$r.type', 'trade'] } },
            },
          },
          sanctionCount: {
            $size: {
              $filter: { input: '$relations', as: 'r', cond: { $eq: ['$$r.type', 'sanction'] } },
            },
          },
        },
      },
      { $sort: { totalRelations: -1 } },
      { $limit: 20 },
    ]);

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/actors/analytics/conflict-risk ──────────────────────────────────
// PIPELINE 2: Conflict risk score by region
exports.getConflictRisk = async (req, res) => {
  try {
    const results = await Actor.aggregate([
      { $match: { isActive: true } },
      { $unwind: { path: '$events', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$region',
          totalEvents: {
            $sum: {
              $cond: [{ $eq: ['$events.type', 'conflict'] }, 1, 0],
            },
          },
          totalFatalities: {
            $sum: {
              $cond: [{ $eq: ['$events.type', 'conflict'] }, { $ifNull: ['$events.fatalities', 0] }, 0],
            },
          },
          avgSeverity: {
            $avg: {
              $cond: [{ $eq: ['$events.type', 'conflict'] }, '$events.severity', null],
            },
          },
          activeConflictCountries: { $addToSet: '$isoCode' },
          sanctionRelations: {
            $sum: {
              $cond: [{ $eq: ['$events.type', 'conflict'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          region: '$_id',
          totalEvents: 1,
          totalFatalities: 1,
          avgSeverity: { $round: ['$avgSeverity', 1] },
          countriesInvolved: { $size: '$activeConflictCountries' },
          riskScore: {
            $round: [
              {
                $add: [
                  { $multiply: ['$totalEvents', 0.3] },
                  { $multiply: [{ $divide: ['$totalFatalities', 100] }, 0.5] },
                  { $multiply: [{ $ifNull: ['$avgSeverity', 0] }, 2] },
                ],
              },
              1,
            ],
          },
        },
      },
      { $sort: { riskScore: -1 } },
    ]);

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/actors/analytics/timeline ──────────────────────────────────────
// PIPELINE 3: Timeline data grouped by month for slider animation
exports.getTimeline = async (req, res) => {
  try {
    const { years = 5 } = req.query;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - parseInt(years));

    const results = await Actor.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$events' },
      { $match: { 'events.date': { $gte: cutoff } } },
      {
        $group: {
          _id: {
            year: { $year: '$events.date' },
            month: { $month: '$events.date' },
            type: '$events.type',
          },
          count: { $sum: 1 },
          totalFatalities: { $sum: { $ifNull: ['$events.fatalities', 0] } },
          events: {
            $push: {
              title: '$events.title',
              lat: { $arrayElemAt: ['$events.location.coordinates', 1] },
              lon: { $arrayElemAt: ['$events.location.coordinates', 0] },
              fatalities: '$events.fatalities',
              country: '$name',
              isoCode: '$isoCode',
            },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          year: '$_id.year',
          month: '$_id.month',
          type: '$_id.type',
          count: 1,
          totalFatalities: 1,
          events: { $slice: ['$events', 50] }, // limit per bucket
        },
      },
    ]);

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
