import { postgrest } from './api.js';

export const tripService = {
  async getTrips() {
    const res = await postgrest.get('/trips?order=created_at.desc');
    return res.data;
  },

  async createTrip(payload) {
    const res = await postgrest.post('/trips', payload);
    return res.data;
  },

  async getTripDetails(tripId) {
    const res = await postgrest.get(`/trips?id=eq.${tripId}`);
    return res.data?.[0] || null;
  },

  async getTripMembers(tripId) {
    const res = await postgrest.get(`/trip_members?trip_id=eq.${tripId}&select=*,profiles(*)`);
    return res.data;
  }
};
export default tripService;
