// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const actorRoutes = require('./routes/actorRoutes');
const { startCron } = require('./cron/acledSync');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in dev
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/actors', actorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
(async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 GeoLink Vault API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });

  // Start ACLED cron job (only in production or when ACLED key is set)
  if (process.env.NODE_ENV === 'production' || process.env.ACLED_API_KEY !== 'your_acled_api_key_here') {
    startCron();
  }
})();
