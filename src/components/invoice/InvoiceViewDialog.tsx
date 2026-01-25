import { useRef, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';

interface InvoiceViewDialogProps {
  invoice: {
    id: string;
    invoice_number: string;
    date: string;
    customer_name: string;
    customer_balance?: number;
    subtotal: number;
    discount: number;
    other_charges: number;
    total: number;
    received_amount?: number;
    payment_type: string;
    status: string;
    notes: string | null;
    items: {
      vendor_name: string;
      product_name: string;
      quantity: number;
      gross_weight: number;
      box_weight: number;
      benches_weight: number;
      net_weight: number;
      rate: number;
      total: number;
    }[];
    loose_items?: {
      vendor_name: string;
      product_name: string;
      net_weight: number;
      weight_unit: 'kg' | 'g';
      rate: number;
      total: number;
    }[];
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceViewDialog({ invoice, open, onOpenChange }: InvoiceViewDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { company } = useAuth();
  const navigate = useNavigate();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      if (company?.upi_id && invoice?.total) {
        try {
          // UPI payment string format
          const upiString = `upi://pay?pa=${company.upi_id}&pn=${encodeURIComponent(company.name)}&am=${invoice.total}&cu=INR&tn=${encodeURIComponent('Invoice ' + invoice.invoice_number)}`;
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
  }, [company?.upi_id, invoice?.total, invoice?.invoice_number, company?.name]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
          <title>Invoice ${invoice?.invoice_number}</title>
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
            .invoice-title h1 { font-size: 32px; color: #1e40af !important; font-weight: 300; letter-spacing: 2px; }
            .invoice-number { font-size: 14px; font-weight: 600; color: #333; margin-top: 5px; }
            
            /* Meta Info */
            .meta-section { display: flex; justify-content: space-between; margin-bottom: 25px; }
            .bill-to { flex: 1; }
            .bill-to-label { font-size: 10px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px; }
            .bill-to-name { font-size: 16px; font-weight: 600; color: #333; }
            .invoice-details { text-align: right; }
            .invoice-details p { margin: 3px 0; }
            .invoice-details .label, .text-muted-foreground { color: #888 !important; }
            .invoice-details .value { font-weight: 600; }
            
            /* Status Badge */
            .status-badge, [class*="status-"] { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: uppercase; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .status-paid, .bg-green-100 { background-color: #dcfce7 !important; color: #166534 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .status-pending, .bg-yellow-100 { background-color: #fef3c7 !important; color: #92400e !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .status-partial, .bg-blue-100 { background-color: #dbeafe !important; color: #1e40af !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            
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
            
            /* Totals */
            .totals-section { display: flex; justify-content: flex-end; margin-bottom: 25px; }
            .totals-box { width: 280px; background-color: #f8fafc !important; padding: 15px 20px; border-radius: 8px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
            .totals-row.discount, .text-green-600 { color: #16a34a !important; }
            .totals-row.total { font-size: 18px; font-weight: 700; color: #1e40af; border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 12px; }
            .totals-row.received { color: #16a34a !important; }
            .totals-row.balance { color: #dc2626 !important; font-weight: 600; }
            .totals-row.old-balance { color: #ea580c !important; }
            .text-primary { color: #1e40af !important; }
            
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
            
            /* Separator */
            [data-slot="separator"], hr { height: 1px; background: #e2e8f0; border: none; margin: 8px 0; }
            
            /* Utilities */
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-start { align-items: flex-start; }
            .gap-6 { gap: 24px; }
            .gap-8 { gap: 32px; }
            .mb-5, .mb-6 { margin-bottom: 20px; }
            .ml-auto { margin-left: auto; }
            .w-72 { width: 288px; }
            .p-3 { padding: 12px; }
            .p-4 { padding: 16px; }
            .pt-5 { padding-top: 20px; }
            .mt-5 { margin-top: 20px; }
            .pt-4 { padding-top: 16px; }
            .py-1\\.5, .py-2 { padding-top: 6px; padding-bottom: 6px; }
            .rounded-lg { border-radius: 8px; }
            .border-t { border-top: 1px solid #e2e8f0; }
            .border-t-2 { border-top: 2px solid #e2e8f0; }
            .border-b { border-bottom: 1px solid #e2e8f0; }
            .border-b-2 { border-bottom: 2px solid #e2e8f0; }
            .border-border { border-color: #e2e8f0; }
            .border-border\\/50 { border-color: rgba(226, 232, 240, 0.5); }
            .text-xl { font-size: 20px; }
            .text-lg { font-size: 18px; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .uppercase { text-transform: uppercase; }
            .font-bold { font-weight: 700; }
            .whitespace-pre-line { white-space: pre-line; }
            .italic { font-style: italic; }
            .mx-2 { margin-left: 8px; margin-right: 8px; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .mb-1, .mb-2 { margin-bottom: 8px; }
            .mt-1, .mt-2 { margin-top: 4px; }
            .space-y-0\\.5 > * + * { margin-top: 2px; }
            .space-y-1 > * + * { margin-top: 4px; }
            .flex-1 { flex: 1; }
            .overflow-x-auto { overflow-x: auto; }
            .w-full { width: 100%; }
            
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

  const handleDownloadPDF = () => {
    handlePrint();
  };

  const handleEdit = () => {
    if (invoice?.id) {
      onOpenChange(false);
      navigate(`/invoice/edit/${invoice.id}`);
    }
  };

  if (!invoice) return null;

  const totalNetWeight = invoice.items.reduce((sum, item) => sum + item.net_weight, 0);
  const looseItems = invoice.loose_items || [];
  const hasLooseItems = looseItems.length > 0;
  const totalLooseWeight = looseItems.reduce((sum, item) => {
    // Convert grams to kg for consistent display
    const weightInKg = item.weight_unit === 'g' ? item.net_weight / 1000 : item.net_weight;
    return sum + weightInKg;
  }, 0);
  const looseItemsTotal = looseItems.reduce((sum, item) => sum + item.total, 0);
  
  // Calculate payment details
  const receivedAmount = invoice.received_amount || 0;
  const invoiceBalance = invoice.total - receivedAmount;
  const customerOldBalance = invoice.customer_balance || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice {invoice.invoice_number}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit} className="gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2">
                <Download className="w-4 h-4" />
                PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Printable Content */}
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
              <h1 className="text-3xl font-light text-primary tracking-wider">INVOICE</h1>
              <p className="invoice-number text-base font-semibold mt-1">{invoice.invoice_number}</p>
            </div>
          </div>

          {/* Meta Info */}
          <div className="meta-section flex justify-between mb-6">
            <div className="bill-to">
              <p className="bill-to-label text-xs uppercase text-muted-foreground font-semibold mb-1">Bill To</p>
              <p className="bill-to-name text-lg font-semibold">{invoice.customer_name}</p>
            </div>
            <div className="invoice-details text-right space-y-1">
              <p><span className="label text-muted-foreground">Date: </span><span className="value font-semibold">{formatDate(invoice.date)}</span></p>
              <p><span className="label text-muted-foreground">Payment: </span><span className="value font-semibold capitalize">{invoice.payment_type}</span></p>
              <Badge 
                variant="secondary" 
                className={`status-badge mt-2 ${
                  invoice.status === 'paid' ? 'status-paid bg-green-100 text-green-800' : 
                  invoice.status === 'partial' ? 'status-partial bg-blue-100 text-blue-800' :
                  'status-pending bg-yellow-100 text-yellow-800'
                }`}
              >
                {invoice.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border-b-2 border-border p-3 text-left text-xs font-semibold uppercase text-muted-foreground">#</th>
                  <th className="border-b-2 border-border p-3 text-left text-xs font-semibold uppercase text-muted-foreground">Item</th>
                  <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Qty</th>
                  <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Gross (kg)</th>
                  <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Net (kg)</th>
                  <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Rate (₹)</th>
                  <th className="border-b-2 border-border p-3 text-right text-xs font-semibold uppercase text-muted-foreground">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="hover:bg-muted/30">
                    <td className="border-b border-border/50 p-3 text-sm">{index + 1}</td>
                    <td className="border-b border-border/50 p-3 text-sm font-medium">{item.product_name}</td>
                    <td className="border-b border-border/50 p-3 text-sm text-right font-mono">{item.quantity}</td>
                    <td className="border-b border-border/50 p-3 text-sm text-right font-mono">{item.gross_weight.toFixed(2)}</td>
                    <td className="border-b border-border/50 p-3 text-sm text-right font-mono font-semibold">{item.net_weight.toFixed(2)}</td>
                    <td className="border-b border-border/50 p-3 text-sm text-right font-mono">{item.rate.toFixed(2)}</td>
                    <td className="border-b border-border/50 p-3 text-sm text-right font-mono font-semibold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
                {/* Summary Row for regular items */}
                {invoice.items.length > 0 && (
                  <tr className="bg-muted/30 font-semibold">
                    <td colSpan={4} className="p-3 text-sm text-right">Items Total Weight:</td>
                    <td className="p-3 text-sm text-right font-mono">{totalNetWeight.toFixed(2)} kg</td>
                    <td className="p-3"></td>
                    <td className="p-3 text-sm text-right font-mono">{formatCurrency(invoice.items.reduce((sum, item) => sum + item.total, 0))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Loose Items Table */}
          {hasLooseItems && (
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
                  {looseItems.map((item, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="border-b border-border/50 p-3 text-sm">{index + 1}</td>
                      <td className="border-b border-border/50 p-3 text-sm font-medium">{item.product_name}</td>
                      <td className="border-b border-border/50 p-3 text-sm text-right font-mono">
                        {item.net_weight.toFixed(2)} {item.weight_unit}
                      </td>
                      <td className="border-b border-border/50 p-3 text-sm text-right font-mono">{item.rate.toFixed(2)}</td>
                      <td className="border-b border-border/50 p-3 text-sm text-right font-mono font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                  {/* Summary Row for loose items */}
                  <tr className="bg-muted/30 font-semibold">
                    <td colSpan={2} className="p-3 text-sm text-right">Loose Items Total:</td>
                    <td className="p-3 text-sm text-right font-mono">{totalLooseWeight.toFixed(3)} kg</td>
                    <td className="p-3"></td>
                    <td className="p-3 text-sm text-right font-mono">{formatCurrency(looseItemsTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Totals and Notes Section */}
          <div className="flex justify-between items-start gap-6 mb-6">
            {/* Notes */}
            {invoice.notes && (
              <div className="notes-section flex-1">
                <p className="footer-title text-xs uppercase text-muted-foreground font-semibold mb-2">Notes</p>
                <p className="footer-content text-sm text-muted-foreground">{invoice.notes}</p>
              </div>
            )}

            {/* Totals */}
            <div className="totals-box ml-auto w-72 bg-muted/30 p-4 rounded-lg">
              <div className="totals-row flex justify-between py-1.5">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="totals-row discount flex justify-between py-1.5 text-green-600">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              {invoice.other_charges > 0 && (
                <div className="totals-row flex justify-between py-1.5">
                  <span className="text-muted-foreground">Other Charges</span>
                  <span className="font-mono">+{formatCurrency(invoice.other_charges)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="totals-row total flex justify-between py-2 text-xl font-bold text-primary border-t-2 mt-2 pt-3">
                <span>Grand Total</span>
                <span className="font-mono">{formatCurrency(invoice.total)}</span>
              </div>
              
              {/* Payment Details */}
              {receivedAmount > 0 && (
                <div className="totals-row received flex justify-between py-1.5 text-green-600">
                  <span>Received</span>
                  <span className="font-mono">-{formatCurrency(receivedAmount)}</span>
                </div>
              )}
              {invoiceBalance > 0 && (
                <div className="totals-row balance flex justify-between py-1.5 text-red-600 font-semibold">
                  <span>Balance Due</span>
                  <span className="font-mono">{formatCurrency(invoiceBalance)}</span>
                </div>
              )}
              
              {/* Customer Old Balance */}
              {customerOldBalance !== 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="totals-row old-balance flex justify-between py-1.5 text-orange-600">
                    <span>Previous Balance</span>
                    <span className="font-mono">{formatCurrency(Math.abs(customerOldBalance))}</span>
                  </div>
                  <div className="totals-row flex justify-between py-1.5 font-bold">
                    <span>Total Outstanding</span>
                    <span className="font-mono text-primary">{formatCurrency(invoiceBalance + customerOldBalance)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="footer-section flex gap-8 pt-5 border-t border-border">
            {company?.bank_details && (
              <div className="bank-details flex-1">
                <p className="footer-title text-xs uppercase text-muted-foreground font-semibold mb-2">Bank Details</p>
                <p className="footer-content text-sm text-muted-foreground whitespace-pre-line">{company.bank_details}</p>
              </div>
            )}
            {/* QR Code for UPI */}
            {company?.upi_id && qrCodeUrl && (
              <div className="qr-section p-4 bg-muted/50 rounded-lg text-center">
                <img src={qrCodeUrl} alt="UPI QR Code" className="mx-auto mb-2" style={{ width: 120, height: 120 }} />
                <p className="qr-label text-xs text-muted-foreground">Scan to Pay</p>
                <p className="upi-id text-sm font-semibold text-primary">{company.upi_id}</p>
              </div>
            )}
          </div>

          {/* Terms */}
          {company?.footer_notes && (
            <div className="terms mt-5 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground italic">{company.footer_notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}