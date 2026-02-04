import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { usePayments } from '@/hooks/usePayments';
import { useCustomers } from '@/hooks/useCustomers';
import { useInvoices } from '@/hooks/useInvoices';
import { OPEN_PAYMENT_DIALOG_EVENT } from '@/components/GlobalKeyboardShortcuts';

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

  const { createPayment } = usePayments();
  const { customers } = useCustomers();
  const { invoices } = useInvoices();

  // Listen for keyboard shortcut event to open dialog
  useEffect(() => {
    const handleOpenDialog = () => setDialogOpen(true);
    window.addEventListener(OPEN_PAYMENT_DIALOG_EVENT, handleOpenDialog);
    return () => window.removeEventListener(OPEN_PAYMENT_DIALOG_EVENT, handleOpenDialog);
  }, []);

  // Filter unpaid/partial invoices for the selected customer
  const filteredInvoices = invoices?.filter(
    (inv) => 
      (!formData.customer_id || inv.customer_id === formData.customer_id) &&
      inv.status !== 'paid'
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const discountAmount = parseFloat(formData.discount) || 0;
    const paymentAmount = parseFloat(formData.amount) || 0;
    
    const paymentData = {
      amount: paymentAmount + discountAmount, // Total amount including discount applied
      payment_date: formData.payment_date,
      payment_method: formData.payment_method,
      customer_id: formData.customer_id || null,
      invoice_id: formData.invoice_id || null,
      notes: discountAmount > 0 
        ? `${formData.notes ? formData.notes + ' | ' : ''}Discount: ₹${discountAmount.toLocaleString()}, Paid: ₹${paymentAmount.toLocaleString()}`
        : formData.notes || null,
    };

    await createPayment.mutateAsync(paymentData);
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
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      if (!open) resetForm();
      setDialogOpen(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="global-customer">Customer (Optional)</Label>
            <Select
              value={formData.customer_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, customer_id: value === "none" ? "" : value, invoice_id: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No customer</SelectItem>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="global-invoice">Invoice (Optional)</Label>
            <Select
              value={formData.invoice_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, invoice_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select invoice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No invoice</SelectItem>
                {filteredInvoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - ₹{invoice.total?.toLocaleString()} ({invoice.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.invoice_id && formData.invoice_id !== "none" && (() => {
              const selectedInvoice = filteredInvoices.find(inv => inv.id === formData.invoice_id);
              if (selectedInvoice) {
                const paidAmount = selectedInvoice.received_amount || 0;
                const balance = (selectedInvoice.total || 0) - paidAmount;
                return (
                  <div className="text-sm p-3 bg-muted rounded-lg space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium">₹{selectedInvoice.total?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid:</span>
                      <span className="font-medium text-green-600">₹{paidAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground font-medium">Balance:</span>
                      <span className="font-bold text-primary">₹{balance.toLocaleString()}</span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="global-amount">Amount Paid *</Label>
              <Input
                id="global-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
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
