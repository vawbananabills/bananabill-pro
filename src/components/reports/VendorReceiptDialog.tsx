import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useVendors } from '@/hooks/useVendors';
import { useProducts } from '@/hooks/useProducts';
import { useVendorReceipts, VendorReceiptWithItems } from '@/hooks/useVendorReceipts';
import { OPEN_VENDOR_RECEIPT_DIALOG_EVENT } from '@/components/GlobalKeyboardShortcuts';
import { format } from 'date-fns';
import { Printer, Plus, Trash2, Save, FileText, Loader2, Search, Eye, Edit, FolderOpen, Package, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';

interface VendorReceiptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ReceiptItem {
    id: string;
    productId: string;
    itemName: string;
    qty: number;
    grossWeight: number;
    netWeight: number;
    rate: number;
    amount: number;
}

export function VendorReceiptDialog({ open, onOpenChange }: VendorReceiptDialogProps) {
    const { company } = useAuth();
    const { vendors } = useVendors();
    const { products } = useProducts();
    const { receipts, isLoading: isLoadingSaved, createReceipt, updateReceipt, deleteReceipt, getReceiptWithItems } = useVendorReceipts();

    // Listen for global event to open this dialog
    useEffect(() => {
        const handleOpen = () => onOpenChange(true);
        window.addEventListener(OPEN_VENDOR_RECEIPT_DIALOG_EVENT, handleOpen);
        return () => window.removeEventListener(OPEN_VENDOR_RECEIPT_DIALOG_EVENT, handleOpen);
    }, [onOpenChange]);

    const [activeTab, setActiveTab] = useState<string>('create');
    const [isEditing, setIsEditing] = useState<string | null>(null);

    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [receiptNumber, setReceiptNumber] = useState<string>('');
    const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [vehicleNumber, setVehicleNumber] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [paymentMode, setPaymentMode] = useState<string>('Cash');
    const [amountReceived, setAmountReceived] = useState<number>(0);

    // Items table
    const [items, setItems] = useState<ReceiptItem[]>([
        { id: '1', productId: '', itemName: '', qty: 0, grossWeight: 0, netWeight: 0, rate: 0, amount: 0 }
    ]);

    // Adjustments
    const [cooli, setCooli] = useState<number>(0);
    const [rent, setRent] = useState<number>(0);
    const [padi, setPadi] = useState<number>(0);
    const [loadingCharge, setLoadingCharge] = useState<number>(0);
    const [commissionPercent, setCommissionPercent] = useState<number>(10);

    useEffect(() => {
        if (open && !isEditing && !receiptNumber) {
            setReceiptNumber(`VR-${Date.now().toString().slice(-6)}`);
        }
    }, [open, isEditing, receiptNumber]);

    const resetForm = () => {
        setIsEditing(null);
        setSelectedVendor('');
        setReceiptNumber(`VR-${Date.now().toString().slice(-6)}`);
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setVehicleNumber('');
        setNotes('');
        setPaymentMode('Cash');
        setAmountReceived(0);
        setItems([{ id: '1', productId: '', itemName: '', qty: 0, grossWeight: 0, netWeight: 0, rate: 0, amount: 0 }]);
        setCooli(0);
        setRent(0);
        setPadi(0);
        setLoadingCharge(0);
        setCommissionPercent(10);
    };

    const handleEdit = async (receiptId: string) => {
        const data = await getReceiptWithItems(receiptId);
        if (data) {
            setIsEditing(data.id);
            setSelectedVendor(data.vendor_id);
            setReceiptNumber(data.receipt_number);
            setDate(data.date);
            setVehicleNumber(data.vehicle_number || '');
            setNotes(data.notes || '');
            setPaymentMode(data.payment_mode);
            setAmountReceived(data.amount_received);
            setCooli(data.cooli);
            setRent(data.rent);
            setPadi(data.padi);
            setLoadingCharge(data.loading_charge);
            setCommissionPercent(data.commission_percent);
            setItems(data.items.map(it => ({
                id: it.id || Math.random().toString(),
                productId: it.product_id || '',
                itemName: it.item_name,
                qty: it.qty,
                grossWeight: it.gross_weight,
                netWeight: it.net_weight,
                rate: it.rate,
                amount: it.amount
            })));
            setActiveTab('create');
        }
    };

    const selectedVendorData = vendors.find(v => v.id === selectedVendor);

    const receiptBalancesByVendor = receipts.reduce<Record<string, number>>((acc, r) => {
        const key = r.vendor_id;
        const prev = acc[key] || 0;
        const finalTotal = Number(r.final_total || 0);
        const received = Number(r.amount_received || 0);
        acc[key] = prev + (finalTotal - received);
        return acc;
    }, {});

    const selectedVendorReceiptBalance = selectedVendor
        ? (receiptBalancesByVendor[selectedVendor] || 0) +
          Number((selectedVendorData as any)?.vendor_r_opening_balance || 0)
        : 0;

    const addItem = () => {
        setItems([...items, { id: Date.now().toString(), productId: '', itemName: '', qty: 0, grossWeight: 0, netWeight: 0, rate: 0, amount: 0 }]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const updateItem = (id: string, field: keyof ReceiptItem, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                let updatedItem = { ...item, [field]: value };

                // If product changed, update name and rate
                if (field === 'productId') {
                    const product = products.find(p => p.id === value);
                    if (product) {
                        updatedItem.itemName = product.name;
                        updatedItem.rate = product.default_rate || 0;
                    }
                }

                if (field === 'rate' || field === 'netWeight' || field === 'productId') {
                    updatedItem.amount = (updatedItem.netWeight || 0) * (updatedItem.rate || 0);
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const firstTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const commission = (firstTotal * commissionPercent) / 100;
    const finalTotal = firstTotal - cooli - rent - padi - loadingCharge - commission;

    const handlePrint = (printData?: any) => {
        const d = printData || {
            receiptNumber,
            date,
            vendorName: selectedVendorData?.name || '-',
            vehicleNumber,
            notes,
            paymentMode,
            amountReceived,
            items,
            firstTotal,
            cooli,
            rent,
            padi,
            loadingCharge,
            commission,
            commissionPercent,
            finalTotal
        };

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
      <html>
        <head>
          <title>Vendor Receipt - ${d.receiptNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .receipt-info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 0.9em; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.9em; }
            th { background: #f9f9f9; }
            .text-right { text-align: right; }
            .totals { float: right; width: 280px; }
            .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.9em; }
            .grand-total { font-weight: bold; font-size: 1.1em; border-top: 2px solid #333; margin-top: 8px; padding-top: 8px; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; }
            .signature { border-top: 1px solid #333; width: 150px; text-align: center; padding-top: 5px; font-size: 0.8em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 1.5em;">${company?.name || 'Company Name'}</h1>
            <p style="margin: 5px 0; font-size: 0.9em;">Vendor Receipt</p>
          </div>
          <div class="receipt-info">
            <div>
              <p><strong>Vendor:</strong> ${d.vendorName || (d.vendors?.name)}</p>
              <p><strong>Vehicle:</strong> ${d.vehicleNumber || '-'}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>No:</strong> ${d.receiptNumber || d.receipt_number}</p>
              <p><strong>Date:</strong> ${format(new Date(d.date), 'dd MMM yyyy')}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Gross</th>
                <th class="text-right">Net</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(d.items || []).map((item: any) => `
                <tr>
                  <td>${item.itemName || item.item_name}</td>
                  <td class="text-right">${item.qty}</td>
                  <td class="text-right">${item.grossWeight || item.gross_weight}</td>
                  <td class="text-right">${item.netWeight || item.net_weight}</td>
                  <td class="text-right">₹${item.rate}</td>
                  <td class="text-right">₹${item.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="display: flex; justify-content: space-between;">
            <div style="width: 50%;">
              <p style="font-size: 0.85em;"><strong>Notes:</strong> ${d.notes || '-'}</p>
              <p style="font-size: 0.85em;"><strong>Mode:</strong> ${d.paymentMode || d.payment_mode}</p>
              <p style="font-size: 0.85em;"><strong>Received:</strong> ₹${(d.amountReceived || d.amount_received).toLocaleString()}</p>
            </div>
            <div class="totals">
              <div class="totals-row"><span>Subtotal:</span><span>₹${(d.firstTotal || d.first_total).toLocaleString()}</span></div>
              <div class="totals-row"><span>Cooli:</span><span>-₹${d.cooli.toLocaleString()}</span></div>
              <div class="totals-row"><span>Rent:</span><span>-₹${d.rent.toLocaleString()}</span></div>
              <div class="totals-row"><span>Padi:</span><span>-₹${d.padi.toLocaleString()}</span></div>
              <div class="totals-row"><span>Loading:</span><span>-₹${(d.loadingCharge || d.loading_charge).toLocaleString()}</span></div>
              <div class="totals-row"><span>Comm (${d.commissionPercent || d.commission_percent}%):</span><span>-₹${(d.commission || ((d.first_total * d.commission_percent) / 100 || 0)).toLocaleString()}</span></div>
              <div class="totals-row grand-total"><span>Final Payable:</span><span>₹${(d.finalTotal || d.final_total).toLocaleString()}</span></div>
            </div>
          </div>
          <div class="footer">
            <div class="signature">Authorized Signatory</div>
            <div class="signature">Vendor Signature</div>
          </div>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    const handleSave = async (andPrint = false) => {
        if (!selectedVendor) {
            toast.error("Please select a vendor");
            return;
        }

        const receiptData = {
            vendor_id: selectedVendor,
            receipt_number: receiptNumber,
            date,
            vehicle_number: vehicleNumber,
            notes,
            payment_mode: paymentMode,
            amount_received: amountReceived,
            cooli,
            rent,
            padi,
            loading_charge: loadingCharge,
            commission_percent: commissionPercent,
            first_total: firstTotal,
            final_total: finalTotal,
        };

        const itemsData = items.map(it => ({
            product_id: it.productId || null,
            item_name: it.itemName,
            qty: it.qty,
            gross_weight: it.grossWeight,
            net_weight: it.netWeight,
            rate: it.rate,
            amount: it.amount
        }));

        try {
            if (isEditing) {
                await updateReceipt.mutateAsync({ id: isEditing, receipt: receiptData, items: itemsData });
            } else {
                await createReceipt.mutateAsync({ receipt: receiptData, items: itemsData });
            }

            if (andPrint) {
                handlePrint();
            }

            if (!isEditing) resetForm();
            else setIsEditing(null);

        } catch (error) {
            // Error handled by mutation
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl sm:max-h-[95vh] sm:overflow-y-auto w-full p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Vendor Receipts
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
                    <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
                        <TabsTrigger value="create" className="gap-2">
                            {isEditing ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {isEditing ? 'Edit Receipt' : 'New Receipt'}
                        </TabsTrigger>
                        <TabsTrigger value="saved" className="gap-2">
                            <FolderOpen className="w-4 h-4" />
                            Saved Receipts ({receipts.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="saved">
                        {isLoadingSaved ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                            </div>
                        ) : receipts.length > 0 ? (
                            <div className="border rounded-xl overflow-hidden bg-background shadow-md border-primary/10">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 border-b border-primary/10">
                                            <TableHead className="font-bold text-slate-700">Date</TableHead>
                                            <TableHead className="font-bold text-slate-700">Receipt #</TableHead>
                                            <TableHead className="font-bold text-slate-700">Vendor</TableHead>
                                            <TableHead className="font-bold text-slate-700">Vehicle</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Final Payable</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {receipts.map((r) => (
                                            <TableRow key={r.id} className="hover:bg-primary/5 transition-colors border-b last:border-0 border-slate-100">
                                                <TableCell className="text-sm">{format(new Date(r.date), 'dd MMM yyyy')}</TableCell>
                                                <TableCell className="font-bold text-primary text-sm">{r.receipt_number}</TableCell>
                                                <TableCell className="font-medium text-sm">{r.vendors?.name || '-'}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{r.vehicle_number || '-'}</TableCell>
                                                <TableCell className="text-right font-black text-primary text-sm tabular-nums">₹{r.final_total.toLocaleString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-1 justify-end">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-primary hover:bg-primary/10" onClick={() => handleEdit(r.id)} title="Edit">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                                                            onClick={async () => {
                                                                const full = await getReceiptWithItems(r.id);
                                                                if (full) handlePrint(full);
                                                            }}
                                                            title="Print"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => {
                                                                if (confirm('Delete this receipt?')) deleteReceipt.mutate(r.id);
                                                            }}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-20 border-2 border-dashed rounded-xl border-slate-200 bg-slate-50/50">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                    <FolderOpen className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">No Receipts Yet</h3>
                                <p className="text-slate-500 max-w-xs mx-auto mt-2">
                                    Start by creating a new vendor receipt from the create tab.
                                </p>
                                <Button variant="outline" className="mt-6 gap-2" onClick={() => setActiveTab('create')}>
                                    <Plus className="w-4 h-4" /> Create First Receipt
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="create" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label>Select Vendor *</Label>
                                <SearchableSelect
                                    value={selectedVendor}
                                    onValueChange={setSelectedVendor}
                                    options={vendors.map((v) => ({ value: v.id, label: v.name }))}
                                    placeholder="Select vendor"
                                    searchPlaceholder="Search vendors..."
                                    emptyMessage="No vendors found."
                                />
                            </div>
                            <div className="space-y-1 text-sm">
                                <Label className="text-xs">Previous Balance to Pay (from vendor receipts)</Label>
                                <div className="px-3 py-2 rounded-md border text-sm flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                        {selectedVendorData?.name || 'Select a vendor'}
                                    </span>
                                    <span
                                        className={
                                            selectedVendorReceiptBalance > 0
                                                ? 'font-semibold text-amber-600'
                                                : selectedVendorReceiptBalance < 0
                                                    ? 'font-semibold text-emerald-600'
                                                    : 'text-xs text-muted-foreground'
                                        }
                                    >
                                        {selectedVendor
                                            ? `₹${Math.abs(selectedVendorReceiptBalance).toLocaleString()} ${
                                                  selectedVendorReceiptBalance > 0
                                                      ? 'Payable'
                                                      : selectedVendorReceiptBalance < 0
                                                          ? 'Advance'
                                                          : ''
                                              }`
                                            : '-'}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Receipt Number</Label>
                                <Input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                            </div>
                        </div>

                        {/* Items - desktop table */}
                        <div className="border rounded-xl overflow-hidden bg-background shadow-sm border-primary/10 hidden md:block">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 border-b border-primary/10">
                                            <TableHead className="w-[280px] font-bold text-slate-700">Item / Product</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Qty</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Gross Wt</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Net Wt</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Rate</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Amount</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-primary/5 transition-colors border-b border-slate-100 last:border-0">
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <SearchableSelect
                                                            value={item.productId}
                                                            onValueChange={(val) => updateItem(item.id, 'productId', val)}
                                                            options={products.map(p => ({ value: p.id, label: p.name }))}
                                                            placeholder="Search product..."
                                                            className="h-8 text-xs border-slate-200"
                                                        />
                                                        <Input
                                                            value={item.itemName}
                                                            onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                                                            placeholder="Custom name if needed"
                                                            className="h-7 text-[10px] bg-transparent border-dashed border-slate-200 focus:border-primary text-muted-foreground"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        className="text-right border-slate-200 focus:border-primary h-8"
                                                        value={item.qty || ''}
                                                        onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        className="text-right border-slate-200 focus:border-primary h-8 font-mono text-xs"
                                                        value={item.grossWeight || ''}
                                                        onChange={(e) => updateItem(item.id, 'grossWeight', parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        className="text-right border-slate-200 focus:border-primary h-8 font-mono text-xs"
                                                        value={item.netWeight || ''}
                                                        onChange={(e) => updateItem(item.id, 'netWeight', parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        className="text-right border-slate-200 focus:border-primary h-8"
                                                        value={item.rate || ''}
                                                        onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-slate-800 tabular-nums">
                                                    ₹{item.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="p-3 border-t flex justify-start bg-slate-50/50">
                                <Button variant="outline" size="sm" onClick={addItem} className="gap-2 h-8 text-xs border-primary/20 hover:bg-primary/10 hover:text-primary transition-all shadow-sm">
                                    <Plus className="w-4 h-4" /> Add Line Item
                                </Button>
                            </div>
                        </div>

                        {/* Items - mobile friendly cards */}
                        <div className="border rounded-xl bg-background shadow-sm border-primary/10 space-y-3 p-3 md:hidden">
                            <div className="flex items-center justify-between mb-1">
                                <Label className="text-xs font-semibold text-muted-foreground">Items</Label>
                                <Button variant="outline" size="sm" onClick={addItem} className="gap-1 h-7 text-[11px]">
                                    <Plus className="w-3 h-3" /> Line
                                </Button>
                            </div>
                            {items.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="rounded-lg border border-primary/10 bg-slate-50/70 p-3 space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-muted-foreground">
                                            Item #{index + 1}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => removeItem(item.id)}
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        <SearchableSelect
                                            value={item.productId}
                                            onValueChange={(val) => updateItem(item.id, 'productId', val)}
                                            options={products.map(p => ({ value: p.id, label: p.name }))}
                                            placeholder="Search product..."
                                            className="h-8 text-xs border-slate-200"
                                        />
                                        <Input
                                            value={item.itemName}
                                            onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                                            placeholder="Custom name if needed"
                                            className="h-7 text-[11px] bg-transparent border-dashed border-slate-200 focus:border-primary text-muted-foreground"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">Qty</Label>
                                            <Input
                                                type="number"
                                                className="h-8 text-right text-xs"
                                                value={item.qty || ''}
                                                onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">Rate</Label>
                                            <Input
                                                type="number"
                                                className="h-8 text-right text-xs"
                                                value={item.rate || ''}
                                                onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">Gross Wt</Label>
                                            <Input
                                                type="number"
                                                className="h-8 text-right text-xs"
                                                value={item.grossWeight || ''}
                                                onChange={(e) => updateItem(item.id, 'grossWeight', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">Net Wt</Label>
                                            <Input
                                                type="number"
                                                className="h-8 text-right text-xs"
                                                value={item.netWeight || ''}
                                                onChange={(e) => updateItem(item.id, 'netWeight', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-primary/10 mt-1">
                                        <span className="text-[11px] text-muted-foreground">Line Total</span>
                                        <span className="text-sm font-semibold text-primary">
                                            ₹{item.amount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-4 border-t">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Vehicle Number</Label>
                                        <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="ABC-1234" className="h-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Payment Mode</Label>
                                        <Select value={paymentMode} onValueChange={setPaymentMode}>
                                            <SelectTrigger className="h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                                <SelectItem value="Cheque">Cheque</SelectItem>
                                                <SelectItem value="UPI">UPI</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Amount Received</Label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                        <Input type="number" value={amountReceived || ''} onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)} placeholder="0.00" className="h-8 pl-8" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Notes</Label>
                                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes here..." rows={2} className="resize-none text-xs" />
                                </div>
                            </div>

                            <div className="bg-primary/5 p-4 rounded-lg space-y-3 md:sticky md:top-20">
                                <div className="flex justify-between items-center pb-2 border-b border-primary/10">
                                    <span className="text-sm font-medium">Subtotal</span>
                                    <span className="font-bold">₹{firstTotal.toLocaleString()}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold">Cooli</Label>
                                        <Input type="number" className="h-7 text-right text-xs" value={cooli || ''} onChange={(e) => setCooli(parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold">Rent</Label>
                                        <Input type="number" className="h-7 text-right text-xs" value={rent || ''} onChange={(e) => setRent(parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold">Padi</Label>
                                        <Input type="number" className="h-7 text-right text-xs" value={padi || ''} onChange={(e) => setPadi(parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold">Loading</Label>
                                        <Input type="number" className="h-7 text-right text-xs" value={loadingCharge || ''} onChange={(e) => setLoadingCharge(parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold mb-1">
                                            <Label>Commission ({commissionPercent}%)</Label>
                                            <span className="font-mono text-destructive">-₹{commission.toLocaleString()}</span>
                                        </div>
                                        <Input type="number" className="h-7 text-right text-xs" value={commissionPercent || ''} onChange={(e) => setCommissionPercent(parseFloat(e.target.value) || 0)} />
                                    </div>
                                </div>

                                <div className="pt-3 mt-1 border-t-2 border-primary/20">
                                    <div className="flex justify-between items-center text-xl font-black text-primary drop-shadow-sm">
                                        <span>Final Payable</span>
                                        <span className="font-mono tabular-nums">₹{finalTotal.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button className="flex-1 gap-2 h-9 text-xs"
                                        onClick={() => handleSave(false)}
                                        disabled={createReceipt.isPending || updateReceipt.isPending}
                                    >
                                        <Save className="w-4 h-4" />
                                        {isEditing ? 'Update' : 'Save'}
                                    </Button>
                                    <Button className="flex-1 gap-2 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => handleSave(true)}
                                        disabled={createReceipt.isPending || updateReceipt.isPending}
                                    >
                                        <Printer className="w-4 h-4" /> Save & Print
                                    </Button>
                                </div>
                                {isEditing && (
                                    <Button variant="ghost" className="w-full text-xs h-8" onClick={resetForm}>
                                        Cancel Edit / New Receipt
                                    </Button>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
