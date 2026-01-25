import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { MobileSidebar } from './MobileSidebar';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { SendNotificationDialog } from '@/components/notifications/SendNotificationDialog';
import { SyncStatusIndicator } from '@/components/sync/SyncStatusIndicator';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { isSuperAdmin } = useSuperAdmin();

  return (
    <header className="h-14 md:h-16 bg-card border-b border-border flex items-center justify-between px-3 md:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar />
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-3">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search invoices, customers..." 
            className="pl-9 w-64 bg-background"
          />
        </div>

        <SyncStatusIndicator />

        {isSuperAdmin && <SendNotificationDialog />}
        
        <NotificationDropdown />
        
        <Link to="/invoice/new">
          <Button size="sm" className="gap-2 h-9">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Invoice</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
