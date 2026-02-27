import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { usePayments } from '@/hooks/usePayments';
import { useCustomers } from '@/hooks/useCustomers';
import { useInvoices } from '@/hooks/useInvoices';
import { OPEN_PAYMENT_DIALOG_EVENT } from '@/components/GlobalKeyboardShortcuts';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export function GlobalPaymentDialog() {
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const { createPayment, createMultiplePayments } = usePayments();
  const { customers } = useCustomers();
  const { invoices } = useInvoices();

  const customerOptions = [
    { value: "none", label: "No customer (Walk-in)" },
    ...(customers?.map(c => ({ value: c.id, label: c.name })) || [])
  ];

  // Listen for keyboard shortcut event to open dialog
  useEffect(() => {
    const handleOpenDialog = () => setDialogOpen(true);
    window.addEventListener(OPEN_PAYMENT_DIALOG_EVENT, handleOpenDialog);
    return () => window.removeEventListener(OPEN_PAYMENT_DIALOG_EVENT, handleOpenDialog);
  }, []);

  // Filter unpaid/partial invoices for the selected customer
  const filteredInvoices =
    invoices?.filter(
      (inv) =>
        (!formData.customer_id || inv.customer_id === formData.customer_id) &&
        (inv.status !== 'paid' || selectedInvoiceIds.includes(inv.id))
    ) || [];

  const totalAllocatedAmount: number = (Object.values(allocations) as number[]).reduce(
    (sum: number, val: number) => sum + (Number(val) || 0),
    0
  );

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

    if (selectedInvoiceIds.length > 0) {
      const paymentsToCreate = selectedInvoiceIds
        .filter((id) => (allocations[id] || 0) > 0)
        .map((invId) => ({
          amount: Number(allocations[invId]) || 0,
          discount: 0,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          customer_id: formData.customer_id || null,
          invoice_id: invId,
          notes: formData.notes || null,
        }));

      const totalAllocated: number = (Object.values(allocations) as number[]).reduce(
        (sum: number, val: number) => sum + (Number(val) || 0),
        0
      );
      const remainingAmount: number =
        (Number(parseFloat(formData.amount)) || 0) - totalAllocated;

      if (remainingAmount > 0) {
        paymentsToCreate.push({
          amount: parseFloat(remainingAmount.toFixed(2)),
          discount: parseFloat(formData.discount) || 0,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          customer_id: formData.customer_id || null,
          invoice_id: null,
          notes:
            (formData.notes ? formData.notes + ' ' : '') + '(Advance payment)',
        });
      }

      if (paymentsToCreate.length > 0) {
        await createMultiplePayments.mutateAsync(paymentsToCreate as any);
      }
    } else {
      const paymentData = {
        amount: parseFloat(formData.amount) || 0,
        discount: parseFloat(formData.discount) || 0,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        customer_id: formData.customer_id || null,
        invoice_id: formData.invoice_id || null,
        notes: formData.notes || null,
      };
      await createPayment.mutateAsync(paymentData as any);
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
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      if (!open) resetForm();
      setDialogOpen(open);
    }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="global-customer">Customer (Optional)</Label>
            <SearchableSelect
              value={formData.customer_id || "none"}
              onValueChange={(value) => {
                setFormData({
                  ...formData,
                  customer_id: value === "none" ? "" : value,
                  invoice_id: '',
                });
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
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-bold',
                    Math.abs(
                      totalAllocatedAmount - (parseFloat(formData.amount) || 0)
                    ) < 0.01
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  )}
                >
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
                  <p className="text-sm text-center py-8 text-muted-foreground italic">
                    Select a customer first to view invoices
                  </p>
                ) : filteredInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No pending invoices found
                  </p>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const balance =
                      (invoice.total || 0) - (invoice.received_amount || 0);
                    const isSelected = selectedInvoiceIds.includes(invoice.id);

                    return (
                      <div
                        key={invoice.id}
                        className={cn(
                          'relative flex flex-col gap-2 p-3 rounded-lg border transition-all',
                          isSelected
                            ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10'
                            : 'bg-white border-transparent hover:border-slate-200'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`inv-global-${invoice.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const newSelected = checked
                                ? [...selectedInvoiceIds, invoice.id]
                                : selectedInvoiceIds.filter(
                                    (id) => id !== invoice.id
                                  );

                              setSelectedInvoiceIds(newSelected);
                              autoAllocate(
                                parseFloat(formData.amount) || 0,
                                parseFloat(formData.discount) || 0,
                                newSelected
                              );
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <div className="min-w-0">
                                <Label
                                  htmlFor={`inv-global-${invoice.id}`}
                                  className="font-bold text-sm cursor-pointer truncate block"
                                >
                                  {invoice.invoice_number}
                                </Label>
                                <span className="text-[11px] text-muted-foreground">
                                  {format(new Date(invoice.date), 'dd MMM yyyy')}
                                </span>
                              </div>
                              <Badge
                                variant={
                                  invoice.status === 'partial'
                                    ? 'outline'
                                    : 'secondary'
                                }
                                className="text-[10px] h-4 shrink-0"
                                {...({ children: invoice.status } as any)}
                              >
                                {invoice.status}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                              <div className="flex flex-col">
                                <span>Total</span>
                                <span className="font-semibold text-slate-700">
                                  ₹{invoice.total?.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span>Paid</span>
                                <span className="font-semibold text-green-600">
                                  ₹{invoice.received_amount?.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span>Balance</span>
                                <span className="font-semibold text-red-600">
                                  ₹{balance.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-2 bg-white/80 p-2 rounded border border-primary/10 shadow-sm animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center justify-between mb-1.5">
                                  <Label className="text-[11px] font-bold text-primary">
                                    NOW ADDING
                                  </Label>
                                  <span className="text-[10px] font-medium text-slate-500 italic">
                                    Remaining: ₹
                                    {(
                                      balance -
                                      (allocations[invoice.id] || 0)
                                    ).toFixed(2)}
                                  </span>
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    ₹
                                  </span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 pl-5 text-sm font-bold bg-white"
                                    value={allocations[invoice.id] || ''}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setAllocations({
                                        ...allocations,
                                        [invoice.id]: Math.min(val, balance),
                                      });
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
              <Label htmlFor="global-amount">Amount Paid *</Label>
              <Input
                id="global-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, amount: val });
                  autoAllocate(
                    parseFloat(val) || 0,
                    parseFloat(formData.discount) || 0,
                    selectedInvoiceIds
                  );
                }}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="global-discount">Discount</Label>
              <Input
                id="global-discount"
                type="number"
                step="0.01"
                value={formData.discount}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, discount: val });
                  autoAllocate(
                    parseFloat(formData.amount) || 0,
                    parseFloat(val) || 0,
                    selectedInvoiceIds
                  );
                }}
                placeholder="0.00"
              />
            </div>
          </div>

          {(parseFloat(formData.amount) > 0 || parseFloat(formData.discount) > 0) && (
            <div className="text-sm p-3 bg-primary/10 rounded-lg space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium">₹{(parseFloat(formData.amount) || 0).toLocaleString()}</span>
              </div>
              {parseFloat(formData.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="font-medium text-green-600">₹{(parseFloat(formData.discount) || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground font-medium">Total Applied:</span>
                <span className="font-bold text-primary">₹{((parseFloat(formData.amount) || 0) + (parseFloat(formData.discount) || 0)).toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="global-payment_date">Date *</Label>
            <Input
              id="global-payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="global-payment_method">Payment Method</Label>
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
            <Label htmlFor="global-notes">Notes</Label>
            <Textarea
              id="global-notes"
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
            <Button type="submit" disabled={createPayment.isPending}>
              {createPayment.isPending ? 'Saving...' : 'Save Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
