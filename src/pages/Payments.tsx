import React, { useState } from 'react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, CreditCard, Banknote, Wallet, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePayments } from '@/hooks/usePayments';
import { useCustomers } from '@/hooks/useCustomers';
import { useInvoices } from '@/hooks/useInvoices';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchableSelect } from '@/components/ui/searchable-select';

export default function Payments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    amount: '',
    discount: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'cash',
    customer_id: '',
    invoice_id: '',
    notes: '',
  });

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const { payments, isLoading, createPayment, createMultiplePayments, updatePayment, deletePayment } = usePayments();
  const { customers } = useCustomers();
  const { invoices } = useInvoices();

  const customerOptions = [
    { value: "none", label: "No customer (Walk-in)" },
    ...(customers?.map(c => ({ value: c.id, label: c.name })) || [])
  ];

  // Filter unpaid/partial invoices for the selected customer
  const filteredInvoices = invoices?.filter(
    (inv) =>
      (!formData.customer_id || inv.customer_id === formData.customer_id) &&
      (inv.status !== 'paid' || inv.id === formData.invoice_id || selectedInvoiceIds.includes(inv.id))
  ) || [];

  const totalAllocatedAmount: number = (Object.values(allocations) as number[]).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0);

  const autoAllocate = (totalAmount: number, discount: number, selectedIds: string[]) => {
    const newAllocations: Record<string, number> = {};
    let remaining = totalAmount + discount;

    selectedIds.forEach((id) => {
      const inv = filteredInvoices.find((i) => i.id === id);
      if (inv) {
        const balance = (inv.total || 0) - (inv.received_amount || 0);
        const toApply = Math.max(0, Math.min(balance, remaining));
        newAllocations[id] = parseFloat(toApply.toFixed(2));
        remaining -= toApply;
      }
    });

    setAllocations(newAllocations);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPayment) {
      const paymentData = {
        amount: parseFloat(formData.amount) || 0,
        discount: parseFloat(formData.discount) || 0,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        customer_id: formData.customer_id || null,
        invoice_id: formData.invoice_id || null,
        notes: formData.notes || null,
      };
      await updatePayment.mutateAsync({ id: editingPayment, ...paymentData });
    } else if (selectedInvoiceIds.length > 0) {
      // Multiple Invoices
      const paymentsToCreate = selectedInvoiceIds.filter(id => (allocations[id] || 0) > 0).map((invId) => ({
        amount: Number(allocations[invId]) || 0,
        discount: 0,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        customer_id: formData.customer_id || null,
        invoice_id: invId,
        notes: formData.notes || null,
      }));

      // If there's extra amount not allocated, add it as a separate payment (advance)
      const totalAllocated: number = (Object.values(allocations) as number[]).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0);
      const remainingAmount: number = (Number(parseFloat(formData.amount)) || 0) - totalAllocated;

      if (remainingAmount > 0) {
        paymentsToCreate.push({
          amount: parseFloat(remainingAmount.toFixed(2)),
          discount: parseFloat(formData.discount) || 0,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          customer_id: formData.customer_id || null,
          invoice_id: null,
          notes: (formData.notes ? formData.notes + ' ' : '') + '(Advance payment)',
        });
      }

      if (paymentsToCreate.length > 0) {
        await createMultiplePayments.mutateAsync(paymentsToCreate);
      }
    } else {
      // Single Payment / No Invoice
      const paymentData = {
        amount: parseFloat(formData.amount) || 0,
        discount: parseFloat(formData.discount) || 0,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        customer_id: formData.customer_id || null,
        invoice_id: formData.invoice_id || null,
        notes: formData.notes || null,
      };
      await createPayment.mutateAsync(paymentData);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      discount: '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'cash',
      customer_id: '',
      invoice_id: '',
      notes: '',
    });
    setSelectedInvoiceIds([]);
    setAllocations({});
    setEditingPayment(null);
    setDialogOpen(false);
  };

  const handleEdit = (payment: any) => {
    setFormData({
      amount: payment.amount?.toString() || '',
      discount: payment.discount?.toString() || '',
      payment_date: payment.payment_date,
      payment_method: payment.payment_method || 'cash',
      customer_id: payment.customer_id || '',
      invoice_id: payment.invoice_id || '',
      notes: payment.notes || '',
    });
    if (payment.invoice_id) {
      setSelectedInvoiceIds([payment.invoice_id]);
      setAllocations({ [payment.invoice_id]: payment.amount });
    } else {
      setSelectedInvoiceIds([]);
      setAllocations({});
    }
    setEditingPayment(payment.id);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (paymentToDelete) {
      await deletePayment.mutateAsync(paymentToDelete);
      setPaymentToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const filteredPayments = payments.filter(
    (payment) =>
      payment.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      payment.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      payment.payment_method?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayments = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const getPaymentIcon = (method: string | null) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'upi':
        return <Wallet className="w-4 h-4" />;
      default:
        return <Banknote className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout title="Payments" subtitle="Track all payment transactions">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            setDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPayment ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer (Optional)</Label>
                  <SearchableSelect
                    value={formData.customer_id || "none"}
                    onValueChange={(value) => {
                      setFormData({ ...formData, customer_id: value === "none" ? "" : value, invoice_id: '' });
                      setSelectedInvoiceIds([]);
                      setAllocations({});
                    }}
                    options={customerOptions}
                    placeholder="Select customer"
                    searchPlaceholder="Search customers..."
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Link Invoices</Label>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold",
                        Math.abs(totalAllocatedAmount - (parseFloat(formData.amount) || 0)) < 0.01
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      )}>
                        Allocated: ₹{totalAllocatedAmount.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Selected: {selectedInvoiceIds.length}
                      </span>
                    </div>
                  </div>
                  <ScrollArea className="h-[220px] border rounded-md p-2 bg-slate-50/50">
                    <div className="space-y-3">
                      {!formData.customer_id ? (
                        <p className="text-sm text-center py-8 text-muted-foreground italic">Select a customer first to view invoices</p>
                      ) : filteredInvoices.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No pending invoices found</p>
                      ) : (
                        filteredInvoices.map((invoice) => {
                          const balance = (invoice.total || 0) - (invoice.received_amount || 0);
                          const isSelected = selectedInvoiceIds.includes(invoice.id);

                          return (
                            <div key={invoice.id} className={cn(
                              "relative flex flex-col gap-2 p-3 rounded-lg border transition-all",
                              isSelected ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10" : "bg-white border-transparent hover:border-slate-200"
                            )}>
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  id={`inv-${invoice.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const newSelected = checked
                                      ? [...selectedInvoiceIds, invoice.id]
                                      : selectedInvoiceIds.filter(id => id !== invoice.id);

                                    setSelectedInvoiceIds(newSelected);
                                    autoAllocate(parseFloat(formData.amount) || 0, parseFloat(formData.discount) || 0, newSelected);
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-1 gap-2">
                                    <div className="min-w-0">
                                      <Label
                                        htmlFor={`inv-${invoice.id}`}
                                        className="font-bold text-sm cursor-pointer truncate block"
                                      >
                                        {invoice.invoice_number}
                                      </Label>
                                      <span className="text-[11px] text-muted-foreground">
                                        {format(new Date(invoice.date), 'dd MMM yyyy')}
                                      </span>
                                    </div>
                                    <Badge
                                      variant={invoice.status === 'partial' ? 'outline' : 'secondary'}
                                      className="text-[10px] h-4 shrink-0"
                                      {...({ children: invoice.status } as any)}
                                    >
                                      {invoice.status}
                                    </Badge>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                                    <div className="flex flex-col">
                                      <span>Total</span>
                                      <span className="font-semibold text-slate-700">₹{invoice.total?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span>Paid</span>
                                      <span className="font-semibold text-green-600">₹{invoice.received_amount?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span>Balance</span>
                                      <span className="font-semibold text-red-600">₹{balance.toLocaleString()}</span>
                                    </div>
                                  </div>

                                  {isSelected && (
                                    <div className="mt-2 bg-white/80 p-2 rounded border border-primary/10 shadow-sm animate-in fade-in slide-in-from-top-1">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <Label className="text-[11px] font-bold text-primary">NOW ADDING</Label>
                                        <span className="text-[10px] font-medium text-slate-500 italic">Remaining: ₹{(balance - (allocations[invoice.id] || 0)).toFixed(2)}</span>
                                      </div>
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          className="h-8 pl-5 text-sm font-bold bg-white"
                                          value={allocations[invoice.id] || ''}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            setAllocations({ ...allocations, [invoice.id]: Math.min(val, balance) });
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount Paid *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, amount: val });
                        autoAllocate(parseFloat(val) || 0, parseFloat(formData.discount) || 0, selectedInvoiceIds);
                      }}
                      placeholder="0.00"
                      required
                      className="font-bold text-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      value={formData.discount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, discount: val });
                        autoAllocate(parseFloat(formData.amount) || 0, parseFloat(val) || 0, selectedInvoiceIds);
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_date">Date *</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPayment.isPending || updatePayment.isPending || createMultiplePayments.isPending}>
                    {(createPayment.isPending || updatePayment.isPending || createMultiplePayments.isPending) ? 'Saving...' : (editingPayment ? 'Update Payment' : 'Save Payment')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">₹{totalPayments.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{filteredPayments.length} transactions</p>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Payments Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>{payment.customer_name || '-'}</TableCell>
                      <TableCell>
                        {payment.invoice_number ? (
                          <Badge variant="outline" {...{ children: payment.invoice_number } as any}>{payment.invoice_number}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(payment.payment_method)}
                          <span className="capitalize">{payment.payment_method?.replace('_', ' ') || 'Cash'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {(payment.discount || 0) > 0 ? `₹${payment.discount.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {payment.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(payment)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPaymentToDelete(payment.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this payment? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
