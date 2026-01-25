import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Users, 
  Truck, 
  TrendingUp, 
  BookOpen, 
  Wallet,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Loader2
} from 'lucide-react';
import { useReportsData } from '@/hooks/useReportsData';
import { Skeleton } from '@/components/ui/skeleton';
import { SalesReportDialog } from '@/components/reports/SalesReportDialog';
import { PartyStatementDialog } from '@/components/reports/PartyStatementDialog';
import { VendorStatementDialog } from '@/components/reports/VendorStatementDialog';
import { WeeklyInvoiceDialog } from '@/components/reports/WeeklyInvoiceDialog';
import { DayBookDialog } from '@/components/reports/DayBookDialog';
import { ProfitLossDialog } from '@/components/reports/ProfitLossDialog';
import { BalanceSheetDialog } from '@/components/reports/BalanceSheetDialog';
import { CashLedgerDialog } from '@/components/reports/CashLedgerDialog';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers } from '@/hooks/useCustomers';
import { useVendors } from '@/hooks/useVendors';
import { useInvoices } from '@/hooks/useInvoices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

type ReportType = 'sales' | 'party' | 'vendor' | 'weekly' | 'daybook' | 'pnl' | 'balance' | 'cash';

const reports: { title: string; description: string; icon: any; type: ReportType }[] = [
  { title: 'Sales Report', description: 'Detailed sales analysis by date, customer, or product', icon: TrendingUp, type: 'sales' },
  { title: 'Party Statement', description: 'Customer-wise transaction and balance report', icon: Users, type: 'party' },
  { title: 'Vendor Statement', description: 'Vendor-wise purchase summary and balance', icon: Truck, type: 'vendor' },
  { title: 'Weekly Invoice', description: 'Generate invoice-style report for date range', icon: Calendar, type: 'weekly' },
  { title: 'Day Book', description: 'Daily transaction register', icon: BookOpen, type: 'daybook' },
  { title: 'Profit & Loss', description: 'Income vs expense summary', icon: BarChart3, type: 'pnl' },
  { title: 'Balance Sheet', description: 'Assets, liabilities & equity overview', icon: PieChart, type: 'balance' },
  { title: 'Cash/Bank Ledger', description: 'Cash and bank transaction history', icon: Wallet, type: 'cash' },
];

function formatCurrency(amount: number) {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
}

export default function Reports() {
  const { stats, isLoading } = useReportsData();
  const { company } = useAuth();
  const { customers } = useCustomers();
  const { vendors } = useVendors();
  const { invoices } = useInvoices();
  
  const [openDialog, setOpenDialog] = useState<ReportType | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExportInvoices = async () => {
    setExporting('invoices');
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .eq('company_id', company?.id || '')
        .order('date', { ascending: false });

      if (error) throw error;

      const csvContent = [
        ['Date', 'Invoice #', 'Customer', 'Subtotal', 'Discount', 'Other Charges', 'Total', 'Payment Type', 'Status'].join(','),
        ...(data || []).map((inv: any) => 
          [inv.date, inv.invoice_number, inv.customers?.name || 'Walk-in', inv.subtotal, inv.discount, inv.other_charges, inv.total, inv.payment_type, inv.status].join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      toast.success('Invoices exported successfully');
    } catch (error) {
      toast.error('Failed to export invoices');
    } finally {
      setExporting(null);
    }
  };

  const handleExportCustomers = async () => {
    setExporting('customers');
    try {
      const csvContent = [
        ['Name', 'Phone', 'Email', 'Address', 'Balance'].join(','),
        ...customers.map((c) => [c.name, c.phone || '', c.email || '', c.address || '', c.balance].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      toast.success('Customer data exported');
    } catch (error) {
      toast.error('Failed to export');
    } finally {
      setExporting(null);
    }
  };

  const handleExportVendors = async () => {
    setExporting('vendors');
    try {
      const csvContent = [
        ['Name', 'Phone', 'Email', 'Address', 'Balance'].join(','),
        ...vendors.map((v) => [v.name, v.phone || '', v.email || '', v.address || '', v.balance].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vendors-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      toast.success('Vendor data exported');
    } catch (error) {
      toast.error('Failed to export');
    } finally {
      setExporting(null);
    }
  };

  const handleExportBackup = async () => {
    setExporting('backup');
    try {
      const backup = { customers, vendors, invoices, exportedAt: new Date().toISOString(), company: company?.name };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      toast.success('Backup created successfully');
    } catch (error) {
      toast.error('Failed to create backup');
    } finally {
      setExporting(null);
    }
  };

  return (
    <DashboardLayout title="Reports" subtitle="Access all your business reports">
      <div className="space-y-6 animate-fade-in">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">This Month Sales</div>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.thisMonthSales || 0)}</div>
                  <div className={`text-sm mt-1 ${(stats?.salesGrowth || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {(stats?.salesGrowth || 0) >= 0 ? '+' : ''}{(stats?.salesGrowth || 0).toFixed(0)}% from last month
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Outstanding</div>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.totalOutstanding || 0)}</div>
                  <div className="text-sm text-muted-foreground mt-1">From {stats?.outstandingCustomers || 0} customers</div>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total Purchases</div>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.thisMonthPurchases || 0)}</div>
                  <div className="text-sm text-muted-foreground mt-1">This month</div>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Gross Profit</div>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <div className={`text-2xl font-bold ${(stats?.grossProfit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(stats?.grossProfit || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{(stats?.profitMargin || 0).toFixed(0)}% margin</div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reports.map((report) => (
            <Card key={report.title} className="shadow-card hover:shadow-md transition-all cursor-pointer group" onClick={() => setOpenDialog(report.type)}>
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <report.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <CardTitle className="text-base">{report.title}</CardTitle>
                <CardDescription className="text-sm">{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <FileText className="w-4 h-4" />
                  View Report
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Export Options */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Export Data</CardTitle>
            <CardDescription>Download your data in various formats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="gap-2" onClick={handleExportInvoices} disabled={exporting === 'invoices'}>
                {exporting === 'invoices' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export All Invoices (CSV)
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportCustomers} disabled={exporting === 'customers'}>
                {exporting === 'customers' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Customer Data (CSV)
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportVendors} disabled={exporting === 'vendors'}>
                {exporting === 'vendors' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Vendor Data (CSV)
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportBackup} disabled={exporting === 'backup'}>
                {exporting === 'backup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Full Backup (JSON)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Dialogs */}
      <SalesReportDialog open={openDialog === 'sales'} onOpenChange={(open) => !open && setOpenDialog(null)} />
      <PartyStatementDialog open={openDialog === 'party'} onOpenChange={(open) => !open && setOpenDialog(null)} />
      <VendorStatementDialog open={openDialog === 'vendor'} onOpenChange={(open) => !open && setOpenDialog(null)} />
      <WeeklyInvoiceDialog open={openDialog === 'weekly'} onOpenChange={(open) => !open && setOpenDialog(null)} />
      <DayBookDialog open={openDialog === 'daybook'} onOpenChange={(open) => !open && setOpenDialog(null)} />
      <ProfitLossDialog open={openDialog === 'pnl'} onOpenChange={(open) => !open && setOpenDialog(null)} />
      <BalanceSheetDialog open={openDialog === 'balance'} onOpenChange={(open) => !open && setOpenDialog(null)} />
      <CashLedgerDialog open={openDialog === 'cash'} onOpenChange={(open) => !open && setOpenDialog(null)} />
    </DashboardLayout>
  );
}
