import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalKeyboardShortcuts } from '@/components/GlobalKeyboardShortcuts';
import { OfflineBanner } from '@/components/sync/SyncStatusIndicator';
import { SubscriptionExpiredDialog } from '@/components/subscription/SubscriptionExpiredDialog';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalKeyboardShortcuts />
      <SubscriptionExpiredDialog />
      <Sidebar />
      <div className="md:pl-[260px] transition-all duration-300 flex-1 flex flex-col">
        <OfflineBanner />
        <Header title={title} subtitle={subtitle} />
        <main className="p-4 md:p-6 flex-1">
          {children}
        </main>
        <footer className="border-t border-border py-4 px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>© 2024 BananaBills. All rights reserved.</p>
            <p>
              Designed & Developed by <a href="https://vartsworld.netlify.app/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">VAW TECHNOLOGIES</a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
