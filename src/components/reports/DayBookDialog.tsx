import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Download, BookOpen, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DayBookDialog({ open, onOpenChange }: DayBookDialogProps) {
  const { company } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ['day-book', company?.id, selectedDate],
    queryFn: async () => {
      if (!company?.id) return null;

      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Get all invoices (sales) for the day
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .eq('company_id', company.id)
        .eq('date', dateStr)
        .order('created_at', { ascending: true });

      if (invError) throw invError;

      // Get all purchases for the day
      const { data: purchases, error: purError } = await supabase
        .from('purchases')
        .select('*, vendors(name), products(name)')
        .eq('company_id', company.id)
        .eq('date', dateStr)
        .order('created_at', { ascending: true });

      if (purError) throw purError;

      // Combine and sort by type
      const transactions: any[] = [];

      invoices?.forEach((inv: any) => {
        transactions.push({
          id: inv.id,
          type: 'sale',
          reference: inv.invoice_number,
          party: inv.customers?.name || 'Walk-in',
          description: `Sale - ${inv.payment_type}`,
          credit: inv.total,
          debit: 0,
          status: inv.status,
        });
      });

      purchases?.forEach((pur: any) => {
        transactions.push({
          id: pur.id,
          type: 'purchase',
          reference: pur.id.slice(0, 8).toUpperCase(),
          party: pur.vendors?.name || '-',
          description: `Purchase - ${pur.products?.name || 'Product'}`,
          credit: 0,
          debit: pur.total,
        });
      });

      const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
      const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
      const netBalance = totalCredit - totalDebit;

      return {
        transactions,
        totalCredit,
        totalDebit,
        netBalance,
      };
    },
    enabled: open && !!company?.id,
  });

  const handleExport = () => {
    if (!data?.transactions) return;
    
    const csvContent = [
      ['Type', 'Reference', 'Party', 'Description', 'Credit', 'Debit'].join(','),
      ...data.transactions.map((t) => 
        [t.type, t.reference, t.party, t.description, t.credit, t.debit].join(',')
      ),
      ['', '', '', 'Total', data.totalCredit, data.totalDebit].join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `day-book-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Day Book
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Select Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'EEEE, dd MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} />
              </PopoverContent>
            </Popover>
          </div>

          <Button variant="outline" onClick={handleExport} className="gap-2 ml-auto">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ArrowUpRight className="w-4 h-4 text-success" />
                    Total Sales
                  </div>
                  <div className="text-2xl font-bold text-success">₹{(data?.totalCredit || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ArrowDownRight className="w-4 h-4 text-destructive" />
                    Total Purchases
                  </div>
                  <div className="text-2xl font-bold text-destructive">₹{(data?.totalDebit || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Net Balance</div>
                  <div className={cn(
                    "text-2xl font-bold",
                    (data?.netBalance || 0) >= 0 ? "text-success" : "text-destructive"
                  )}>
                    ₹{(data?.netBalance || 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transactions Table */}
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right text-success">Credit (₹)</TableHead>
                    <TableHead className="text-right text-destructive">Debit (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs capitalize",
                          t.type === 'sale' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                        )}>
                          {t.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{t.reference}</TableCell>
                      <TableCell>{t.party}</TableCell>
                      <TableCell className="text-muted-foreground">{t.description}</TableCell>
                      <TableCell className="text-right text-success font-medium">
                        {t.credit > 0 ? `₹${t.credit.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {t.debit > 0 ? `₹${t.debit.toLocaleString()}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.transactions || data.transactions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No transactions for selected date
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
