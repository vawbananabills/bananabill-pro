import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, Loader2, Download, Wallet, Banknote, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CashLedgerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CashLedgerDialog({ open, onOpenChange }: CashLedgerDialogProps) {
  const { company } = useAuth();
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [paymentType, setPaymentType] = useState<'all' | 'cash' | 'upi' | 'credit'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['cash-ledger', company?.id, dateFrom, dateTo, paymentType],
    queryFn: async () => {
      if (!company?.id) return null;

      let query = supabase
        .from('invoices')
        .select('*, customers(name)')
        .eq('company_id', company.id)
        .gte('date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('date', format(dateTo, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (paymentType !== 'all') {
        query = query.eq('payment_type', paymentType);
      }

      const { data: invoices, error } = await query;
      if (error) throw error;

      // Calculate running balance
      let runningBalance = 0;
      const transactions = invoices?.map((inv: any) => {
        const amount = inv.status === 'paid' ? inv.total : 0;
        runningBalance += amount;
        return {
          id: inv.id,
          date: inv.date,
          reference: inv.invoice_number,
          party: inv.customers?.name || 'Walk-in',
          paymentType: inv.payment_type,
          amount: inv.total,
          status: inv.status,
          received: amount,
          runningBalance,
        };
      }) || [];

      const totalReceived = transactions.reduce((sum, t) => sum + t.received, 0);
      const totalPending = transactions.reduce((sum, t) => sum + (t.status !== 'paid' ? t.amount : 0), 0);

      // Group by payment type
      const byPaymentType = {
        cash: invoices?.filter((inv: any) => inv.payment_type === 'cash' && inv.status === 'paid')
          .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0,
        upi: invoices?.filter((inv: any) => inv.payment_type === 'upi' && inv.status === 'paid')
          .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0,
        credit: invoices?.filter((inv: any) => inv.payment_type === 'credit' && inv.status === 'paid')
          .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0,
      };

      return {
        transactions,
        totalReceived,
        totalPending,
        byPaymentType,
        closingBalance: runningBalance,
      };
    },
    enabled: open && !!company?.id,
  });

  const handleExport = () => {
    if (!data?.transactions) return;
    
    const csvContent = [
      ['Date', 'Reference', 'Party', 'Payment Type', 'Amount', 'Status', 'Received', 'Balance'].join(','),
      ...data.transactions.map((t) => 
        [t.date, t.reference, t.party, t.paymentType, t.amount, t.status, t.received, t.runningBalance].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-ledger-${format(dateFrom, 'yyyy-MM-dd')}-to-${format(dateTo, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Cash & Bank Ledger
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">From Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateFrom, 'dd MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">To Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateTo, 'dd MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)} />
              </PopoverContent>
            </Popover>
          </div>

          <Button variant="outline" onClick={handleExport} className="gap-2 ml-auto">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Payment Type Tabs */}
        <Tabs value={paymentType} onValueChange={(v: any) => setPaymentType(v)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="cash" className="gap-2">
              <Banknote className="w-4 h-4" /> Cash
            </TabsTrigger>
            <TabsTrigger value="upi" className="gap-2">
              <CreditCard className="w-4 h-4" /> UPI
            </TabsTrigger>
            <TabsTrigger value="credit" className="gap-2">
              Credit
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Banknote className="w-4 h-4" />
                    Cash Received
                  </div>
                  <div className="text-xl font-bold text-success">₹{(data?.byPaymentType.cash || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="w-4 h-4" />
                    UPI Received
                  </div>
                  <div className="text-xl font-bold text-primary">₹{(data?.byPaymentType.upi || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Received</div>
                  <div className="text-xl font-bold text-success">₹{(data?.totalReceived || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Pending Amount</div>
                  <div className="text-xl font-bold text-warning">₹{(data?.totalPending || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Transactions Table */}
            <div className="border rounded-lg max-h-[350px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{format(new Date(t.date), 'dd MMM')}</TableCell>
                      <TableCell className="font-medium">{t.reference}</TableCell>
                      <TableCell>{t.party}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs capitalize",
                          t.paymentType === 'cash' ? 'bg-success/20 text-success' :
                          t.paymentType === 'upi' ? 'bg-primary/20 text-primary' :
                          'bg-warning/20 text-warning'
                        )}>
                          {t.paymentType}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">₹{t.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs",
                          t.status === 'paid' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        )}>
                          {t.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-success font-medium">
                        {t.received > 0 ? `₹${t.received.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">₹{t.runningBalance.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!data?.transactions || data.transactions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No transactions found for selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Closing Balance */}
            {data?.transactions && data.transactions.length > 0 && (
              <div className="flex justify-end">
                <Card className="w-64">
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Closing Balance</div>
                    <div className="text-2xl font-bold text-primary">₹{(data?.closingBalance || 0).toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
