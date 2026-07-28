import { db } from '../lib/db.js';
import { postgrest } from '../lib/postgrest.js';

export const syncService = {
  async queueRequest(action, payload) {
    await db.syncQueue.add({
      action,
      payload,
      createdAt: Date.now()
    });
    console.log(`Queued action offline: ${action}`);
  },

  async syncQueue() {
    if (!navigator.onLine) return;
    const items = await db.syncQueue.toArray();
    if (items.length === 0) return;

    console.log(`Starting background sync of ${items.length} requests...`);
    for (const item of items) {
      try {
        if (item.action === 'CREATE_EXPENSE') {
          await postgrest.post('/rpc/create_expense_with_shares', item.payload);
        } else if (item.action === 'UPDATE_EXPENSE') {
          await postgrest.patch(`/expenses?id=eq.${item.payload.id}`, item.payload);
        }
        await db.syncQueue.delete(item.id);
        console.log(`Synced successfully: ${item.action}`);
      } catch (err) {
        console.error(`Failed syncing item ${item.id}:`, err);
        break; // Stop execution to prevent out-of-order changes
      }
    }
  }
};

export default syncService;
