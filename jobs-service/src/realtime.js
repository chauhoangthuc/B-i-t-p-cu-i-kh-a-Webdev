import pg from 'pg';
import { Server } from 'socket.io';
import logger from '../utils/logger.js';

const { Client } = pg;

export function initRealtime(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const connectionString = process.env.DATABASE_URL || 'postgres://postgres:supersecretpassword@localhost:5433/tripmanager';
  const pgClient = new Client({ connectionString });

  pgClient.connect()
    .then(() => {
      logger.info('PostgreSQL LISTEN client connected.');
      pgClient.query('LISTEN data_updates');
    })
    .catch(err => {
      logger.error('Failed to connect PostgreSQL LISTEN client:', err);
    });

  pgClient.on('notification', (msg) => {
    if (msg.channel === 'data_updates') {
      try {
        const payload = JSON.parse(msg.payload);
        logger.info(`Received change notification: Table ${payload.table}, Action ${payload.action}`);
        io.emit('db_update', payload);
      } catch (err) {
        logger.error('Error parsing notification payload:', err);
      }
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}
