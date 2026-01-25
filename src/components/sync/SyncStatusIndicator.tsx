import { Cloud, CloudOff, Loader2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export function SyncStatusIndicator() {
  const { isOnline, syncStatus, sync } = useOfflineSync();

  const getStatusIcon = () => {
    if (syncStatus.isSyncing) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    if (!isOnline) {
      return <CloudOff className="h-4 w-4 text-destructive" />;
    }
    if (syncStatus.error) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (syncStatus.pendingChanges > 0) {
      return <Cloud className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (syncStatus.isSyncing) return 'Syncing...';
    if (!isOnline) return 'Offline';
    if (syncStatus.error) return 'Sync Error';
    if (syncStatus.pendingChanges > 0) return `${syncStatus.pendingChanges} pending`;
    return 'Synced';
  };

  const getLastSyncText = () => {
    if (!syncStatus.lastSyncTime) return 'Never synced';
    return `Last synced ${formatDistanceToNow(new Date(syncStatus.lastSyncTime), { addSuffix: true })}`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 px-2"
              onClick={() => sync(true)}
              disabled={!isOnline || syncStatus.isSyncing}
            >
              {getStatusIcon()}
              <span className="text-xs hidden sm:inline">{getStatusText()}</span>
              {syncStatus.pendingChanges > 0 && isOnline && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {syncStatus.pendingChanges}
                </Badge>
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <div className="space-y-1">
            <p className="font-medium">{isOnline ? 'Online' : 'Offline Mode'}</p>
            <p className="text-xs text-muted-foreground">{getLastSyncText()}</p>
            {syncStatus.pendingChanges > 0 && (
              <p className="text-xs text-yellow-600">
                {syncStatus.pendingChanges} changes waiting to sync
              </p>
            )}
            {syncStatus.error && (
              <p className="text-xs text-destructive">{syncStatus.error}</p>
            )}
            {isOnline && !syncStatus.isSyncing && (
              <p className="text-xs text-muted-foreground mt-1">Click to sync now</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function OfflineBanner() {
  const { isOnline, syncStatus } = useOfflineSync();

  if (isOnline && !syncStatus.pendingChanges) return null;

  return (
    <div
      className={`px-4 py-2 text-center text-sm font-medium ${
        isOnline
          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
      }`}
    >
      {!isOnline ? (
        <div className="flex items-center justify-center gap-2">
          <CloudOff className="h-4 w-4" />
          <span>You're offline. Changes will sync when you're back online.</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <Cloud className="h-4 w-4" />
          <span>{syncStatus.pendingChanges} changes pending sync</span>
        </div>
      )}
    </div>
  );
}
