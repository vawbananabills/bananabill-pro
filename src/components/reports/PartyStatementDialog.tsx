import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers } from '@/hooks/useCustomers';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, Loader2, Download, Users, Printer, Plus, Minus, Trash2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PartyStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCustomerId?: string | null;
}

interface StatementEntry {
  id: string;
  date: string;
  particulars: string;
  type: 'invoice' | 'payment' | 'adjustment';
  adjustmentType?: 'discount' | 'additional';
  debit: number;
  credit: number;
  balance: number;
  notes?: string;
}

interface PartyAdjustment {
  id: string;
  date: string;
  type: 'discount' | 'additional';
  amount: number;
  notes: string | null;
}

export function PartyStatementDialog({ open, onOpenChange, initialCustomerId }: PartyStatementDialogProps) {
  const { company, user } = useAuth();
  const { customers } = useCustomers();
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [selectedCustomer, setSelectedCustomer] = useState<string>(initialCustomerId || '');
  
  // Sync with initialCustomerId when dialog opens
  useEffect(() => {
    if (initialCustomerId && open) {
      setSelectedCustomer(initialCustomerId);
    }
  }, [initialCustomerId, open]);
  
  // New adjustment form state
  const [newAdjustmentType, setNewAdjustmentType] = useState<'discount' | 'additional'>('discount');
  const [newAdjustmentAmount, setNewAdjustmentAmount] = useState<string>('');
  const [newAdjustmentDate, setNewAdjustmentDate] = useState<Date>(new Date());
  const [newAdjustmentNotes, setNewAdjustmentNotes] = useState<string>('');

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  // Fetch adjustments for selected customer
  const { data: adjustments = [], isLoading: adjustmentsLoading } = useQuery({
    queryKey: ['party-adjustments', company?.id, selectedCustomer, dateFrom, dateTo],
    queryFn: async () => {
      if (!company?.id || !selectedCustomer) return [];

      const { data, error } = await supabase
        .from('party_adjustments')
        .select('*')
        .eq('company_id', company.id)
        .eq('customer_id', selectedCustomer)
        .gte('date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('date', format(dateTo, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;
      return (data || []) as PartyAdjustment[];
    },
    enabled: open && !!company?.id && !!selectedCustomer,
  });

  // Add adjustment mutation
  const addAdjustmentMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id || !selectedCustomer) throw new Error('Missing data');
      
      const amount = parseFloat(newAdjustmentAmount);
      if (!amount || amount <= 0) throw new Error('Invalid amount');

      const { error } = await supabase
        .from('party_adjustments')
        .insert({
          company_id: company.id,
          customer_id: selectedCustomer,
          date: format(newAdjustmentDate, 'yyyy-MM-dd'),
          type: newAdjustmentType,
          amount,
          notes: newAdjustmentNotes || null,
          created_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Adjustment added successfully');
      queryClient.invalidateQueries({ queryKey: ['party-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      // Reset form
      setNewAdjustmentAmount('');
      setNewAdjustmentNotes('');
      setNewAdjustmentDate(new Date());
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add adjustment');
    },
  });

  // Delete adjustment mutation
  const deleteAdjustmentMutation = useMutation({
    mutationFn: async (adjustmentId: string) => {
      const { error } = await supabase
        .from('party_adjustments')
        .delete()
        .eq('id', adjustmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Adjustment deleted');
      queryClient.invalidateQueries({ queryKey: ['party-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
    },
    onError: () => {
      toast.error('Failed to delete adjustment');
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['party-statement', company?.id, selectedCustomer, dateFrom, dateTo, adjustments],
    queryFn: async () => {
      if (!company?.id || !selectedCustomer) return { entries: [], openingBalance: 0 };

      // Get invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', company.id)
        .eq('customer_id', selectedCustomer)
        .gte('date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('date', format(dateTo, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (invoicesError) throw invoicesError;

      // Get payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', company.id)
        .eq('customer_id', selectedCustomer)
        .gte('payment_date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('payment_date', format(dateTo, 'yyyy-MM-dd'))
        .order('payment_date', { ascending: true });

      if (paymentsError) throw paymentsError;

      // Get customer's opening balance (the initial balance set by user)
      const { data: customerData } = await supabase
        .from('customers')
        .select('opening_balance')
        .eq('id', selectedCustomer)
        .maybeSingle();

      const customerOpeningBalance = Number(customerData?.opening_balance || 0);

      // Get invoices BEFORE the selected date range
      const { data: priorInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('company_id', company.id)
        .eq('customer_id', selectedCustomer)
        .lt('date', format(dateFrom, 'yyyy-MM-dd'));

      // Get payments BEFORE the selected date range
      const { data: priorPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', company.id)
        .eq('customer_id', selectedCustomer)
        .lt('payment_date', format(dateFrom, 'yyyy-MM-dd'));

      // Get adjustments BEFORE the selected date range
      const { data: priorAdjustments } = await supabase
        .from('party_adjustments')
        .select('amount, type')
        .eq('company_id', company.id)
        .eq('customer_id', selectedCustomer)
        .lt('date', format(dateFrom, 'yyyy-MM-dd'));

      // Calculate prior period totals
      const priorInvoiceTotal = priorInvoices?.reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0;
      const priorPaymentTotal = priorPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
      const priorDiscountTotal = (priorAdjustments || [])
        .filter(a => a.type === 'discount')
        .reduce((sum, a) => sum + Number(a.amount || 0), 0);
      const priorAdditionalTotal = (priorAdjustments || [])
        .filter(a => a.type === 'additional')
        .reduce((sum, a) => sum + Number(a.amount || 0), 0);

      // Opening balance = customer's opening balance + prior invoices + prior additional - prior payments - prior discounts
      const openingBalance = customerOpeningBalance + priorInvoiceTotal + priorAdditionalTotal - priorPaymentTotal - priorDiscountTotal;

      // Combine and sort all entries
      const allEntries: { date: string; type: 'invoice' | 'payment' | 'adjustment'; adjustmentType?: 'discount' | 'additional'; data: any }[] = [];
      
      invoices?.forEach(inv => {
        allEntries.push({ date: inv.date, type: 'invoice', data: inv });
      });
      
      payments?.forEach(p => {
        allEntries.push({ date: p.payment_date, type: 'payment', data: p });
      });

      adjustments?.forEach(adj => {
        allEntries.push({ date: adj.date, type: 'adjustment', adjustmentType: adj.type, data: adj });
      });

      // Sort by date
      allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Build statement entries with running balance
      let runningBalance = openingBalance;
      const entries: StatementEntry[] = allEntries.map((entry) => {
        if (entry.type === 'invoice') {
          const debit = entry.data.total || 0;
          runningBalance += debit;
          return {
            id: entry.data.id,
            date: entry.data.date,
            particulars: `Invoice ${entry.data.invoice_number}`,
            type: 'invoice' as const,
            debit,
            credit: 0,
            balance: runningBalance,
          };
        } else if (entry.type === 'payment') {
          const credit = entry.data.amount || 0;
          runningBalance -= credit;
          return {
            id: entry.data.id,
            date: entry.data.payment_date,
            particulars: `Payment (${entry.data.payment_method || 'Cash'})${entry.data.notes ? ' - ' + entry.data.notes : ''}`,
            type: 'payment' as const,
            debit: 0,
            credit,
            balance: runningBalance,
          };
        } else {
          // Adjustment
          const isDiscount = entry.adjustmentType === 'discount';
          const amount = entry.data.amount || 0;
          if (isDiscount) {
            runningBalance -= amount;
          } else {
            runningBalance += amount;
          }
          return {
            id: entry.data.id,
            date: entry.data.date,
            particulars: `${isDiscount ? 'Discount' : 'Additional Charges'}${entry.data.notes ? ' - ' + entry.data.notes : ''}`,
            type: 'adjustment' as const,
            adjustmentType: entry.adjustmentType,
            debit: isDiscount ? 0 : amount,
            credit: isDiscount ? amount : 0,
            balance: runningBalance,
            notes: entry.data.notes,
          };
        }
      });

      return { entries, openingBalance };
    },
    enabled: open && !!company?.id && !!selectedCustomer,
  });

  const entries: StatementEntry[] = Array.isArray(data?.entries) ? data.entries : [];
  const openingBalance = data?.openingBalance || 0;

  // Calculate totals
  const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  const handleExport = () => {
    if (!entries) return;
    
    const csvContent = [
      ['Date', 'Particulars', 'Debit', 'Credit', 'Balance'].join(','),
      [`Opening Balance`, '', '', '', openingBalance].join(','),
      ...entries.map((e) => 
        [e.date, e.particulars, e.debit || '', e.credit || '', e.balance].join(',')
      ),
      ['Closing Balance', '', totalDebit, totalCredit, closingBalance].join(','),
    ].filter(Boolean).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `party-statement-${selectedCustomerData?.name || 'customer'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleAddAdjustment = () => {
    addAdjustmentMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Party Statement
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Select Customer *</label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {!selectedCustomer ? (
          <div className="text-center py-12 text-muted-foreground">
            Please select a customer to view their statement
          </div>
        ) : isLoading || adjustmentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Customer Info & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="md:col-span-2">
                <CardContent className="pt-4">
                  <div className="text-lg font-semibold">{selectedCustomerData?.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedCustomerData?.phone}</div>
                  <div className="text-sm text-muted-foreground">{selectedCustomerData?.address}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Debit</div>
                  <div className="text-xl font-bold text-destructive">{formatCurrency(totalDebit)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Credit</div>
                  <div className="text-xl font-bold text-success">{formatCurrency(totalCredit)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Closing Balance</div>
                  <div className={cn("text-xl font-bold", closingBalance > 0 ? "text-destructive" : "text-success")}>
                    {formatCurrency(closingBalance)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Statement Table */}
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right w-[120px]">Debit (₹)</TableHead>
                    <TableHead className="text-right w-[120px]">Credit (₹)</TableHead>
                    <TableHead className="text-right w-[120px]">Balance (₹)</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Opening Balance Row */}
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell>{format(dateFrom, 'dd MMM yyyy')}</TableCell>
                    <TableCell>Opening Balance</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(openingBalance)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {/* Transaction Rows */}
                  {entries.map((entry) => (
                    <TableRow 
                      key={entry.id} 
                      className={cn(
                        entry.type === 'adjustment' && entry.adjustmentType === 'discount' && 'bg-green-50/50',
                        entry.type === 'adjustment' && entry.adjustmentType === 'additional' && 'bg-red-50/50'
                      )}
                    >
                      <TableCell>{format(new Date(entry.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-medium">{entry.particulars}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-success">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">{formatCurrency(entry.balance)}</TableCell>
                      <TableCell>
                        {entry.type === 'adjustment' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteAdjustmentMutation.mutate(entry.id)}
                            disabled={deleteAdjustmentMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Closing Balance Row */}
                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell>{format(dateTo, 'dd MMM yyyy')}</TableCell>
                    <TableCell>Closing Balance</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totalDebit)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(totalCredit)}</TableCell>
                    <TableCell className={cn("text-right font-mono text-lg", closingBalance > 0 ? "text-destructive" : "text-success")}>
                      {formatCurrency(closingBalance)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {(!entries || entries.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No transactions found for selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Add Adjustment Section */}
            <Separator />
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Add Adjustment
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-sm">Type</Label>
                  <Select value={newAdjustmentType} onValueChange={(v) => setNewAdjustmentType(v as 'discount' | 'additional')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">
                        <span className="flex items-center gap-2">
                          <Minus className="w-4 h-4 text-success" />
                          Discount
                        </span>
                      </SelectItem>
                      <SelectItem value="additional">
                        <span className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-destructive" />
                          Additional Amount
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(newAdjustmentDate, 'dd MMM yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={newAdjustmentDate} onSelect={(d) => d && setNewAdjustmentDate(d)} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Amount (₹)</Label>
                  <Input
                    type="number"
                    value={newAdjustmentAmount}
                    onChange={(e) => setNewAdjustmentAmount(e.target.value)}
                    placeholder="0"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Notes (optional)</Label>
                  <Input
                    value={newAdjustmentNotes}
                    onChange={(e) => setNewAdjustmentNotes(e.target.value)}
                    placeholder="Description..."
                  />
                </div>

                <Button 
                  onClick={handleAddAdjustment}
                  disabled={addAdjustmentMutation.isPending || !newAdjustmentAmount}
                  className={cn(
                    newAdjustmentType === 'discount' 
                      ? 'bg-success hover:bg-success/90' 
                      : 'bg-destructive hover:bg-destructive/90'
                  )}
                >
                  {addAdjustmentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <PlusCircle className="w-4 h-4 mr-2" />
                  )}
                  Add {newAdjustmentType === 'discount' ? 'Discount' : 'Charges'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
