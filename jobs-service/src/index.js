import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { initRealtime } from './realtime.js';
import { initStatusEngine } from './cron/status-engine.js';
import { initWeatherEngine } from './cron/weather-engine.js';
import { getTripSettlement } from './settlement.js';
import { sendTripInvitationEmail } from './email.js';

dotenv.config();

const app = express();
app.use(express.json());

// CORS – cho phép frontend (nginx) gọi jobs service
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const server = createServer(app);

// Initialize WebSocket & LISTEN/NOTIFY
initRealtime(server);

// Initialize Cron Jobs
initStatusEngine();
initWeatherEngine();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Settlement API
app.get('/api/trips/:tripId/settlement', async (req, res) => {
  try {
    const transactions = await getTripSettlement(req.params.tripId);
    res.json({ success: true, data: transactions });
  } catch (err) {
    logger.error('Error fetching trip settlement:', err);
    res.status(500).json({ success: false, message: 'Internal server error calculating settlement.' });
  }
});

/**
 * POST /api/invitations/email
 * Gửi email mời thành viên vào chuyến đi.
 * Body: { to, inviterName, tripName, inviteLink }
 * Fire-and-forget: trả về 200 ngay, gửi email bất đồng bộ.
 */
app.post('/api/invitations/email', async (req, res) => {
  const { to, inviterName, tripName, inviteLink } = req.body;

  if (!to || !tripName) {
    return res.status(400).json({ success: false, message: 'Missing required fields: to, tripName' });
  }

  // Trả về success ngay lập tức
  res.json({ success: true, message: 'Invitation queued for delivery.' });

  // Gửi email bất đồng bộ sau khi đã trả response
  try {
    await sendTripInvitationEmail({ to, inviterName, tripName, inviteLink });
    logger.info(`Invitation email sent to ${to} for trip "${tripName}"`);
  } catch (err) {
    logger.warn(`Failed to send invitation email to ${to}: ${err.message} (non-blocking)`);
  }
});

const PORT = process.env.WS_PORT || process.env.JOBS_SERVICE_PORT || 4000;
server.listen(PORT, () => {
  logger.info(`Jobs Service is running on port ${PORT}`);
});
