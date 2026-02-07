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

      // Get customers with opening_balance
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id, opening_balance')
        .eq('company_id', company.id);

      if (custError) throw custError;

      // Get all invoices
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('customer_id, total, status')
        .eq('company_id', company.id);

      if (invError) throw invError;

      // Get all payments
      const { data: payments, error: payError } = await supabase
        .from('payments')
        .select('customer_id, amount, discount')
        .eq('company_id', company.id);

      if (payError) throw payError;

      // Get all adjustments
      const { data: adjustments, error: adjError } = await supabase
        .from('party_adjustments')
        .select('customer_id, amount, type')
        .eq('company_id', company.id);

      if (adjError) throw adjError;

      // Calculate actual customer balances
      const customerBalances = (customers || []).map(customer => {
        const customerInvoices = (invoices || []).filter(i => i.customer_id === customer.id);
        const customerPayments = (payments || []).filter(p => p.customer_id === customer.id);
        const customerAdjustments = (adjustments || []).filter(a => a.customer_id === customer.id);

        const totalInvoices = customerInvoices.reduce((sum, i) => sum + Number(i.total || 0), 0);
        const totalPayments = customerPayments.reduce((sum, p) => sum + Number(p.amount || 0) + Number(p.discount || 0), 0);
        const totalAdjustments = customerAdjustments.reduce((sum, a) => {
          const amount = Number(a.amount || 0);
          return sum + (a.type === 'discount' ? amount : -amount);
        }, 0);

        return Number(customer.opening_balance || 0) + totalInvoices - totalPayments - totalAdjustments;
      });

      // Get vendors with opening_balance
      const { data: vendors, error: vendError } = await supabase
        .from('vendors')
        .select('id, opening_balance')
        .eq('company_id', company.id);

      if (vendError) throw vendError;

      // Get total purchases
      const { data: purchases, error: purError } = await supabase
        .from('purchases')
        .select('vendor_id, total')
        .eq('company_id', company.id);

      if (purError) throw purError;

      // Calculate actual vendor balances
      const vendorBalances = (vendors || []).map(vendor => {
        const vendorPurchases = (purchases || []).filter(p => p.vendor_id === vendor.id);
        const totalPurchases = vendorPurchases.reduce((sum, p) => sum + Number(p.total || 0), 0);
        return Number(vendor.opening_balance || 0) + totalPurchases;
      });

      const totalReceivables = customerBalances.filter(b => b > 0).reduce((sum, b) => sum + b, 0);
      const totalPayables = vendorBalances.filter(b => b > 0).reduce((sum, b) => sum + b, 0);
      const totalSales = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const paidSales = invoices?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const totalPurchases = purchases?.reduce((sum, pur) => sum + (pur.total || 0), 0) || 0;
      
      // Simplified balance sheet calculation
      const cashInHand = paidSales - totalPurchases; // Estimated cash
      const totalAssets = Math.max(0, cashInHand) + totalReceivables;
      const totalLiabilities = totalPayables;
      const equity = totalAssets - totalLiabilities;

      return {
        // Assets
        cashInHand: Math.max(0, cashInHand),
        totalReceivables,
        totalAssets,
        
        // Liabilities
        totalPayables,
        totalLiabilities: totalPayables,
        
        // Equity
        equity,
        retainedEarnings: equity,
        
        // Stats
        customersWithBalance: customerBalances.filter(b => b > 0).length,
        vendorsWithBalance: vendorBalances.filter(b => b > 0).length,
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
