import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Save, Printer, Download, Check, Loader2, Package, Leaf, Keyboard, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomers } from '@/hooks/useCustomers';
import { useInvoices, InvoiceItem, LooseInvoiceItem as DBLooseInvoiceItem } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useKeyboardShortcuts, useEnterAsTab, INVOICE_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

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

export default function NewInvoice() {
  const navigate = useNavigate();
  const { company, refreshProfile } = useAuth();
  const { customers } = useCustomers();
  const { getNextInvoiceNumber, createInvoice } = useInvoices();
  const formRef = useRef<HTMLDivElement>(null);
  const invoiceTableRef = useRef<{ addItem: () => void } | null>(null);
  const looseTableRef = useRef<{ addItem: () => void } | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saving, setSaving] = useState(false);
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

  // Fetch customer's previous balance
  const { data: customerBalance = 0 } = useQuery({
    queryKey: ['customer-balance', customerId],
    queryFn: async () => {
      if (!customerId) return 0;

      // Get all invoices for this customer
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, received_amount')
        .eq('customer_id', customerId);

      // Get all payments for this customer
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('customer_id', customerId);

      // Get all adjustments for this customer
      const { data: adjustments } = await supabase
        .from('party_adjustments')
        .select('amount, type')
        .eq('customer_id', customerId);

      // Calculate balance: invoices (debit) - received - payments (credit) +/- adjustments
      const invoiceTotal = (invoices || []).reduce((sum, inv) => 
        sum + (Number(inv.total) || 0) - (Number(inv.received_amount) || 0), 0);
      
      const paymentTotal = (payments || []).reduce((sum, pay) => 
        sum + (Number(pay.amount) || 0), 0);
      
      const adjustmentTotal = (adjustments || []).reduce((sum, adj) => {
        const amount = Number(adj.amount) || 0;
        return adj.type === 'debit' ? sum + amount : sum - amount;
      }, 0);

      return invoiceTotal - paymentTotal + adjustmentTotal;
    },
    enabled: !!customerId,
  });

  // Enable Enter as Tab navigation
  useEnterAsTab(formRef);

  useEffect(() => {
    const loadInvoiceNumber = async () => {
      const num = await getNextInvoiceNumber();
      setInvoiceNumber(num);
    };
    loadInvoiceNumber();
  }, [company]);

  // Add item functions for keyboard shortcuts
  const handleAddRegularItem = useCallback(() => {
    const newItem: LocalInvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      vendorId: '',
      productId: '',
      quantity: 1,
      grossWeight: 0,
      boxWeight: 0,
      benchesWeight: 0,
      netWeight: 0,
      rate: 0,
      total: 0,
    };
    setItems(prev => [...prev, newItem]);
    toast.success('Regular item added (Ctrl+I)');
  }, []);

  const handleAddLooseItem = useCallback(() => {
    const newItem: LooseInvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      vendorId: '',
      looseProductId: '',
      productName: '',
      netWeight: 0,
      weightUnit: 'kg',
      rate: 0,
      total: 0,
    };
    setLooseItems(prev => [...prev, newItem]);
    toast.success('Loose item added (Ctrl+L)');
  }, []);

  const handlePrint = useCallback(() => {
    toast.info('Print functionality coming soon!');
  }, []);

  const handleDownload = useCallback(() => {
    toast.info('Download PDF functionality coming soon!');
  }, []);


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

  const handleSave = async () => {
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
      let invoiceStatus = 'pending';
      if (receivedAmount >= total) {
        invoiceStatus = 'paid';
      } else if (receivedAmount > 0) {
        invoiceStatus = 'partial';
      }

      await createInvoice.mutateAsync({
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

      // Refresh profile to get updated invoice number
      await refreshProfile();
      navigate('/invoices');
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts - must be after handleSave is defined
  useKeyboardShortcuts([
    { key: 's', altKey: true, action: handleSave, description: 'Save Invoice' },
    { key: 'n', altKey: true, action: () => navigate('/invoices/new'), description: 'New Invoice' },
    { key: 'p', altKey: true, action: handlePrint, description: 'Print Invoice' },
    { key: 'd', altKey: true, action: handleDownload, description: 'Download PDF' },
    { key: 'i', altKey: true, action: handleAddRegularItem, description: 'Add Regular Item' },
    { key: 'l', altKey: true, action: handleAddLooseItem, description: 'Add Loose Item' },
  ]);

  return (
    <DashboardLayout title="Create Invoice" subtitle="Add items with weight-based billing">
      <div ref={formRef} className="space-y-6 animate-fade-in">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer / Party *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customerId && customerBalance !== 0 && (
                  <div className={`flex items-center gap-1.5 text-xs ${customerBalance > 0 ? 'text-destructive' : 'text-success'}`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>
                      Previous Balance: {formatCurrency(Math.abs(customerBalance))} 
                      {customerBalance > 0 ? ' (Due)' : ' (Advance)'}
                    </span>
                  </div>
                )}
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
        <div className="flex items-center justify-between pb-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Keyboard className="w-4 h-4" />
                  Shortcuts
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  {INVOICE_SHORTCUTS.map((shortcut, i) => (
                    <div key={i} className="flex justify-between gap-4">
                      <span className="font-mono text-primary">{shortcut.keys}</span>
                      <span>{shortcut.description}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
              <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                Alt+P
              </kbd>
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleDownload}>
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
              <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                Alt+D
              </kbd>
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
                  Save
                  <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-primary-foreground/70">
                    Alt+S
                  </kbd>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
