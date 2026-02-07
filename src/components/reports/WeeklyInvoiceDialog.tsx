import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers } from '@/hooks/useCustomers';
import { usePayments } from '@/hooks/usePayments';
import { useWeeklyInvoices } from '@/hooks/useWeeklyInvoices';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, Loader2, Printer, Download, Calendar as CalendarIcon2, Save, Plus, CreditCard, FolderOpen, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { SavedWeeklyInvoicesDialog } from './SavedWeeklyInvoicesDialog';

interface WeeklyInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SavedWeeklyInvoice {
  customerId: string;
  dateFrom: string;
  dateTo: string;
  discount: number;
  otherCharges: number;
  notes: string;
  savedAt: string;
}

export function WeeklyInvoiceDialog({ open, onOpenChange }: WeeklyInvoiceDialogProps) {
  const { company, user } = useAuth();
  const { customers } = useCustomers();
  const { createPayment } = usePayments();
  const { createWeeklyInvoice, updateWeeklyInvoice } = useWeeklyInvoices();
  const queryClient = useQueryClient();
  const [showSavedInvoices, setShowSavedInvoices] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(true);
  const [showPaymentSummary, setShowPaymentSummary] = useState(true);
  
  const [dateRange, setDateRange] = useState<'thisWeek' | 'lastWeek' | 'thisMonth' | 'custom'>('thisWeek');
  const [dateFrom, setDateFrom] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dateTo, setDateTo] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  const handleRangeChange = (range: 'thisWeek' | 'lastWeek' | 'thisMonth' | 'custom') => {
    setDateRange(range);
    const now = new Date();
    switch (range) {
      case 'thisWeek':
        setDateFrom(startOfWeek(now, { weekStartsOn: 1 }));
        setDateTo(endOfWeek(now, { weekStartsOn: 1 }));
        break;
      case 'lastWeek':
        setDateFrom(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }));
        setDateTo(endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }));
        break;
      case 'thisMonth':
        setDateFrom(startOfMonth(now));
        setDateTo(endOfMonth(now));
        break;
    }
  };

  // Load saved data when customer or date changes
  useEffect(() => {
    if (selectedCustomer && company?.id) {
      const savedKey = `weekly-invoice-${company.id}-${selectedCustomer}-${format(dateFrom, 'yyyy-MM-dd')}-${format(dateTo, 'yyyy-MM-dd')}`;
      const savedData = localStorage.getItem(savedKey);
      if (savedData) {
        try {
          const parsed: SavedWeeklyInvoice = JSON.parse(savedData);
          setDiscount(parsed.discount || 0);
          setOtherCharges(parsed.otherCharges || 0);
          setNotes(parsed.notes || '');
        } catch {
          setDiscount(0);
          setOtherCharges(0);
          setNotes('');
        }
      } else {
        setDiscount(0);
        setOtherCharges(0);
        setNotes('');
      }
    }
    // Reset payment form
    setShowPaymentForm(false);
    setPaymentAmount(0);
    setPaymentNotes('');
  }, [selectedCustomer, dateFrom, dateTo, company?.id]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['weekly-invoice', company?.id, selectedCustomer, dateFrom, dateTo],
    queryFn: async () => {
      if (!company?.id || !selectedCustomer) return null;

      // Get invoices with items
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items(
            *,
            products(name),
            vendors(name)
          ),
          loose_invoice_items(
            *,
            vendors(name)
          )
        `)
        .eq('company_id', company.id)
        .eq('customer_id', selectedCustomer)
        .gte('date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('date', format(dateTo, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;

      // Get payments for this customer in the date range
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', company.id)
        .eq('customer_id', selectedCustomer)
        .gte('payment_date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('payment_date', format(dateTo, 'yyyy-MM-dd'))
        .order('payment_date', { ascending: true });

      if (paymentsError) throw paymentsError;

      // Get customer's opening balance field (the initial balance set by user)
      const { data: customerData } = await supabase
        .from('customers')
        .select('opening_balance')
        .eq('id', selectedCustomer)
        .maybeSingle();

      const customerOpeningBalance = Number(customerData?.opening_balance || 0);

      // Get invoices BEFORE the selected date range for calculating previous balance
      const { data: priorInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('company_id', company.id)
        .eq('customer_id', selectedCustomer)
        .lt('date', format(dateFrom, 'yyyy-MM-dd'));

      // Get payments BEFORE the selected date range
      const { data: priorPayments } = await supabase
        .from('payments')
        .select('amount, discount')
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
      const priorPaymentTotal = priorPayments?.reduce((sum, p) => sum + Number(p.amount || 0) + Number(p.discount || 0), 0) || 0;
      const priorDiscountTotal = (priorAdjustments || [])
        .filter(a => a.type === 'discount')
        .reduce((sum, a) => sum + Number(a.amount || 0), 0);
      const priorAdditionalTotal = (priorAdjustments || [])
        .filter(a => a.type === 'additional')
        .reduce((sum, a) => sum + Number(a.amount || 0), 0);

      // Previous/Opening balance = customer's opening balance + prior invoices + prior additional - prior payments - prior discounts
      const previousBalance = customerOpeningBalance + priorInvoiceTotal + priorAdditionalTotal - priorPaymentTotal - priorDiscountTotal;

      // Flatten items for the invoice
      const allItems: any[] = [];
      const allLooseItems: any[] = [];
      let grandTotal = 0;
      let totalNetWeight = 0;
      let totalLooseWeight = 0;
      let totalInvoiceDiscount = 0;
      let totalInvoiceOtherCharges = 0;

      invoices?.forEach((inv: any) => {
        inv.invoice_items?.forEach((item: any) => {
          allItems.push({
            date: inv.date,
            invoiceNumber: inv.invoice_number,
            product: item.products?.name || '-',
            vendor: item.vendors?.name || '-',
            quantity: item.quantity || 0,
            gross_weight: item.gross_weight || 0,
            net_weight: item.net_weight || 0,
            rate: item.rate || 0,
            total: item.total || 0,
          });
          totalNetWeight += item.net_weight || 0;
        });
        
        inv.loose_invoice_items?.forEach((item: any) => {
          const weightInKg = item.weight_unit === 'g' ? (item.net_weight || 0) / 1000 : (item.net_weight || 0);
          allLooseItems.push({
            date: inv.date,
            invoiceNumber: inv.invoice_number,
            product: item.product_name || '-',
            net_weight: item.net_weight || 0,
            weight_unit: item.weight_unit || 'kg',
            rate: item.rate || 0,
            total: item.total || 0,
          });
          totalLooseWeight += weightInKg;
        });
        
        grandTotal += inv.total || 0;
        totalInvoiceDiscount += inv.discount || 0;
        totalInvoiceOtherCharges += inv.other_charges || 0;
      });

      // Calculate total payments received in the period
      const totalPayments = payments?.reduce((sum, p) => sum + (p.amount || 0) + (p.discount || 0), 0) || 0;

      return {
        items: allItems,
        looseItems: allLooseItems,
        payments: payments || [],
        grandTotal,
        totalNetWeight,
        totalLooseWeight,
        totalPayments,
        previousBalance, // This is the opening/previous balance before this period
        invoiceCount: invoices?.length || 0,
        totalInvoiceDiscount,
        totalInvoiceOtherCharges,
      };
    },
    enabled: open && !!company?.id && !!selectedCustomer,
  });

  // Calculate final totals
  const subtotal = data?.grandTotal || 0;
  const finalTotal = subtotal - discount + otherCharges;
  const previousBalance = data?.previousBalance || 0;
  const totalPaymentsReceived = data?.totalPayments || 0;
  const closingBalance = previousBalance + finalTotal - totalPaymentsReceived;
  // Alias for backward compatibility in the UI
  const openingBalance = previousBalance;

  // Generate QR code for UPI payment
  useEffect(() => {
    const generateQR = async () => {
      if (company?.upi_id && closingBalance > 0) {
        try {
          const upiString = `upi://pay?pa=${company.upi_id}&pn=${encodeURIComponent(company.name)}&am=${closingBalance}&cu=INR&tn=${encodeURIComponent('Weekly Invoice ' + format(dateFrom, 'dd MMM') + ' - ' + format(dateTo, 'dd MMM'))}`;
          const url = await QRCode.toDataURL(upiString, {
            width: 120,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
          });
          setQrCodeUrl(url);
        } catch (err) {
          console.error('QR generation failed:', err);
        }
      }
    };
    generateQR();
  }, [company?.upi_id, closingBalance, company?.name, dateFrom, dateTo]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleSave = async () => {
    if (!company?.id || !selectedCustomer || !data) return;
    
    setIsSaving(true);
    try {
      const invoiceData = {
        company_id: company.id,
        customer_id: selectedCustomer,
        date_from: format(dateFrom, 'yyyy-MM-dd'),
        date_to: format(dateTo, 'yyyy-MM-dd'),
        discount,
        other_charges: otherCharges,
        notes: notes || null,
        subtotal: subtotal,
        final_total: finalTotal,
        opening_balance: openingBalance,
        total_payments: totalPaymentsReceived,
        closing_balance: closingBalance,
        total_items: data.items.length + data.looseItems.length,
        total_net_weight: data.totalNetWeight + data.totalLooseWeight,
        created_by: user?.id || null,
      };

      if (editingInvoiceId) {
        await updateWeeklyInvoice.mutateAsync({
          id: editingInvoiceId,
          ...invoiceData,
        });
        setEditingInvoiceId(null);
      } else {
        await createWeeklyInvoice.mutateAsync(invoiceData);
      }
    } catch {
      // Error handled by hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleReceivePayment = async () => {
    if (!company?.id || !selectedCustomer || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    setIsSubmittingPayment(true);
    try {
      await createPayment.mutateAsync({
        customer_id: selectedCustomer,
        invoice_id: null, // Not linked to specific invoice
        amount: paymentAmount,
        discount: 0,
        payment_date: format(paymentDate, 'yyyy-MM-dd'),
        payment_method: paymentMethod,
        notes: paymentNotes || `Weekly Invoice Payment - ${format(dateFrom, 'dd MMM')} to ${format(dateTo, 'dd MMM')}`,
      });
      
      // Reset form and refetch data
      setPaymentAmount(0);
      setPaymentNotes('');
      setShowPaymentForm(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch {
      // Error toast handled by usePayments hook
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Weekly Invoice - ${selectedCustomerData?.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; font-size: 12px; color: #333; background: #fff; }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            
            /* Header */
            .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #2563eb; margin-bottom: 20px; }
            .company-info { flex: 1; display: flex; align-items: flex-start; gap: 16px; }
            .company-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; }
            .company-name, h1.company-name { font-size: 26px; font-weight: 700; color: #1e40af !important; margin-bottom: 8px; }
            .company-details { color: #666; line-height: 1.6; font-size: 11px; }
            .company-details p { margin: 2px 0; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { font-size: 28px; color: #1e40af !important; font-weight: 300; letter-spacing: 2px; }
            .invoice-number { font-size: 12px; font-weight: 600; color: #333; margin-top: 5px; }
            
            /* Meta Info */
            .meta-section { display: flex; justify-content: space-between; margin-bottom: 25px; }
            .bill-to { flex: 1; }
            .bill-to-label { font-size: 10px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px; }
            .bill-to-name { font-size: 16px; font-weight: 600; color: #333; }
            .invoice-details { text-align: right; }
            .invoice-details p { margin: 3px 0; }
            .invoice-details .label, .text-muted-foreground { color: #888 !important; }
            .invoice-details .value { font-weight: 600; }
            
            /* Opening Balance Box */
            .opening-balance-box { background-color: #fef3c7 !important; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .opening-balance-label { font-weight: 600; color: #92400e; }
            .opening-balance-value { font-size: 18px; font-weight: 700; color: #92400e; font-family: 'SF Mono', Monaco, 'Courier New', monospace; }
            
            /* Status Badge */
            .status-badge, [class*="status-"] { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: uppercase; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .status-pending, .bg-yellow-100 { background-color: #fef3c7 !important; color: #92400e !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            
            /* Table */
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            thead tr, .bg-muted\\/50 { background-color: #f8fafc !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            th { padding: 12px 10px; text-align: right; font-weight: 600; color: #475569; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
            th:first-child, th:nth-child(2) { text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; text-align: right; }
            td:first-child, td:nth-child(2) { text-align: left; }
            .text-left { text-align: left !important; }
            .text-right { text-align: right !important; }
            .text-center { text-align: center !important; }
            .font-mono { font-family: 'SF Mono', Monaco, 'Courier New', monospace; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            tr.bg-muted\\/30, .bg-muted\\/30 { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            
            /* Payment Row */
            .payment-row { background-color: #dcfce7 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .payment-row td { color: #166534; font-weight: 500; }
            
            /* Payment Summary Row */
            .bg-green-50 { background-color: #f0fdf4 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .text-green-700 { color: #15803d !important; }
            
            /* Outstanding Balance Row */
            .bg-yellow-50 { background-color: #fefce8 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .text-yellow-800 { color: #854d0e !important; }
            
            /* Totals */
            .totals-section { display: flex; justify-content: flex-end; margin-bottom: 25px; }
            .totals-box { width: 320px; background-color: #f8fafc !important; padding: 15px 20px; border-radius: 8px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
            .totals-row.total { font-size: 18px; font-weight: 700; color: #1e40af; border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 12px; }
            .totals-row.payment { color: #166534; }
            .text-primary { color: #1e40af !important; }
            .text-success { color: #166534 !important; }
            .text-destructive { color: #dc2626 !important; }
            
            /* Footer */
            .footer-section { display: flex; gap: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            .bank-details, .notes-section { flex: 1; }
            .footer-title { font-size: 10px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 8px; }
            .footer-content { font-size: 11px; color: #555; line-height: 1.6; white-space: pre-line; }
            
            /* QR Section */
            .qr-section { text-align: center; padding: 15px; background-color: #f8fafc !important; border-radius: 8px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .qr-section img { margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto; }
            .qr-label { font-size: 10px; color: #666; }
            .upi-id { font-size: 11px; font-weight: 600; color: #1e40af; }
            
            /* Terms */
            .terms { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
            .terms p { font-size: 10px; color: #888; font-style: italic; }
            
            /* Utilities */
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-start { align-items: flex-start; }
            .items-center { align-items: center; }
            .gap-4 { gap: 16px; }
            .gap-6 { gap: 24px; }
            .mb-5, .mb-6 { margin-bottom: 20px; }
            .ml-auto { margin-left: auto; }
            .w-72 { width: 288px; }
            .w-80 { width: 320px; }
            .p-3 { padding: 12px; }
            .p-4 { padding: 16px; }
            .pt-5 { padding-top: 20px; }
            .mt-5 { margin-top: 20px; }
            .rounded-lg { border-radius: 8px; }
            .border-t { border-top: 1px solid #e2e8f0; }
            .border-b-2 { border-bottom: 2px solid #e2e8f0; }
            .border-border { border-color: #e2e8f0; }
            .text-xl { font-size: 20px; }
            .text-lg { font-size: 18px; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .uppercase { text-transform: uppercase; }
            .font-bold { font-weight: 700; }
            .whitespace-pre-line { white-space: pre-line; }
            
            @media print {
              body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .invoice-container { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const hasData = data && (data.items.length > 0 || data.looseItems.length > 0);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon2 className="w-5 h-5 text-primary" />
            Weekly / Custom Date Invoice
          </DialogTitle>
        </DialogHeader>

        {/* View Saved Section */}
        <div className="bg-muted/50 border rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Saved Weekly Invoices</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSavedInvoices(true)} 
            className="gap-2"
          >
            View All Saved
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Select Customer *</label>
            <SearchableSelect
              value={selectedCustomer}
              onValueChange={setSelectedCustomer}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select customer"
              searchPlaceholder="Search customers..."
              emptyMessage="No customers found."
              className="w-[200px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Date Range</label>
            <Select value={dateRange} onValueChange={(v: any) => handleRangeChange(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="lastWeek">Last Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === 'custom' && (
            <>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateFrom, 'dd MMM')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateTo, 'dd MMM')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)} />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {/* Payment Details Toggle */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Payment Rows</label>
            <Button
              variant={showPaymentDetails ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPaymentDetails(!showPaymentDetails)}
              className="gap-2"
            >
              {showPaymentDetails ? (
                <>
                  <Eye className="w-4 h-4" />
                  Showing
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hidden
                </>
              )}
            </Button>
          </div>

          {/* Payment Summary Toggle */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Payment Total</label>
            <Button
              variant={showPaymentSummary ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPaymentSummary(!showPaymentSummary)}
              className="gap-2"
            >
              {showPaymentSummary ? (
                <>
                  <Eye className="w-4 h-4" />
                  Showing
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hidden
                </>
              )}
            </Button>
          </div>
        </div>

        {!selectedCustomer ? (
          <div className="text-center py-12 text-muted-foreground">
            Please select a customer to generate invoice
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div ref={printRef} className="invoice-container">
            {/* Header */}
            <div className="header flex justify-between items-start pb-5 border-b-2 border-primary mb-5">
              <div className="company-info flex items-start gap-4">
                {/* Company Logo */}
                {company?.show_logo_on_invoice && company?.logo_url && (
                  <img 
                    src={company.logo_url} 
                    alt={company.name} 
                    className="company-logo w-16 h-16 object-contain rounded-lg"
                  />
                )}
                <div>
                  <h1 className="company-name text-2xl font-bold text-primary">{company?.name || 'Company Name'}</h1>
                  <div className="company-details text-sm text-muted-foreground space-y-0.5">
                    {company?.address && <p>{company.address}</p>}
                    <p>
                      {company?.phone && <span>📞 {company.phone}</span>}
                      {company?.phone && company?.email && <span className="mx-2">|</span>}
                      {company?.email && <span>✉️ {company.email}</span>}
                    </p>
                    {company?.gst_number && <p className="font-medium">GSTIN: {company.gst_number}</p>}
                  </div>
                </div>
              </div>
              <div className="invoice-title text-right">
                <h1 className="text-3xl font-light text-primary tracking-wider">STATEMENT</h1>
                <p className="invoice-number text-sm font-semibold mt-1">Weekly Invoice</p>
              </div>
            </div>

            {/* Meta Info */}
            <div className="meta-section flex justify-between mb-6">
              <div className="bill-to">
                <p className="bill-to-label text-xs uppercase text-muted-foreground font-semibold mb-1">Bill To</p>
                <p className="bill-to-name text-lg font-semibold">{selectedCustomerData?.name}</p>
                {selectedCustomerData?.address && (
                  <p className="text-sm text-muted-foreground">{selectedCustomerData.address}</p>
                )}
                {selectedCustomerData?.phone && (
                  <p className="text-sm text-muted-foreground">📞 {selectedCustomerData.phone}</p>
                )}
              </div>
              <div className="invoice-details text-right space-y-1">
                <p><span className="label text-muted-foreground">Period: </span><span className="value font-semibold">{format(dateFrom, 'dd MMM yyyy')} - {format(dateTo, 'dd MMM yyyy')}</span></p>
                <p><span className="label text-muted-foreground">Generated: </span><span className="value font-semibold">{format(new Date(), 'dd MMM yyyy')}</span></p>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "status-badge mt-2",
                    closingBalance <= 0 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  )}
                >
                  {closingBalance <= 0 ? 'PAID' : 'PENDING'}
                </Badge>
              </div>
            </div>

            {/* Previous Balance Box - Always show */}
            <div className="opening-balance-box bg-amber-100 p-3 rounded-lg mb-5 flex justify-between items-center">
              <span className="opening-balance-label text-sm font-semibold text-amber-800">📋 Previous Balance</span>
              <span className="opening-balance-value text-lg font-bold text-amber-800 font-mono">{formatCurrency(previousBalance)}</span>
            </div>

            {/* Items Table - Grouped by Date with Payments */}
            <div className="overflow-x-auto mb-5">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border-b-2 border-border p-3 text-left text-xs font-semibold uppercase text-muted-foreground">#</th>
                    <th className="border-b-2 border-border p-3 text-left text-xs font-semibold uppercase text-muted-foreground">Description</th>
                    <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Qty</th>
                    <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Gross (kg)</th>
                    <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Net (kg)</th>
                    <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Rate (₹)</th>
                    <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Debit (₹)</th>
                    <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Combine items and payments, sort by date
                    // Add items grouped by date
                    const itemsByDate = (data?.items || []).reduce((acc: Record<string, any[]>, item) => {
                      const dateKey = item.date;
                      if (!acc[dateKey]) acc[dateKey] = [];
                      acc[dateKey].push({ ...item, type: 'item' });
                      return acc;
                    }, {});
                    
                    // Add payments only if showPaymentDetails is true
                    if (showPaymentDetails) {
                      (data?.payments || []).forEach(payment => {
                        const dateKey = payment.payment_date;
                        if (!itemsByDate[dateKey]) itemsByDate[dateKey] = [];
                        itemsByDate[dateKey].push({ 
                          ...payment, 
                          type: 'payment',
                          product: `Payment - ${payment.payment_method || 'Cash'}`,
                          credit: payment.amount
                        });
                      });
                    }
                    
                    const sortedDates = Object.keys(itemsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                    let itemIndex = 0;
                    
                    return sortedDates.map((dateKey) => (
                      <React.Fragment key={`date-group-${dateKey}`}>
                        {/* Date Header Row */}
                        <tr className="bg-primary/10">
                          <td colSpan={8} className="p-2 text-sm font-semibold text-primary">
                            📅 {format(new Date(dateKey), 'EEEE, dd MMM yyyy')}
                          </td>
                        </tr>
                        {/* Items and Payments under this date */}
                        {itemsByDate[dateKey].map((item, idx) => {
                          itemIndex++;
                          const isPayment = item.type === 'payment';
                          
                          return (
                            <tr key={`item-${dateKey}-${idx}`} className={cn("hover:bg-muted/30", isPayment && "payment-row bg-green-50")}>
                              <td className="border-b border-border/50 p-3 text-sm">{itemIndex}</td>
                              <td className="border-b border-border/50 p-3 text-sm font-medium">
                                {isPayment ? (
                                  <span className="text-green-700">💰 {item.product} {item.notes ? `(${item.notes})` : ''}</span>
                                ) : (
                                  item.product
                                )}
                              </td>
                              <td className="border-b border-border/50 p-3 text-sm text-right font-mono">{isPayment ? '-' : item.quantity}</td>
                              <td className="border-b border-border/50 p-3 text-sm text-right font-mono">{isPayment ? '-' : item.gross_weight?.toFixed(2)}</td>
                              <td className="border-b border-border/50 p-3 text-sm text-right font-mono font-semibold">{isPayment ? '-' : item.net_weight?.toFixed(2)}</td>
                              <td className="border-b border-border/50 p-3 text-sm text-right font-mono">{isPayment ? '-' : item.rate?.toFixed(2)}</td>
                              <td className="border-b border-border/50 p-3 text-sm text-right font-mono font-semibold">
                                {isPayment ? '-' : formatCurrency(item.total)}
                              </td>
                              <td className="border-b border-border/50 p-3 text-sm text-right font-mono font-semibold text-green-700">
                                {isPayment ? formatCurrency(item.credit) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ));
                  })()}
                  {(!data?.items || data.items.length === 0) && (!data?.payments || data.payments.length === 0) && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted-foreground py-8">
                        No transactions found for selected period
                      </td>
                    </tr>
                  )}
                  {/* Summary Row */}
                  {data?.items && data.items.length > 0 && (
                    <tr className="bg-muted/30 font-semibold">
                      <td colSpan={4} className="p-3 text-sm text-right">Items Total Weight:</td>
                      <td className="p-3 text-sm text-right font-mono">{data.totalNetWeight.toFixed(2)} kg</td>
                      <td className="p-3"></td>
                      <td className="p-3 text-sm text-right font-mono">{formatCurrency(data.items.reduce((sum, item) => sum + item.total, 0))}</td>
                      <td className="p-3 text-sm text-right font-mono text-green-700">{showPaymentDetails && showPaymentSummary && data.totalPayments > 0 ? formatCurrency(data.totalPayments) : '-'}</td>
                    </tr>
                  )}
                  {/* Payment Summary Row when payments are hidden */}
                  {!showPaymentDetails && showPaymentSummary && totalPaymentsReceived > 0 && (
                    <tr className="bg-green-50 font-semibold">
                      <td colSpan={6} className="p-3 text-sm text-right text-green-700">
                        💰 Total Payments Received ({data?.payments?.length || 0} payments):
                      </td>
                      <td className="p-3"></td>
                      <td className="p-3 text-sm text-right font-mono text-green-700">{formatCurrency(totalPaymentsReceived)}</td>
                    </tr>
                  )}
                  {/* Outstanding Balance Row when payments are hidden */}
                  {!showPaymentDetails && (
                    <tr className={cn("font-bold", closingBalance > 0 ? "bg-yellow-50" : "bg-green-50")}>
                      <td colSpan={6} className={cn("p-3 text-sm text-right", closingBalance > 0 ? "text-yellow-800" : "text-green-700")}>
                        📊 Outstanding Balance:
                      </td>
                      <td className="p-3"></td>
                      <td className={cn("p-3 text-sm text-right font-mono", closingBalance > 0 ? "text-yellow-800" : "text-green-700")}>
                        {formatCurrency(Math.max(0, closingBalance))}
                        {closingBalance <= 0 && <span className="ml-1">✓</span>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Loose Items Table - Grouped by Date */}
            {data?.looseItems && data.looseItems.length > 0 && (
              <div className="overflow-x-auto mb-5">
                <p className="text-xs uppercase text-muted-foreground font-semibold mb-2">Loose Items</p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border-b-2 border-border p-3 text-left text-xs font-semibold uppercase text-muted-foreground">#</th>
                      <th className="border-b-2 border-border p-3 text-left text-xs font-semibold uppercase text-muted-foreground">Item</th>
                      <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Weight</th>
                      <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Rate (₹)</th>
                      <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Group loose items by date
                      const looseItemsByDate = data.looseItems.reduce((acc: Record<string, any[]>, item) => {
                        const dateKey = item.date;
                        if (!acc[dateKey]) acc[dateKey] = [];
                        acc[dateKey].push(item);
                        return acc;
                      }, {});
                      
                      const sortedDates = Object.keys(looseItemsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                      let looseItemIndex = 0;
                      
                      return sortedDates.map((dateKey) => (
                        <React.Fragment key={`loose-date-group-${dateKey}`}>
                          {/* Date Header Row */}
                          <tr className="bg-primary/10">
                            <td colSpan={5} className="p-2 text-sm font-semibold text-primary">
                              📅 {format(new Date(dateKey), 'EEEE, dd MMM yyyy')}
                            </td>
                          </tr>
                          {/* Items under this date */}
                          {looseItemsByDate[dateKey].map((item, idx) => {
                            looseItemIndex++;
                            return (
                              <tr key={`loose-item-${dateKey}-${idx}`} className="hover:bg-muted/30">
                                <td className="border-b border-border/50 p-3 text-sm">{looseItemIndex}</td>
                                <td className="border-b border-border/50 p-3 text-sm font-medium">{item.product}</td>
                                <td className="border-b border-border/50 p-3 text-sm text-right font-mono">
                                  {item.net_weight.toFixed(2)} {item.weight_unit}
                                </td>
                                <td className="border-b border-border/50 p-3 text-sm text-right font-mono">{item.rate.toFixed(2)}</td>
                                <td className="border-b border-border/50 p-3 text-sm text-right font-mono font-semibold">{formatCurrency(item.total)}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ));
                    })()}
                    {/* Summary Row for loose items */}
                    <tr className="bg-muted/30 font-semibold">
                      <td colSpan={2} className="p-3 text-sm text-right">Loose Items Total:</td>
                      <td className="p-3 text-sm text-right font-mono">{data.totalLooseWeight.toFixed(3)} kg</td>
                      <td className="p-3"></td>
                      <td className="p-3 text-sm text-right font-mono">{formatCurrency(data.looseItems.reduce((sum, item) => sum + item.total, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {hasData && (
              <>
                {/* Totals */}
                <div className="flex justify-between items-start gap-6 mb-6">
                  <div className="text-sm text-muted-foreground">
                    Total Invoices: {data?.invoiceCount || 0} | Items: {(data?.items?.length || 0) + (data?.looseItems?.length || 0)} | Payments: {data?.payments?.length || 0}
                  </div>
                  
                  <div className="totals-box ml-auto w-80 bg-muted/30 p-4 rounded-lg">
                    {/* Previous Balance - Always show */}
                    <div className="totals-row flex justify-between py-1.5 text-amber-700">
                      <span>Previous Balance</span>
                      <span className="font-mono">{formatCurrency(previousBalance)}</span>
                    </div>
                    
                    {/* Period Sales */}
                    <div className="totals-row flex justify-between py-1.5">
                      <span className="text-muted-foreground">Period Sales</span>
                      <span className="font-mono">{formatCurrency(subtotal)}</span>
                    </div>
                    
                    {/* Invoice-level adjustments from individual invoices */}
                    {(data?.totalInvoiceDiscount || 0) > 0 && (
                      <div className="totals-row flex justify-between py-1.5 text-sm text-muted-foreground">
                        <span>└ Invoice Discounts</span>
                        <span className="font-mono text-green-600">Included</span>
                      </div>
                    )}
                    
                    {/* Additional Discount */}
                    {discount > 0 && (
                      <div className="totals-row flex justify-between py-1.5 text-green-600">
                        <span>Additional Discount</span>
                        <span className="font-mono">-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    
                    {/* Other Charges */}
                    {otherCharges > 0 && (
                      <div className="totals-row flex justify-between py-1.5 text-orange-600">
                        <span>Other Charges</span>
                        <span className="font-mono">+{formatCurrency(otherCharges)}</span>
                      </div>
                    )}
                    
                    <Separator className="my-2" />
                    
                    {/* Total Amount */}
                    <div className="totals-row flex justify-between py-1.5 font-semibold">
                      <span>Total Amount</span>
                      <span className="font-mono">{formatCurrency(previousBalance + finalTotal)}</span>
                    </div>
                    
                    {/* Payments */}
                    {showPaymentSummary && totalPaymentsReceived > 0 && (
                      <div className="totals-row payment flex justify-between py-1.5 text-green-600">
                        <span>Payments Received</span>
                        <span className="font-mono">-{formatCurrency(totalPaymentsReceived)}</span>
                      </div>
                    )}
                    
                    <Separator className="my-2" />
                    
                    {/* Outstanding Balance */}
                    <div className="totals-row total flex justify-between py-2 text-lg font-bold text-primary">
                      <span>Outstanding Balance</span>
                      <span className={cn("font-mono", closingBalance <= 0 ? "text-green-600" : "text-destructive")}>
                        {formatCurrency(closingBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes Section (from saved data, shown in print) */}
                {notes && (
                  <div className="notes-section mb-5 p-4 bg-muted/20 rounded-lg">
                    <p className="footer-title text-xs uppercase text-muted-foreground font-semibold mb-2">Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{notes}</p>
                  </div>
                )}

                {/* Footer Section */}
                <div className="footer-section flex gap-8 pt-5 border-t mt-5">
                  {/* Bank Details */}
                  {company?.bank_details && (
                    <div className="bank-details flex-1">
                      <p className="footer-title text-xs uppercase text-muted-foreground font-semibold mb-2">Bank Details</p>
                      <p className="footer-content text-sm text-muted-foreground whitespace-pre-line">{company.bank_details}</p>
                    </div>
                  )}

                  {/* QR Code */}
                  {qrCodeUrl && company?.upi_id && closingBalance > 0 && (
                    <div className="qr-section text-center p-4 bg-muted/30 rounded-lg">
                      <img src={qrCodeUrl} alt="UPI QR Code" className="mx-auto mb-2" />
                      <p className="qr-label text-xs text-muted-foreground">Scan to Pay</p>
                      <p className="upi-id text-sm font-semibold text-primary">{company.upi_id}</p>
                    </div>
                  )}
                </div>

                {/* Footer Notes */}
                {company?.footer_notes && (
                  <div className="terms mt-5 pt-4 border-t">
                    <p className="text-xs text-muted-foreground italic">{company.footer_notes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Bottom Actions Section - Discount, Other Charges, Notes, and Payment */}
        {selectedCustomer && hasData && (
          <div className="mt-6 space-y-4 border-t pt-4">
            {/* Adjustments Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="weekly-discount" className="text-sm">Discount (₹)</Label>
                <Input
                  id="weekly-discount"
                  type="number"
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="font-mono"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="weekly-charges" className="text-sm">Other Charges (₹)</Label>
                <Input
                  id="weekly-charges"
                  type="number"
                  value={otherCharges || ''}
                  onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)}
                  className="font-mono"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="weekly-notes" className="text-sm">Notes</Label>
                <Textarea
                  id="weekly-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes for this statement..."
                  className="h-10 min-h-[40px] resize-none"
                />
              </div>
            </div>

            {/* Receive Payment Section */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-green-800">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-semibold">Receive Payment</span>
                </div>
                {!showPaymentForm && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setShowPaymentForm(true);
                      setPaymentAmount(closingBalance > 0 ? closingBalance : 0);
                    }}
                    className="gap-2 bg-green-600 text-white hover:bg-green-700 border-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payment
                  </Button>
                )}
              </div>

              {showPaymentForm && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-green-800">Amount (₹)</Label>
                    <Input
                      type="number"
                      value={paymentAmount || ''}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="font-mono bg-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-green-800">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-green-800">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start bg-white">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(paymentDate, 'dd MMM yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={paymentDate} onSelect={(d) => d && setPaymentDate(d)} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-green-800">Notes</Label>
                    <Input
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="bg-white"
                      placeholder="Optional notes..."
                    />
                  </div>
                  <div className="md:col-span-4 flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowPaymentForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleReceivePayment}
                      disabled={isSubmittingPayment || paymentAmount <= 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSubmittingPayment ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      Record Payment
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t flex flex-wrap gap-2">
              <Button 
                onClick={handleSave} 
                className="gap-2 flex-1" 
                disabled={!selectedCustomer || !hasData || isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingInvoiceId ? 'Update' : 'Save'}
              </Button>
              <Button variant="outline" onClick={handlePrint} className="gap-2 flex-1" disabled={!selectedCustomer || !hasData}>
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button variant="outline" onClick={handlePrint} className="gap-2 flex-1" disabled={!selectedCustomer || !hasData}>
                <Download className="w-4 h-4" />
                PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    
    {/* Saved Weekly Invoices Dialog */}
    <SavedWeeklyInvoicesDialog 
      open={showSavedInvoices} 
      onOpenChange={setShowSavedInvoices}
      onViewInvoice={(invoice) => {
        // Load the saved invoice data for viewing
        setSelectedCustomer(invoice.customer_id);
        setDateFrom(new Date(invoice.date_from));
        setDateTo(new Date(invoice.date_to));
        setDiscount(Number(invoice.discount));
        setOtherCharges(Number(invoice.other_charges));
        setNotes(invoice.notes || '');
        setDateRange('custom');
        setEditingInvoiceId(null); // View mode - not editing
        setShowSavedInvoices(false);
      }}
      onEditInvoice={(invoice) => {
        // Load the saved invoice data for editing
        setSelectedCustomer(invoice.customer_id);
        setDateFrom(new Date(invoice.date_from));
        setDateTo(new Date(invoice.date_to));
        setDiscount(Number(invoice.discount));
        setOtherCharges(Number(invoice.other_charges));
        setNotes(invoice.notes || '');
        setDateRange('custom');
        setEditingInvoiceId(invoice.id); // Edit mode
        setShowSavedInvoices(false);
      }}
    />
    </>
  );
}
