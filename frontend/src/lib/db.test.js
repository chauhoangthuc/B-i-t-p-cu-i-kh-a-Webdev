import { describe, it, expect, vi } from 'vitest';
import Dexie from 'dexie';

// dexie mock or simple in-memory simulation for local queue testing
describe('PWA Offline Sync local DB syncQueue tests', () => {
  it('nên lưu chi tiêu khi offline vào hàng đợi syncQueue với ID tạm', async () => {
    // Giả lập IndexedDB syncQueue structure
    const syncQueue = [];
    let nextId = 1;

    const queueRequest = (action, payload) => {
      const item = {
        id: nextId++,
        action,
        payload,
        createdAt: Date.now()
      };
      syncQueue.push(item);
      return item;
    };

    const payload = {
      p_trip_id: 'trip-1',
      p_amount: 1450000,
      p_currency: 'VND',
      p_paid_by: 'user-123',
      p_spent_at: '2026-07-29'
    };

    const item = queueRequest('CREATE_EXPENSE', payload);

    expect(syncQueue).toHaveLength(1);
    expect(item.id).toBeDefined();
    expect(item.action).toBe('CREATE_EXPENSE');
    expect(item.payload.p_amount).toBe(1450000);
  });
});
