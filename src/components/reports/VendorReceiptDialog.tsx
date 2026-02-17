import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useVendors } from '@/hooks/useVendors';
import { useProducts } from '@/hooks/useProducts';
import { format } from 'date-fns';
import { Printer, Plus, Trash2, Save, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VendorReceiptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ReceiptItem {
    id: string;
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

    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [receiptNumber, setReceiptNumber] = useState<string>(`VR-${Date.now().toString().slice(-6)}`);
    const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [vehicleNumber, setVehicleNumber] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [paymentMode, setPaymentMode] = useState<string>('Cash');
    const [amountReceived, setAmountReceived] = useState<number>(0);

    // Items table
    const [items, setItems] = useState<ReceiptItem[]>([
        { id: '1', itemName: '', qty: 0, grossWeight: 0, netWeight: 0, rate: 0, amount: 0 }
    ]);

    // Adjustments
    const [cooli, setCooli] = useState<number>(0);
    const [rent, setRent] = useState<number>(0);
    const [padi, setPadi] = useState<number>(0);
    const [loadingCharge, setLoadingCharge] = useState<number>(0);
    const [commissionPercent, setCommissionPercent] = useState<number>(10); // Default 10%

    const selectedVendorData = vendors.find(v => v.id === selectedVendor);

    const addItem = () => {
        setItems([...items, { id: Date.now().toString(), itemName: '', qty: 0, grossWeight: 0, netWeight: 0, rate: 0, amount: 0 }]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const updateItem = (id: string, field: keyof ReceiptItem, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                // Recalculate amount if rate or weight changes
                if (field === 'rate' || field === 'netWeight') {
                    updatedItem.amount = (updatedItem.netWeight || 0) * (updatedItem.rate || 0);
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const firstTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const commission = (firstTotal * commissionPercent) / 100;

    // Final total after adjustments
    // Adjustments can be added or reduced. Usually these are expenses for vendor, so they reduce amount payable to vendor? 
    // User said "reduced/add colums". I'll provide +/- toggles or just let them enter negative values.
    // Standard in this business: Gross - (expenses) = Final
    const finalTotal = firstTotal - cooli - rent - padi - loadingCharge - commission;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
      <html>
        <head>
          <title>Vendor Receipt - ${receiptNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
            .receipt-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f9f9f9; }
            .totals { float: right; width: 300px; }
            .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .grand-total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${company?.name || 'Company Name'}</h1>
            <p>Vendor Receipt</p>
          </div>
          <div class="receipt-info">
            <div>
              <p><strong>Vendor:</strong> ${selectedVendorData?.name || '-'}</p>
              <p><strong>Vehicle:</strong> ${vehicleNumber || '-'}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Receipt #:</strong> ${receiptNumber}</p>
              <p><strong>Date:</strong> ${format(new Date(date), 'dd MMM yyyy')}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Gross Wt</th>
                <th>Net Wt</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.itemName}</td>
                  <td>${item.qty}</td>
                  <td>${item.grossWeight}</td>
                  <td>${item.netWeight}</td>
                  <td>₹${item.rate}</td>
                  <td>₹${item.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="display: flex; justify-content: space-between;">
            <div style="width: 45%;">
              <p><strong>Notes:</strong> ${notes || '-'}</p>
              <p><strong>Payment Mode:</strong> ${paymentMode}</p>
              <p><strong>Amount Received:</strong> ₹${amountReceived.toLocaleString()}</p>
            </div>
            <div class="totals">
              <div class="totals-row">
                <span>First Total:</span>
                <span>₹${firstTotal.toLocaleString()}</span>
              </div>
              <div class="totals-row">
                <span>Cooli:</span>
                <span>-₹${cooli.toLocaleString()}</span>
              </div>
              <div class="totals-row">
                <span>Rent:</span>
                <span>-₹${rent.toLocaleString()}</span>
              </div>
              <div class="totals-row">
                <span>Padi:</span>
                <span>-₹${padi.toLocaleString()}</span>
              </div>
              <div class="totals-row">
                <span>Loading Charge:</span>
                <span>-₹${loadingCharge.toLocaleString()}</span>
              </div>
              <div class="totals-row">
                <span>Commission (${commissionPercent}%):</span>
                <span>-₹${commission.toLocaleString()}</span>
              </div>
              <div class="totals-row grand-total">
                <span>Final Total:</span>
                <span>₹${finalTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div class="footer">
            <p>_____________________<br>Authorized Signatory</p>
            <p>_____________________<br>Vendor Signature</p>
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

    const handleSave = () => {
        // Since we don't have a dedicated table yet, we can't save to DB easily without modifications
        // For now, we'll just show a success message and allow printing
        toast.success("Receipt generated successfully! Use Print to save a copy.");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        New Vendor Receipt
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                    <div className="space-y-2">
                        <Label>Receipt Number</Label>
                        <Input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                </div>

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden mb-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Item Name</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <th className="px-4 py-3 text-right">Gross Wt</th>
                                <th className="px-4 py-3 text-right">Net Wt</th>
                                <th className="px-4 py-3 text-right">Rate</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                                <th className="w-[50px]"></th>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Input
                                            value={item.itemName}
                                            onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                                            placeholder="Item name..."
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="text-right"
                                            value={item.qty || ''}
                                            onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="text-right"
                                            value={item.grossWeight || ''}
                                            onChange={(e) => updateItem(item.id, 'grossWeight', parseFloat(e.target.value) || 0)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="text-right"
                                            value={item.netWeight || ''}
                                            onChange={(e) => updateItem(item.id, 'netWeight', parseFloat(e.target.value) || 0)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="text-right"
                                            value={item.rate || ''}
                                            onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ₹{item.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="p-2 border-t flex justify-start">
                        <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                            <Plus className="w-4 h-4" /> Add Item
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
                    {/* Left Side: Additional Info */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Vehicle Number</Label>
                                <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="ABC-1234" />
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Mode</Label>
                                <Select value={paymentMode} onValueChange={setPaymentMode}>
                                    <SelectTrigger>
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
                            <Label>Amount Received (Recvided)</Label>
                            <Input type="number" value={amountReceived || ''} onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)} placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes here..." rows={3} />
                        </div>
                    </div>

                    {/* Right Side: Totals & Adjustments */}
                    <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b">
                            <span className="font-semibold">First Total</span>
                            <span className="font-bold">₹{firstTotal.toLocaleString()}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase">Cooli</Label>
                                <Input type="number" size={1} className="h-8 text-right" value={cooli || ''} onChange={(e) => setCooli(parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase">Rent</Label>
                                <Input type="number" size={1} className="h-8 text-right" value={rent || ''} onChange={(e) => setRent(parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase">Padi</Label>
                                <Input type="number" size={1} className="h-8 text-right" value={padi || ''} onChange={(e) => setPadi(parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase">Loading Charge</Label>
                                <Input type="number" size={1} className="h-8 text-right" value={loadingCharge || ''} onChange={(e) => setLoadingCharge(parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="space-y-1 col-span-2">
                                <div className="flex justify-between text-xs text-muted-foreground uppercase mb-1">
                                    <Label>Commission (%)</Label>
                                    <span className="font-mono text-destructive">-₹{commission.toLocaleString()}</span>
                                </div>
                                <Input type="number" size={1} className="h-8 text-right" value={commissionPercent || ''} onChange={(e) => setCommissionPercent(parseFloat(e.target.value) || 0)} />
                            </div>
                        </div>

                        <div className="pt-4 mt-2 border-t-2 border-primary/20">
                            <div className="flex justify-between items-center text-xl font-bold text-primary">
                                <span>Final Total</span>
                                <span>₹{finalTotal.toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 text-right italic">
                                (First Total - Adjustments - Commission)
                            </p>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button className="flex-1 gap-2" onClick={handleSave}>
                                <Save className="w-4 h-4" /> Save
                            </Button>
                            <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
                                <Printer className="w-4 h-4" /> Print
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
