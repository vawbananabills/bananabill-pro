import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { 
  performFullSync, 
  downloadAllData, 
  getSyncStatus,
  SyncStatus 
} from '@/lib/syncService';
import { toast } from 'sonner';

export function useOfflineSync() {
  const { company } = useAuth();
  const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    error: null,
  });
  const syncInProgressRef = useRef(false);
  const initialSyncDoneRef = useRef(false);

  // Load sync status on mount
  useEffect(() => {
    if (company?.id) {
      getSyncStatus(company.id).then(setSyncStatus);
    }
  }, [company?.id]);

  // Perform sync
  const sync = useCallback(async (showToast = true) => {
    if (!company?.id || syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const result = await performFullSync(company.id);

      if (result.error) {
        setSyncStatus(prev => ({ ...prev, isSyncing: false, error: result.error || null }));
        if (showToast) toast.error('Sync failed: ' + result.error);
      } else {
        const newStatus = await getSyncStatus(company.id);
        setSyncStatus({ ...newStatus, isSyncing: false });
        if (showToast && result.uploaded > 0) {
          toast.success(`Synced ${result.uploaded} pending changes`);
        } else if (showToast) {
          toast.success('Data synced successfully');
        }
      }
    } catch (err) {
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        error: String(err) 
      }));
      if (showToast) toast.error('Sync failed');
    } finally {
      syncInProgressRef.current = false;
    }
  }, [company?.id]);

  // Initial download when company loads
  useEffect(() => {
    if (company?.id && isOnline && !initialSyncDoneRef.current) {
      initialSyncDoneRef.current = true;
      downloadAllData(company.id).then(() => {
        console.log('[Sync] Initial data download complete');
        getSyncStatus(company.id).then(setSyncStatus);
      }).catch(err => {
        console.error('[Sync] Initial download failed:', err);
      });
    }
  }, [company?.id, isOnline]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && company?.id) {
      console.log('[Sync] Back online, starting auto-sync');
      toast.info('Back online! Syncing data...');
      sync(true);
      clearWasOffline();
    }
  }, [isOnline, wasOffline, company?.id, sync, clearWasOffline]);

  // Refresh sync status periodically
  useEffect(() => {
    if (!company?.id) return;

    const interval = setInterval(async () => {
      const status = await getSyncStatus(company.id);
      setSyncStatus(prev => ({
        ...prev,
        pendingChanges: status.pendingChanges,
        lastSyncTime: status.lastSyncTime,
      }));
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [company?.id]);

  return {
    isOnline,
    syncStatus,
    sync,
    isReady: !!company?.id,
  };
}
