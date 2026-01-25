import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Loader2, Download, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BalanceSheetDialog({ open, onOpenChange }: BalanceSheetDialogProps) {
  const { company } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['balance-sheet', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      // Get total receivables (customer balances)
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('balance')
        .eq('company_id', company.id);

      if (custError) throw custError;

      // Get total payables (vendor balances)
      const { data: vendors, error: vendError } = await supabase
        .from('vendors')
        .select('balance')
        .eq('company_id', company.id);

      if (vendError) throw vendError;

      // Get total sales
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('total, status')
        .eq('company_id', company.id);

      if (invError) throw invError;

      // Get total purchases
      const { data: purchases, error: purError } = await supabase
        .from('purchases')
        .select('total')
        .eq('company_id', company.id);

      if (purError) throw purError;

      const totalReceivables = customers?.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0) || 0;
      const totalPayables = vendors?.reduce((sum, v) => sum + Math.max(0, v.balance || 0), 0) || 0;
      const totalSales = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const paidSales = invoices?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const totalPurchases = purchases?.reduce((sum, pur) => sum + (pur.total || 0), 0) || 0;
      
      // Simplified balance sheet calculation
      const cashInHand = paidSales - totalPurchases; // Estimated cash
      const totalAssets = cashInHand + totalReceivables;
      const totalLiabilities = totalPayables;
      const equity = totalAssets - totalLiabilities;

      return {
        // Assets
        cashInHand: Math.max(0, cashInHand),
        totalReceivables,
        totalAssets: Math.max(0, cashInHand) + totalReceivables,
        
        // Liabilities
        totalPayables,
        totalLiabilities: totalPayables,
        
        // Equity
        equity,
        retainedEarnings: equity,
        
        // Stats
        customersWithBalance: customers?.filter(c => (c.balance || 0) > 0).length || 0,
        vendorsWithBalance: vendors?.filter(v => (v.balance || 0) > 0).length || 0,
      };
    },
    enabled: open && !!company?.id,
  });

  const handleExport = () => {
    if (!data) return;
    
    const content = [
      'Balance Sheet',
      `As of: ${format(new Date(), 'dd MMM yyyy')}`,
      '',
      'ASSETS',
      `Cash in Hand (Estimated),₹${data.cashInHand.toLocaleString()}`,
      `Accounts Receivable,₹${data.totalReceivables.toLocaleString()}`,
      `Total Assets,₹${data.totalAssets.toLocaleString()}`,
      '',
      'LIABILITIES',
      `Accounts Payable,₹${data.totalPayables.toLocaleString()}`,
      `Total Liabilities,₹${data.totalLiabilities.toLocaleString()}`,
      '',
      'EQUITY',
      `Retained Earnings,₹${data.equity.toLocaleString()}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Balance Sheet
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            As of {format(new Date(), 'dd MMMM yyyy')}
          </div>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-success/50">
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Assets</div>
                  <div className="text-2xl font-bold text-success">₹{(data?.totalAssets || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="border-destructive/50">
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Liabilities</div>
                  <div className="text-2xl font-bold text-destructive">₹{(data?.totalLiabilities || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="border-primary/50">
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Net Equity</div>
                  <div className={cn(
                    "text-2xl font-bold",
                    (data?.equity || 0) >= 0 ? "text-primary" : "text-destructive"
                  )}>
                    ₹{(data?.equity || 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-success">Assets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Current Assets</div>
                    <div className="flex justify-between py-2 border-b">
                      <span>Cash in Hand (Estimated)</span>
                      <span className="font-medium">₹{(data?.cashInHand || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <div>
                        <span>Accounts Receivable</span>
                        <div className="text-xs text-muted-foreground">From {data?.customersWithBalance || 0} customers</div>
                      </div>
                      <span className="font-medium">₹{(data?.totalReceivables || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 font-semibold text-success">
                    <span>Total Assets</span>
                    <span>₹{(data?.totalAssets || 0).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Liabilities & Equity */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-destructive">Liabilities & Equity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Current Liabilities</div>
                    <div className="flex justify-between py-2 border-b">
                      <div>
                        <span>Accounts Payable</span>
                        <div className="text-xs text-muted-foreground">To {data?.vendorsWithBalance || 0} vendors</div>
                      </div>
                      <span className="font-medium">₹{(data?.totalPayables || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Equity</div>
                    <div className="flex justify-between py-2 border-b">
                      <span>Retained Earnings</span>
                      <span className="font-medium">₹{(data?.equity || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 font-semibold">
                    <span>Total Liabilities & Equity</span>
                    <span>₹{(data?.totalAssets || 0).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-sm text-muted-foreground text-center">
              Note: This is a simplified balance sheet based on available transaction data.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
