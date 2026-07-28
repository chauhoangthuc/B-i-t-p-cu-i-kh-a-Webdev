import Dexie from 'dexie';

export const db = new Dexie('TripManagerDatabase');

db.version(1).stores({
  trips: 'id, name, startDate, endDate, baseCurrency, timezone',
  events: 'id, tripId, title, startTime, endTime, status, category',
  expenses: 'id, tripId, amount, currency, spentAt, paidBy',
  syncQueue: '++id, action, payload, createdAt'
});
