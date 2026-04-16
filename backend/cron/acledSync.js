// backend/cron/acledSync.js
/**
 * ACLED Sync Cron Job
 * Fetches latest conflict events from ACLED API and embeds them into actors.
 * Runs daily at 2:00 AM UTC.
 *
 * ACLED API docs: https://acleddata.com/acleddatanew/wp-content/uploads/2021/11/ACLED_API-User-Guide_2021.pdf
 * Register free at: https://acleddata.com/register/
 */

const cron = require('node-cron');
const axios = require('axios');
const mongoose = require('mongoose');
const Actor = require('../models/Actor');
require('dotenv').config({ path: '../.env' });

// Map ACLED event types to our schema
const ACLED_TYPE_MAP = {
  'Battles': 'conflict',
  'Violence against civilians': 'conflict',
  'Explosions/Remote violence': 'conflict',
  'Protests': 'political',
  'Riots': 'political',
  'Strategic developments': 'diplomatic',
};

const ACLED_SUBTYPE_MAP = {
  'Armed clash': 'Armed Clash',
  'Air/drone strike': 'Airstrike',
  'Shelling/artillery/missile attack': 'Shelling',
  'Attack': 'Attack',
  'Peaceful protest': 'Protest',
  'Violent demonstration': 'Riot',
};

/**
 * Fetch latest ACLED events for the past N days
 */
async function fetchACLEDEvents(daysBack = 30) {
  const apiKey = process.env.ACLED_API_KEY;
  const email = process.env.ACLED_EMAIL;

  if (!apiKey || apiKey === 'your_acled_api_key_here') {
    console.warn('⚠️  ACLED API key not configured. Skipping sync.');
    return [];
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const formatDate = d => d.toISOString().split('T')[0].replace(/-/g, '-');

  const url = 'https://api.acleddata.com/acled/read';
  const params = {
    key: apiKey,
    email: email,
    event_date: `${formatDate(startDate)}|${formatDate(endDate)}`,
    event_date_where: 'BETWEEN',
    limit: 500,
    fields: 'event_id_cnty|event_date|event_type|sub_event_type|country|iso3|admin1|location|latitude|longitude|fatalities|notes|source',
  };

  const response = await axios.get(url, { params, timeout: 30000 });

  if (response.data && response.data.data) {
    return response.data.data;
  }
  return [];
}

/**
 * Upsert ACLED events into the matching Actor document
 */
async function syncACLEDEvents() {
  console.log(`🔄 [ACLED SYNC] Starting at ${new Date().toISOString()}`);

  let events;
  try {
    events = await fetchACLEDEvents(30);
    console.log(`📡 [ACLED SYNC] Fetched ${events.length} events`);
  } catch (err) {
    console.error(`❌ [ACLED SYNC] Fetch error: ${err.message}`);
    return;
  }

  let inserted = 0;
  let skipped = 0;

  for (const ev of events) {
    try {
      const isoCode = ev.iso3
        ? (await Actor.findOne({ isoCode3: ev.iso3.toUpperCase() }))?.isoCode
        : null;

      if (!isoCode) { skipped++; continue; }

      // Check for duplicate via acledId
      const actor = await Actor.findOne({ isoCode });
      if (!actor) { skipped++; continue; }

      const alreadyExists = actor.events.some(e => e.acledId === ev.event_id_cnty);
      if (alreadyExists) { skipped++; continue; }

      const newEvent = {
        acledId: ev.event_id_cnty,
        title: `${ev.event_type} in ${ev.location || ev.admin1 || ev.country}`,
        type: ACLED_TYPE_MAP[ev.event_type] || 'conflict',
        subType: ACLED_SUBTYPE_MAP[ev.sub_event_type] || ev.sub_event_type,
        date: new Date(ev.event_date),
        location: {
          type: 'Point',
          coordinates: [parseFloat(ev.longitude), parseFloat(ev.latitude)],
          placeName: ev.location || ev.admin1,
        },
        fatalities: parseInt(ev.fatalities) || 0,
        severity: Math.min(10, Math.max(1, Math.ceil((parseInt(ev.fatalities) || 1) / 10) + 2)),
        description: ev.notes ? ev.notes.substring(0, 500) : '',
        tags: [ev.event_type, ev.sub_event_type].filter(Boolean),
        source: 'acled',
        involvedActors: [isoCode],
      };

      await Actor.updateOne(
        { isoCode },
        { $push: { events: newEvent }, $set: { lastSyncedAt: new Date() } }
      );

      inserted++;
    } catch (err) {
      console.error(`⚠️  [ACLED SYNC] Error processing event ${ev.event_id_cnty}: ${err.message}`);
    }
  }

  console.log(`✅ [ACLED SYNC] Done. Inserted: ${inserted}, Skipped: ${skipped}`);
}

// ─── Schedule: Run daily at 2:00 AM UTC ──────────────────────────────────────
const startCron = () => {
  cron.schedule('0 2 * * *', async () => {
    await syncACLEDEvents();
  }, {
    timezone: 'UTC',
  });
  console.log('📅 ACLED sync cron scheduled: daily at 2:00 AM UTC');
};

// ─── Allow manual run ─────────────────────────────────────────────────────────
if (require.main === module) {
  // Direct run: node cron/acledSync.js
  (async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    await syncACLEDEvents();
    await mongoose.disconnect();
    process.exit(0);
  })();
}

module.exports = { startCron, syncACLEDEvents };
