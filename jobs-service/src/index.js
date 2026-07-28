import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { initRealtime } from './realtime.js';
import { initStatusEngine } from './cron/status-engine.js';
import { initWeatherEngine } from './cron/weather-engine.js';
import { getTripSettlement } from './settlement.js';

dotenv.config();

const app = express();
app.use(express.json());

const server = createServer(app);

// Initialize WebSocket & LISTEN/NOTIFY
initRealtime(server);

// Initialize Cron Jobs
initStatusEngine();
initWeatherEngine();

// Add HTTP endpoints for operations not supported by PostgREST directly
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

app.get('/api/trips/:tripId/settlement', async (req, res) => {
  try {
    const transactions = await getTripSettlement(req.params.tripId);
    res.json({ success: true, data: transactions });
  } catch (err) {
    logger.error('Error fetching trip settlement:', err);
    res.status(500).json({ success: false, message: 'Internal server error calculating settlement.' });
  }
});

const PORT = process.env.WS_PORT || process.env.JOBS_SERVICE_PORT || 4000;
server.listen(PORT, () => {
  logger.info(`Jobs Service is running on port ${PORT}`);
});
