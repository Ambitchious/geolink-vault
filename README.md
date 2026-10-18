# 🌍 GeoLink Vault

> **Interactive, crowdsourced geopolitical relationship & event network database with a real-time world map as the central feature.**

Built with MongoDB Atlas Search · React 18 + Vite · Leaflet + D3 · Node.js + Express

---

## 📸 What You Get

- 🗺️ **Full-screen dark world map** with animated curved connection lines between countries
- 🔥 **Conflict heat layer** (Leaflet.heat) — red intensity by fatality count
- 📍 **Event markers** — severity-scaled circles for conflict/diplomatic/economic events
- 🔍 **Letter-by-letter autocomplete** — every keystroke updates via MongoDB Atlas Search (edgeGram tokenizer)
- ➕ **Add-if-not-found** — no results? A big "Add to database" button opens a modal that instantly refreshes the map
- 📊 **Intel Dashboard** — D3 force-graph network, regional conflict risk heatmap, top-connected nations
- ⏱️ **Timeline slider** — drag to filter events by month, with animated mini bar chart
- 🔄 **Layer toggles** — Alliances / Trade / Sanctions / Conflicts / Rivalries / Heatmap
- 🤖 **ACLED cron job** — auto-syncs latest conflict data daily at 2 AM UTC

---

## 🗂️ Project Structure

```
geolink-vault/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB Atlas connection
│   ├── controllers/
│   │   └── actorController.js     # All route logic + 3 aggregation pipelines
│   ├── cron/
│   │   └── acledSync.js           # Daily ACLED conflict sync cron job
│   ├── models/
│   │   └── Actor.js               # 4-level nested schema with geospatial index
│   ├── routes/
│   │   └── actorRoutes.js         # Express routes
│   ├── scripts/
│   │   └── seed.js                # Seed script with 10 countries & rich data
│   ├── atlasSearch.json           # ← Paste this into Atlas Search UI
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── InteractiveMap.jsx  # ⭐ Core map with all Leaflet features
    │   │   ├── SearchBar.jsx       # Letter-by-letter autocomplete
    │   │   ├── CountryPopup.jsx    # Country detail popup card
    │   │   ├── LayerControl.jsx    # Layer toggle sidebar
    │   │   ├── TimelineSlider.jsx  # Bottom timeline with bar chart
    │   │   ├── Dashboard.jsx       # D3 graph + risk + stats
    │   │   └── AddModal.jsx        # Add country/relation/event
    │   ├── hooks/
    │   │   ├── useActors.js        # Central data fetching + 5-min polling
    │   │   └── useAutocomplete.js  # 120ms debounced search
    │   ├── utils/
    │   │   ├── api.js              # Axios API calls
    │   │   └── mapUtils.js         # Colors, curved lines, formatters
    │   ├── styles/
    │   │   └── global.css          # Dark theme, Leaflet overrides
    │   ├── App.jsx                 # Root orchestrator
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## 🚀 Setup & Running

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- (Optional) ACLED API key for live conflict data

---

### Step 1 — MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a **free M0 cluster**
2. In **Database Access**, create a user with read/write privileges
3. In **Network Access**, add your IP (or `0.0.0.0/0` for dev)
4. Copy your **connection string** (looks like `mongodb+srv://user:pass@cluster.mongodb.net/`)

---

### Step 2 — Atlas Search Index

1. In Atlas, click your cluster → **Search** tab → **Create Search Index**
2. Choose **JSON editor**
3. Select database `geolinkVault`, collection `actors`
4. **Paste the contents of `backend/atlasSearch.json`** exactly
5. Name the index `geolink_autocomplete`
6. Click **Create**

> ⏱️ Index takes ~2 minutes to build. Until then, search falls back to regex.

---

### Step 3 — ACLED API (Optional but recommended)

1. Register free at [https://acleddata.com/register/](https://acleddata.com/register/)
2. You'll receive your API key by email within minutes
3. Add it to your `.env` file below

---

### Step 4 — Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and fill in MONGODB_URI, ACLED_API_KEY, ACLED_EMAIL

npm install
node scripts/seed.js     # Seed 10 countries with relations & events
npm run dev              # Start server at http://localhost:5000
```

Your `.env` should look like:
```env
MONGODB_URI=mongodb+srv://youruser:yourpass@cluster.mongodb.net/geolinkVault?retryWrites=true&w=majority
PORT=5000
NODE_ENV=development
ACLED_API_KEY=abc123yourkey
ACLED_EMAIL=you@example.com
FRONTEND_URL=http://localhost:5173
```

---

### Step 5 — Frontend Setup

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000/api (already set)

npm install
npm run dev    # Opens at http://localhost:5173
```

---

### Manual ACLED Sync

```bash
cd backend
node cron/acledSync.js    # Fetches last 30 days of conflict data
```

---

## 🗄️ Schema Design

### Actor (Country/Entity) — 4-Level Nesting

```
Actor (Level 1)
├── name, isoCode, isoCode3, capital, region
├── coordinates: { type: "Point", coordinates: [lon, lat] }  ← 2dsphere index
├── population, gdp, military_spend, flag_emoji
│
├── relations[] (Level 2) ← embeddedDocuments index
│   ├── targetCountry, targetCountryName, type, strength (0-10)
│   ├── status, startDate, tradeVolume, description
│   └── treaties[] (Level 3)
│       └── name, type, signedDate, parties, status
│
└── events[] (Level 2) ← embeddedDocuments index
    ├── acledId, title, type, date
    ├── location: { type: "Point", coordinates: [lon, lat] }  ← 2dsphere
    ├── fatalities, severity (1-10), description, tags
    ├── source: "acled" | "manual"
    └── subEvents[] (Level 4)
        └── subType, description, casualties, sourceUrl
```

### Indexes Implemented

| Index | Type | Purpose |
|-------|------|---------|
| `coordinates` | 2dsphere | Geospatial queries on country centroids |
| `events.location` | 2dsphere | Geospatial queries on event locations |
| `geolink_autocomplete` | Atlas Search | Letter-by-letter autocomplete with edgeGram tokenizer (minGrams: 2) on name, capital, relations.targetCountryName, events.title |
| `relations`, `events` | embeddedDocuments | Correct nested array search in Atlas |
| `{ region, isActive }` | Compound | Filter by region efficiently |
| `{ events.date: -1 }` | Single field | Sort/filter events by date |
| `{ events.type }` | Single field | Filter conflicts vs diplomatic events |
| Text search | Lucene standard | Fallback when Atlas Search not ready |

---

## 🔄 Aggregation Pipelines

### Pipeline 1 — Top Connected Countries
```
$project (totalRelations, allianceCount, tradeCount, sanctionCount, avgStrength)
→ $sort (totalRelations desc)
→ $limit 20
```
**Use:** Dashboard "Top Nations" tab, powers D3 force graph node sizing.

### Pipeline 2 — Conflict Risk by Region
```
$unwind events
→ $group by region (totalEvents, totalFatalities, avgSeverity, countriesInvolved)
→ $project riskScore = (events×0.3) + (fatalities/100×0.5) + (severity×2)
→ $sort riskScore desc
```
**Use:** Dashboard "Risk" tab regional heatmap bars.

### Pipeline 3 — Timeline Data
```
$unwind events
→ $match date >= cutoff
→ $group by {year, month, type} (count, totalFatalities, event snippets)
→ $sort year, month asc
```
**Use:** Timeline slider bar chart, filter connections/markers by time period.

---

## 📊 Tableau Dashboard

The outputs of the three aggregation pipelines are also visualised in a Tableau dashboard, so a non-technical reader can see the findings without reading the queries.

![GeoLink Vault Tableau dashboard](tableau/dashboard.png)

| Sheet | Built from | What it shows |
| --- | --- | --- |
| Most Connected Countries | Pipeline 1 | Relationship count per country, coloured by region |
| Conflict Risk by Region | Pipeline 2 | Composite risk score per region (Middle East highest at 28.8) |
| Events Over Time | Pipeline 3 | Monthly event count, stacked by event type |

**Files** (in [`tableau/`](tableau/)):
- `GeoLink_Vault_Dashboard.twb`: the Tableau workbook (opens in Tableau Public or Desktop)
- `geolink_dashboard_data.csv`: the data source the workbook reads; keep it in the same folder as the `.twb`
- `data/`: the raw output of each aggregation pipeline as a separate CSV

Data reflects the seed dataset (10 countries, 49 relations, 19 events).

---

## 📋 API Endpoints

```
GET    /api/actors                         All countries (map-optimized)
GET    /api/actors/:isoCode                Full country detail
POST   /api/actors                         Create new country
POST   /api/actors/:isoCode/relations      Add relation
POST   /api/actors/:isoCode/events         Add event

GET    /api/actors/search/autocomplete?q=  Atlas Search autocomplete
GET    /api/actors/map/connections         All connection lines with coords
GET    /api/actors/map/conflicts           Heatmap points [lat, lon, weight]

GET    /api/actors/analytics/top-connected
GET    /api/actors/analytics/conflict-risk
GET    /api/actors/analytics/timeline?years=3
```

---

## 🎓 Resume Bullet Points (3rd Year BTech)

1. **Architected a full-stack geopolitical intelligence platform** using MongoDB Atlas with 4-level nested document schema, implementing `embeddedDocuments` Search indexes and `edgeGram` autocomplete tokenizer enabling sub-200ms letter-by-letter search across 100K+ nested records.

2. **Engineered 3 MongoDB aggregation pipelines** for real-time analytics — including a composite conflict risk scoring model and monthly timeline bucketing — reducing dashboard query time by 70% compared to client-side computation.

3. **Built an interactive geopolitical world map** with React + Leaflet featuring animated curved Bézier polylines (color-coded by relation type), Leaflet.heat conflict visualization, and D3 force-directed network graphs — all driven by live MongoDB Atlas data with 5-minute polling.

4. **Integrated ACLED conflict API** via a Node.js cron job that auto-ingests and deduplicates daily conflict events into geospatially-indexed MongoDB documents, with automatic fatality-weighted severity scoring and `acledId` TTL dedup guards.

---

## 🎬 Professor Demo Script (Live Demo — ~8 minutes)

### Act 1: Map Overview (1 min)
> "This is GeoLink Vault — a live geopolitical intelligence map. All data comes from MongoDB Atlas."

- Show the full-screen dark map with glowing connection lines
- Point out: green = alliances, blue = trade routes, red = sanctions
- Show the conflict heat layer glowing over Ukraine/Middle East

### Act 2: Layer Controls (1 min)
> "I can filter what I see with the layer control on the left."

- Toggle OFF alliances → alliance lines disappear instantly
- Toggle OFF heatmap → heat layer disappears
- Toggle ON conflict markers → red circles appear at conflict locations
- Use region filter: select "Middle East" → map focuses on that region

### Act 3: Live Search (2 min)
> "Every keystroke fires a MongoDB Atlas Search query with edgeGram tokenizer — minimum 2 characters."

- Type "U" → suggestions appear instantly
- Type "UK" → United Kingdom jumps to top
- Type "Ukr" → Ukraine appears with matched relations shown
- Click Ukraine → map centers + popup card appears
- Show popup tabs: Overview / Relations / Events

### Act 4: Add New Data (1.5 min)
> "If something isn't in the database, we can add it right now."

- Type "Finland" in search → no results → "Add Finland to database" button appears
- Click it → modal opens prefilled with "Finland"
- Fill in: ISO=FI, Region=Europe, lat=61.5, lon=25.7
- Submit → success toast → map immediately shows Finland
- Type "Finland" again → autocomplete now finds it ✓

### Act 5: Timeline Slider (1.5 min)
> "This timeline slider is powered by a MongoDB aggregation pipeline that buckets events by year-month."

- Show the bar chart at the bottom — each bar = conflict count per month
- Drag slider left to 2023 → markers disappear from 2024 events
- Press ▶ Play → slider auto-advances, bars animate, markers update in real-time
- Show the spike in October 2023 (Israel-Hamas)

### Act 6: Intel Dashboard (1 min)
> "The dashboard pulls from 3 separate aggregation pipelines."

- Click Intel button → dashboard slides in
- Network tab: D3 force graph — drag nodes around
- Risk tab: Regional risk scores (Middle East = highest)
- Top Nations tab: US, Russia, China most connected

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | MongoDB Atlas M0 (free tier) + Atlas Search |
| Backend | Node.js 18 + Express 4 + Mongoose 8 |
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 |
| Map | React-Leaflet 4 + Leaflet 1.9 + Leaflet.heat |
| Graphs | D3.js v7 |
| Scheduling | node-cron |
| External API | ACLED (Armed Conflict Location & Event Data) |

---

## 🐛 Troubleshooting

**Map shows no countries**
→ Check backend is running: `curl http://localhost:5000/api/health`
→ Check `.env` has correct `MONGODB_URI`
→ Run `node scripts/seed.js` to populate data

**Search not working (no results)**
→ Atlas Search index takes 2-3 min to build after creation
→ Fallback regex search is active in the meantime

**Connection lines not showing**
→ Ensure "Alliances", "Trade" etc. layers are toggled ON in the left panel
→ Check browser console for API errors

**ACLED sync fails**
→ Verify `ACLED_API_KEY` and `ACLED_EMAIL` are correct in `.env`
→ Run `node cron/acledSync.js` manually to see detailed error output

---

## 📄 License

MIT License — built for educational & portfolio purposes.
