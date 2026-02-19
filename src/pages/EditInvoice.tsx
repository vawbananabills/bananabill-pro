import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InvoiceTable } from '@/components/invoice/InvoiceTable';
import { LooseInvoiceTable, LooseInvoiceItem } from '@/components/invoice/LooseInvoiceTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Separator } from '@/components/ui/separator';
import { Save, Printer, Download, Check, Loader2, ArrowLeft, Package, Leaf, Keyboard } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomers } from '@/hooks/useCustomers';
import { useInvoices, InvoiceItem, LooseInvoiceItem as DBLooseInvoiceItem } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import { useKeyboardShortcuts, INVOICE_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LocalInvoiceItem {
  id: string;
  vendorId: string;
  productId: string;
  quantity: number;
  grossWeight: number;
  boxWeight: number;
  benchesWeight: number;
  netWeight: number;
  rate: number;
  total: number;
}

export default function EditInvoice() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { company } = useAuth();
  const { customers } = useCustomers();
  const { updateInvoice, getInvoiceWithItems } = useInvoices();

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [status, setStatus] = useState('pending');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LocalInvoiceItem[]>([
    {
      id: '1',
      vendorId: '',
      productId: '',
      quantity: 1,
      grossWeight: 0,
      boxWeight: 0,
      benchesWeight: 0,
      netWeight: 0,
      rate: 0,
      total: 0,
    }
  ]);
  const [looseItems, setLooseItems] = useState<LooseInvoiceItem[]>([]);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!id) return;

      const invoiceData = await getInvoiceWithItems(id);
      if (!invoiceData) {
        toast.error('Invoice not found');
        navigate('/invoices');
        return;
      }

      setInvoiceNumber(invoiceData.invoice_number);
      setCustomerId(invoiceData.customer_id || '');
      setDate(invoiceData.date);
      setPaymentType(invoiceData.payment_type);
      setStatus(invoiceData.status);
      setDiscount(Number(invoiceData.discount) || 0);
      setOtherCharges(Number(invoiceData.other_charges) || 0);
      setReceivedAmount(Number(invoiceData.received_amount) || 0);
      setNotes(invoiceData.notes || '');

      if (invoiceData.invoice_items.length > 0) {
        setItems(invoiceData.invoice_items.map((item, index) => ({
          id: String(index + 1),
          vendorId: item.vendor_id || '',
          productId: item.product_id || '',
          quantity: Number(item.quantity) || 1,
          grossWeight: Number(item.gross_weight) || 0,
          boxWeight: Number(item.box_weight) || 0,
          benchesWeight: Number(item.benches_weight) || 0,
          netWeight: Number(item.net_weight) || 0,
          rate: Number(item.rate) || 0,
          total: Number(item.total) || 0,
        })));
      }

      // Load loose items
      if (invoiceData.loose_invoice_items && invoiceData.loose_invoice_items.length > 0) {
        setLooseItems(invoiceData.loose_invoice_items.map((item, index) => ({
          id: String(index + 1),
          vendorId: item.vendor_id || '',
          looseProductId: item.loose_product_id || '',
          productName: item.product_name,
          netWeight: Number(item.net_weight) || 0,
          weightUnit: item.weight_unit as 'kg' | 'g',
          rate: Number(item.rate) || 0,
          total: Number(item.total) || 0,
        })));
      }

      setLoading(false);
    };

    loadInvoice();
  }, [id]);

  const regularSubtotal = items.reduce((sum, item) => sum + item.total, 0);
  const looseSubtotal = looseItems.reduce((sum, item) => sum + item.total, 0);
  const subtotal = regularSubtotal + looseSubtotal;
  const total = subtotal - discount + otherCharges;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handlePrint = () => {
    toast.info('Print functionality coming soon!');
  };

  const handleDownload = () => {
    toast.info('Download PDF functionality coming soon!');
  };

  const handleSave = async () => {
    if (!id) return;

    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }

    const validItems = items.filter(i => i.total > 0 && i.vendorId && i.productId);
    const validLooseItems = looseItems.filter(i => i.total > 0 && i.productName);

    if (validItems.length === 0 && validLooseItems.length === 0) {
      toast.error('Please add at least one valid item');
      return;
    }

    setSaving(true);

    try {
      const invoiceItems: InvoiceItem[] = validItems.map(item => ({
        vendor_id: item.vendorId,
        product_id: item.productId,
        quantity: item.quantity,
        gross_weight: item.grossWeight,
        box_weight: item.boxWeight,
        benches_weight: item.benchesWeight,
        net_weight: item.netWeight,
        rate: item.rate,
        total: item.total,
      }));

      const dbLooseItems: DBLooseInvoiceItem[] = validLooseItems.map(item => ({
        vendor_id: item.vendorId || null,
        loose_product_id: item.looseProductId || null,
        product_name: item.productName,
        net_weight: item.netWeight,
        weight_unit: item.weightUnit,
        rate: item.rate,
        total: item.total,
      }));

      // Determine status based on received amount
      let invoiceStatus = status;
      if (receivedAmount >= total) {
        invoiceStatus = 'paid';
      } else if (receivedAmount > 0) {
        invoiceStatus = 'partial';
      } else {
        invoiceStatus = 'pending';
      }

      await updateInvoice.mutateAsync({
        id,
        invoice: {
          invoice_number: invoiceNumber,
          customer_id: customerId,
          date,
          subtotal,
          discount,
          other_charges: otherCharges,
          total,
          received_amount: receivedAmount,
          payment_type: paymentType,
          status: invoiceStatus,
          notes: notes || null,
        },
        items: invoiceItems,
        looseItems: dbLooseItems,
      });

      navigate('/invoices');
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 's', altKey: true, action: handleSave, description: 'Save Invoice (Alt+S)' },
    { key: 'p', altKey: true, shiftKey: true, action: handlePrint, description: 'Print Invoice (Alt+Shift+P)' },
    { key: 'd', altKey: true, action: handleDownload, description: 'Download PDF (Alt+D)' },
  ]);

  if (loading) {
    return (
      <DashboardLayout title="Edit Invoice" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Invoice" subtitle="Modify invoice details and items">
      <div className="space-y-6 animate-fade-in">
        {/* Back Button */}
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Button>

        {/* Invoice Header */}
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Invoice Details</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Invoice #</span>
                <span className="font-mono font-semibold text-primary">{invoiceNumber}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer / Party *</Label>
                <SearchableSelect
                  value={customerId}
                  onValueChange={setCustomerId}
                  options={customers.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select customer"
                  searchPlaceholder="Search customers..."
                  emptyMessage="No customers found."
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment">Payment Type</Label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/customers')}
                >
                  + New Customer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regular Invoice Items Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Regular Items</h2>
            </div>
            <div className="text-sm text-muted-foreground">
              Formula: <span className="font-mono bg-muted px-2 py-1 rounded">Net = Gross - Box - Benches</span>
            </div>
          </div>
          <InvoiceTable items={items} onItemsChange={setItems} />
        </div>

        {/* Loose Invoice Items Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold">Loose Items</h2>
            </div>
            <div className="text-sm text-muted-foreground">
              Simple: <span className="font-mono bg-muted px-2 py-1 rounded">Net Weight × Rate</span>
            </div>
          </div>
          <LooseInvoiceTable items={looseItems} onItemsChange={setLooseItems} />
        </div>

        {/* Totals & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full h-24 p-3 text-sm border border-input rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring/20"
                placeholder="Add any notes or terms..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="shadow-card lg:col-span-2">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount (₹)</Label>
                    <Input
                      id="discount"
                      type="number"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="charges">Other Charges (₹)</Label>
                    <Input
                      id="charges"
                      type="number"
                      value={otherCharges || ''}
                      onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)}
                      className="font-mono"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="received" className="text-primary font-medium">Received Amount (₹)</Label>
                    <Input
                      id="received"
                      type="number"
                      value={receivedAmount || ''}
                      onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                      className="font-mono border-primary/50"
                      placeholder="0"
                    />
                    {total > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Balance: {formatCurrency(Math.max(0, total - receivedAmount))}
                      </p>
                    )}
                  </div>
                </div>

                <Separator orientation="vertical" className="hidden md:block" />
                <Separator className="md:hidden" />

                <div className="min-w-[200px] space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Regular Items</span>
                    <span className="font-mono">{formatCurrency(regularSubtotal)}</span>
                  </div>
                  {looseSubtotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Loose Items</span>
                      <span className="font-mono">{formatCurrency(looseSubtotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Discount</span>
                      <span className="font-mono">-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  {otherCharges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Other Charges</span>
                      <span className="font-mono">+{formatCurrency(otherCharges)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary font-mono">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Button variant="outline" onClick={() => navigate('/invoices')}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2 min-w-[140px]" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Update Invoice
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
