import pg from 'pg';
import cron from 'node-cron';
import axios from 'axios';
import logger from '../../utils/logger.js';

const { Pool } = pg;

export function initWeatherEngine() {
  const connectionString = process.env.DATABASE_URL || 'postgres://postgres:supersecretpassword@localhost:5433/tripmanager';
  const pool = new Pool({ connectionString });

  // Run every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    logger.info('Running Weather Engine cron job...');
    let client;
    try {
      client = await pool.connect();

      // Get events that are upcoming or ongoing, sightseeing category, and have coordinates
      const res = await client.query(`
        SELECT id, trip_id, title, lat, lng 
        FROM events 
        WHERE status IN ('upcoming', 'ongoing') 
          AND category = 'sightseeing' 
          AND lat IS NOT NULL 
          AND lng IS NOT NULL
      `);

      for (const event of res.rows) {
        // Check if there is already a pending change request for this event to avoid duplicate alerts
        const pendingCheck = await client.query(`
          SELECT id FROM change_requests 
          WHERE event_id = $1 AND status = 'pending' AND source = 'weather'
        `, [event.id]);

        if (pendingCheck.rows.length > 0) {
          continue; // Already has a pending suggestion
        }

        try {
          const baseUrl = process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';
          const apiKey = process.env.WEATHER_API_KEY;
          let url = `${baseUrl}?latitude=${event.lat}&longitude=${event.lng}&current=weather_code,temperature_2m`;
          if (apiKey) {
            url += `&apikey=${apiKey}`;
          }
          const response = await axios.get(url);
          const current = response.data?.current;

          if (current) {
            const weatherCode = current.weather_code;
            const temp = current.temperature_2m;
            let condition = 'clear';

            // WMO Weather interpretation codes
            // Rain: 51, 53, 55, 61, 63, 65, 80, 81, 82
            // Storm: 95, 96, 99
            if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) {
              condition = 'rain';
            } else if ([95, 96, 99].includes(weatherCode)) {
              condition = 'storm';
            } else if (temp > 38) {
              condition = 'extreme_heat';
            }

            // Save weather snapshot
            await client.query(`
              INSERT INTO weather_snapshots (event_id, condition, temperature_c)
              VALUES ($1, $2, $3)
            `, [event.id, condition, temp]);

            // If bad weather, suggest postponement
            if (condition === 'rain' || condition === 'storm' || condition === 'extreme_heat') {
              const reason = `Thời tiết xấu phát hiện qua Weather Engine: ${condition === 'rain' ? 'Mưa lớn' : condition === 'storm' ? 'Bão sét' : 'Nhiệt độ cực hạn'} (${temp}°C).`;
              
              const suggestedPayload = {
                status: 'postponed',
                description: `Bị dời lịch do thời tiết xấu. Ghi nhận nhiệt độ: ${temp}°C.`
              };

              await client.query(`
                INSERT INTO change_requests (event_id, source, reason, suggested_action, suggested_payload, status)
                VALUES ($1, 'weather', $2, 'postpone', $3, 'pending')
              `, [event.id, reason, JSON.stringify(suggestedPayload)]);

              logger.info(`Created weather change request for Event ${event.id} due to ${condition}.`);
            }
          }
        } catch (apiErr) {
          logger.error(`Error querying Open-Meteo for event ${event.id}:`, apiErr.message);
        }
      }
    } catch (err) {
      logger.error('Error running Weather Engine cron:', err);
    } finally {
      if (client) client.release();
    }
  });
}
