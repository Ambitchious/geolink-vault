// backend/models/Actor.js
const mongoose = require('mongoose');

// ─── Level 4: Sub-event detail ───────────────────────────────────────────────
const SubEventSchema = new mongoose.Schema({
  subType: { type: String, trim: true },         // e.g., "Airstrike", "Protest"
  description: { type: String, trim: true },
  casualties: { type: Number, default: 0 },
  sourceUrl: { type: String, trim: true },
  verifiedBy: { type: String, trim: true },       // e.g., "Reuters", "ACLED"
}, { _id: false });

// ─── Level 3: Individual event ───────────────────────────────────────────────
const EventSchema = new mongoose.Schema({
  acledId: { type: String, index: true },         // ACLED event_id_cnty for dedup
  title: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['conflict', 'diplomatic', 'economic', 'humanitarian', 'political', 'other'],
    default: 'other',
  },
  subType: { type: String, trim: true },
  date: { type: Date, required: true, index: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lon, lat]
    placeName: { type: String, trim: true },
  },
  fatalities: { type: Number, default: 0 },
  severity: { type: Number, min: 1, max: 10, default: 1 }, // 1-10 scale
  description: { type: String, trim: true },
  involvedActors: [{ type: String, trim: true }],          // country codes
  tags: [{ type: String, trim: true }],
  source: { type: String, default: 'manual', trim: true }, // 'acled', 'manual', 'gdelt'
  subEvents: [SubEventSchema],                              // Level 4 nesting
}, {
  timestamps: true,
});
EventSchema.index({ location: '2dsphere' });

// ─── Level 3: Treaty/Agreement ───────────────────────────────────────────────
const TreatySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['military', 'trade', 'environmental', 'cultural', 'security', 'other'],
    default: 'other',
  },
  signedDate: { type: Date },
  expiryDate: { type: Date },
  parties: [{ type: String, trim: true }],    // country ISO codes
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'proposed'],
    default: 'active',
  },
  description: { type: String, trim: true },
  documentUrl: { type: String, trim: true },
}, { _id: false });

// ─── Level 2: Bilateral Relation ─────────────────────────────────────────────
const RelationSchema = new mongoose.Schema({
  targetCountry: { type: String, required: true, trim: true }, // ISO-2 code
  targetCountryName: { type: String, required: true, trim: true },
  type: {
    type: String,
    required: true,
    enum: ['alliance', 'trade', 'sanction', 'rivalry', 'neutral', 'cooperation', 'conflict'],
    default: 'neutral',
  },
  strength: { type: Number, min: 0, max: 10, default: 5 },     // 0-10, drives line thickness
  status: {
    type: String,
    enum: ['active', 'inactive', 'strained', 'improving'],
    default: 'active',
  },
  startDate: { type: Date },
  endDate: { type: Date },
  description: { type: String, trim: true },
  tradeVolume: { type: Number },                 // USD billions
  treaties: [TreatySchema],                      // Level 3: embedded treaties
  notes: { type: String, trim: true },
  lastUpdated: { type: Date, default: Date.now },
}, { _id: true });

// ─── Level 1: Actor (Country / Entity) ───────────────────────────────────────
const ActorSchema = new mongoose.Schema({
  // Identity
  name: { type: String, required: true, unique: true, trim: true },
  isoCode: { type: String, required: true, unique: true, uppercase: true, trim: true }, // ISO-2
  isoCode3: { type: String, uppercase: true, trim: true },                              // ISO-3
  capital: { type: String, trim: true },
  region: {
    type: String,
    enum: ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Middle East', 'Central Asia'],
    required: true,
  },
  subRegion: { type: String, trim: true },

  // Geospatial centroid for map markers
  coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },

  // Quick stats (denormalized for fast display)
  population: { type: Number },
  gdp: { type: Number },           // USD billions
  military_spend: { type: Number }, // USD billions
  un_member: { type: Boolean, default: true },
  government_type: { type: String, trim: true },
  flag_emoji: { type: String, trim: true },

  // Color for map display
  mapColor: { type: String, default: '#4A90D9' },

  // Level 2: Embedded bilateral relations
  relations: [RelationSchema],

  // Level 2: Embedded events/conflicts
  events: [EventSchema],

  // Metadata
  isActive: { type: Boolean, default: true },
  lastSyncedAt: { type: Date },                // last ACLED sync timestamp
  createdBy: { type: String, default: 'system' },
}, {
  timestamps: true,
  collection: 'actors',
});

// ─── Indexes ─────────────────────────────────────────────────────────────────

// Geospatial index for country centroid
ActorSchema.index({ coordinates: '2dsphere' });

// Atlas Search autocomplete is defined separately (see atlasSearch.json)
// Compound text index for basic search fallback
ActorSchema.index(
  { name: 'text', 'relations.targetCountryName': 'text', 'events.title': 'text' },
  { name: 'text_search_fallback', weights: { name: 10, 'relations.targetCountryName': 5, 'events.title': 3 } }
);

// Compound index for common query patterns
ActorSchema.index({ region: 1, isActive: 1 });
ActorSchema.index({ isoCode: 1 });
ActorSchema.index({ 'relations.type': 1, 'relations.status': 1 });
ActorSchema.index({ 'events.date': -1 });
ActorSchema.index({ 'events.type': 1 });
ActorSchema.index({ 'events.source': 1 });

// TTL index: auto-delete stale ACLED events older than 2 years (optional)
// ActorSchema.index({ 'events.date': 1 }, { expireAfterSeconds: 63072000, partialFilterExpression: { 'events.source': 'acled' } });

// ─── Virtual: relation count ──────────────────────────────────────────────────
ActorSchema.virtual('relationCount').get(function () {
  return this.relations ? this.relations.length : 0;
});

// ─── Virtual: active conflict count ──────────────────────────────────────────
ActorSchema.virtual('activeConflictCount').get(function () {
  if (!this.events) return 0;
  return this.events.filter(e => e.type === 'conflict').length;
});

// ─── Static: Find by ISO code ─────────────────────────────────────────────────
ActorSchema.statics.findByIso = function (isoCode) {
  return this.findOne({ isoCode: isoCode.toUpperCase() });
};

module.exports = mongoose.model('Actor', ActorSchema);
