import pg from 'pg';
import cron from 'node-cron';
import logger from '../../utils/logger.js';

const { Pool } = pg;

export function initStatusEngine() {
  const connectionString = process.env.DATABASE_URL || 'postgres://postgres:supersecretpassword@localhost:5433/tripmanager';
  const pool = new Pool({ connectionString });

  // Run every 15 seconds
  cron.schedule('*/15 * * * * *', async () => {
    logger.debug('Running Status Engine cron job...');
    let client;
    try {
      client = await pool.connect();
      
      // Query events that need status update
      const res = await client.query(`
        SELECT e.id, e.status, e.start_time, e.end_time, t.timezone 
        FROM events e 
        JOIN trips t ON e.trip_id = t.id 
        WHERE e.status IN ('upcoming', 'ongoing')
      `);

      const now = new Date();

      for (const event of res.rows) {
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        let newStatus = null;

        if (event.status === 'upcoming' && now >= startTime) {
          newStatus = 'ongoing';
        } else if (event.status === 'ongoing' && now >= endTime) {
          newStatus = 'done';
        }

        if (newStatus) {
          await client.query('UPDATE events SET status = $1, updated_at = now() WHERE id = $2', [newStatus, event.id]);
          logger.info(`Updated Event ${event.id} status to ${newStatus} (Trip Timezone: ${event.timezone})`);
        }
      }
    } catch (err) {
      logger.error('Error running Status Engine cron:', err);
    } finally {
      if (client) client.release();
    }
  });
}
