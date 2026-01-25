import { supabase } from '@/integrations/supabase/client';
import {
  saveToOffline,
  getFromOffline,
  getSyncQueue,
  removeSyncQueueItem,
  updateLastSyncTime,
  getLastSyncTime,
  addToSyncQueue,
  StoreName,
} from './offlineDb';

const SYNC_TABLES: StoreName[] = [
  'customers',
  'vendors',
  'products',
  'invoices',
  'invoice_items',
  'payments',
  'units',
  'loose_products',
];

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  error: string | null;
}

// Fetch all data from server and store offline
export async function downloadAllData(companyId: string): Promise<void> {
  console.log('[Sync] Starting full data download for company:', companyId);

  for (const table of SYNC_TABLES) {
    try {
      let data: any[] | null = null;
      let error: any = null;

      // Filter by company_id for most tables
      if (table === 'invoice_items') {
        const result = await supabase.from('invoice_items').select('*');
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase.from(table).select('*').eq('company_id', companyId);
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error(`[Sync] Error fetching ${table}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        await saveToOffline(table, data);
        console.log(`[Sync] Downloaded ${data.length} records from ${table}`);
      }
    } catch (err) {
      console.error(`[Sync] Failed to download ${table}:`, err);
    }
  }

  await updateLastSyncTime(companyId);
  console.log('[Sync] Full download complete');
}

// Upload pending changes to server
export async function uploadPendingChanges(): Promise<{ success: number; failed: number }> {
  const queue = await getSyncQueue();
  console.log(`[Sync] Processing ${queue.length} pending changes`);

  let success = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      let error: any = null;

      switch (item.operation) {
        case 'insert':
          const insertResult = await supabase.from(item.table as any).insert(item.data);
          error = insertResult.error;
          break;
        case 'update':
          const updateResult = await supabase.from(item.table as any).update(item.data).eq('id', item.data.id);
          error = updateResult.error;
          break;
        case 'delete':
          const deleteResult = await supabase.from(item.table as any).delete().eq('id', item.data.id);
          error = deleteResult.error;
          break;
      }

      if (error) {
        console.error(`[Sync] Failed to sync ${item.operation} on ${item.table}:`, error);
        failed++;
      } else {
        await removeSyncQueueItem(item.id);
        success++;
        console.log(`[Sync] Synced ${item.operation} on ${item.table}`);
      }
    } catch (err) {
      console.error(`[Sync] Error processing queue item:`, err);
      failed++;
    }
  }

  return { success, failed };
}

// Full sync: upload changes then download fresh data
export async function performFullSync(companyId: string): Promise<{ uploaded: number; downloaded: boolean; error?: string }> {
  console.log('[Sync] Starting full sync');

  try {
    // First, upload any pending changes
    const { success: uploaded } = await uploadPendingChanges();

    // Then download fresh data
    await downloadAllData(companyId);

    return { uploaded, downloaded: true };
  } catch (err) {
    console.error('[Sync] Full sync failed:', err);
    return { uploaded: 0, downloaded: false, error: String(err) };
  }
}

// Queue a change for later sync
export async function queueChange(
  table: StoreName,
  operation: 'insert' | 'update' | 'delete',
  data: any
): Promise<void> {
  await addToSyncQueue({ table, operation, data });
  // Also save to local DB for immediate access
  if (operation !== 'delete') {
    await saveToOffline(table, data);
  }
}

// Get data with offline fallback
export async function getDataWithFallback<T>(
  table: StoreName,
  companyId: string,
  onlineQuery: () => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
  if (navigator.onLine) {
    try {
      const { data, error } = await onlineQuery();
      if (!error && data) {
        // Update offline cache
        await saveToOffline(table, data as any[]);
        return data;
      }
    } catch (err) {
      console.warn(`[Sync] Online fetch failed for ${table}, falling back to offline`);
    }
  }

  // Fallback to offline data
  const offlineData = await getFromOffline<T>(table, companyId);
  console.log(`[Sync] Using ${offlineData.length} offline records from ${table}`);
  return offlineData;
}

// Get sync status
export async function getSyncStatus(companyId: string): Promise<SyncStatus> {
  const queue = await getSyncQueue();
  const lastSync = await getLastSyncTime(companyId);

  return {
    isSyncing: false,
    lastSyncTime: lastSync || null,
    pendingChanges: queue.length,
    error: null,
  };
}
