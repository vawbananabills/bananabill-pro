import { openDB, IDBPDatabase } from 'idb';

interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

interface SyncMeta {
  companyId: string;
  lastSyncTime: number;
}

const DB_NAME = 'invoice-app-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

export async function getOfflineDb(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Customers store
      if (!db.objectStoreNames.contains('customers')) {
        const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
        customerStore.createIndex('by-company', 'company_id');
      }

      // Vendors store
      if (!db.objectStoreNames.contains('vendors')) {
        const vendorStore = db.createObjectStore('vendors', { keyPath: 'id' });
        vendorStore.createIndex('by-company', 'company_id');
      }

      // Products store
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-company', 'company_id');
      }

      // Invoices store
      if (!db.objectStoreNames.contains('invoices')) {
        const invoiceStore = db.createObjectStore('invoices', { keyPath: 'id' });
        invoiceStore.createIndex('by-company', 'company_id');
      }

      // Invoice items store
      if (!db.objectStoreNames.contains('invoice_items')) {
        const itemsStore = db.createObjectStore('invoice_items', { keyPath: 'id' });
        itemsStore.createIndex('by-invoice', 'invoice_id');
      }

      // Payments store
      if (!db.objectStoreNames.contains('payments')) {
        const paymentsStore = db.createObjectStore('payments', { keyPath: 'id' });
        paymentsStore.createIndex('by-company', 'company_id');
      }

      // Units store
      if (!db.objectStoreNames.contains('units')) {
        const unitsStore = db.createObjectStore('units', { keyPath: 'id' });
        unitsStore.createIndex('by-company', 'company_id');
      }

      // Loose products store
      if (!db.objectStoreNames.contains('loose_products')) {
        const looseStore = db.createObjectStore('loose_products', { keyPath: 'id' });
        looseStore.createIndex('by-company', 'company_id');
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        syncStore.createIndex('by-timestamp', 'timestamp');
      }

      // Sync metadata store
      if (!db.objectStoreNames.contains('sync_meta')) {
        db.createObjectStore('sync_meta', { keyPath: 'companyId' });
      }
    },
  });

  return dbInstance;
}

export type StoreName = 'customers' | 'vendors' | 'products' | 'invoices' | 'invoice_items' | 'payments' | 'units' | 'loose_products';

// Generic CRUD operations for offline storage
export async function saveToOffline<T extends { id: string }>(
  storeName: StoreName,
  data: T | T[]
): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);

  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    await store.put(item);
  }

  await tx.done;
}

export async function getFromOffline<T>(
  storeName: StoreName,
  companyId: string
): Promise<T[]> {
  const db = await getOfflineDb();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  
  // invoice_items use by-invoice index, others use by-company
  if (storeName === 'invoice_items') {
    const all = await store.getAll();
    return all as T[];
  }
  
  const index = store.index('by-company');
  const items = await index.getAll(companyId);
  return items as T[];
}

export async function getByIdFromOffline<T>(
  storeName: StoreName,
  id: string
): Promise<T | undefined> {
  const db = await getOfflineDb();
  const item = await db.get(storeName, id);
  return item as T | undefined;
}

export async function deleteFromOffline(
  storeName: StoreName,
  id: string
): Promise<void> {
  const db = await getOfflineDb();
  await db.delete(storeName, id);
}

// Sync queue operations
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): Promise<void> {
  const db = await getOfflineDb();
  const queueItem: SyncQueueItem = {
    ...item,
    id: `${item.table}-${item.operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  await db.put('sync_queue', queueItem);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getOfflineDb();
  const tx = db.transaction('sync_queue', 'readonly');
  const store = tx.objectStore('sync_queue');
  const index = store.index('by-timestamp');
  return index.getAll();
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getOfflineDb();
  await db.clear('sync_queue');
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getOfflineDb();
  await db.delete('sync_queue', id);
}

// Sync metadata operations
export async function getLastSyncTime(companyId: string): Promise<number> {
  const db = await getOfflineDb();
  const meta = await db.get('sync_meta', companyId) as SyncMeta | undefined;
  return meta?.lastSyncTime || 0;
}

export async function updateLastSyncTime(companyId: string): Promise<void> {
  const db = await getOfflineDb();
  await db.put('sync_meta', { companyId, lastSyncTime: Date.now() });
}

// Clear all offline data
export async function clearAllOfflineData(): Promise<void> {
  const db = await getOfflineDb();
  const storeNames: StoreName[] = [
    'customers', 'vendors', 'products', 'invoices', 
    'invoice_items', 'payments', 'units', 'loose_products'
  ];
  
  for (const storeName of storeNames) {
    await db.clear(storeName);
  }
}
