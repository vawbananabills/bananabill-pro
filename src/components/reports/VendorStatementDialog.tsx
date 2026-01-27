import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVendors } from '@/hooks/useVendors';
import { useProducts } from '@/hooks/useProducts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, Loader2, Download, Truck, Printer, FileDown, Eye, Save, Trash2, Edit, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VendorStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVendorId?: string | null;
}

export function VendorStatementDialog({ open, onOpenChange, initialVendorId }: VendorStatementDialogProps) {
  const { company, user } = useAuth();
  const { vendors } = useVendors();
  const { products } = useProducts();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('create');
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [selectedVendor, setSelectedVendor] = useState<string>(initialVendorId || '');

  // Sync with initialVendorId when dialog opens
  useEffect(() => {
    if (initialVendorId && open) {
      setSelectedVendor(initialVendorId);
    }
  }, [initialVendorId, open]);
  const [rent, setRent] = useState<number>(0);
  const [rentIsAddition, setRentIsAddition] = useState<boolean>(false);
  const [otherExpenses, setOtherExpenses] = useState<number>(0);
  const [otherExpensesIsAddition, setOtherExpensesIsAddition] = useState<boolean>(false);
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [loaderName, setLoaderName] = useState<string>('');
  const [load, setLoad] = useState<number>(0);
  const [mt, setMt] = useState<number>(0);
  const printRef = useRef<HTMLDivElement>(null);
  const [detailViewProduct, setDetailViewProduct] = useState<string | null>(null);
  const [editingStatementId, setEditingStatementId] = useState<string | null>(null);

  const selectedVendorData = vendors.find(v => v.id === selectedVendor);

  const { data: vendorItems, isLoading } = useQuery({
    queryKey: ['vendor-statement', company?.id, selectedVendor, dateFrom, dateTo],
    queryFn: async () => {
      if (!company?.id || !selectedVendor) return [];

      // Fetch invoice items with invoice date and product name
      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          *,
          products(name),
          invoices!inner(date, company_id)
        `)
        .eq('vendor_id', selectedVendor)
        .eq('invoices.company_id', company.id)
        .gte('invoices.date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('invoices.date', format(dateTo, 'yyyy-MM-dd'))
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: open && !!company?.id && !!selectedVendor,
  });

  // Fetch saved statements
  const { data: savedStatements, isLoading: isLoadingSaved } = useQuery({
    queryKey: ['vendor-statements', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('vendor_statements')
        .select('*, vendors(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!company?.id,
  });

  // Save statement mutation
  const saveStatementMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id || !selectedVendor || !user?.id) throw new Error('Missing required data');
      
      const statementData = {
        company_id: company.id,
        vendor_id: selectedVendor,
        date_from: format(dateFrom, 'yyyy-MM-dd'),
        date_to: format(dateTo, 'yyyy-MM-dd'),
        vehicle_number: vehicleNumber || null,
        loader_name: loaderName || null,
        load: load,
        mt: mt,
        rent: rent,
        rent_is_addition: rentIsAddition,
        other_expenses: otherExpenses,
        other_expenses_is_addition: otherExpensesIsAddition,
        total_items: totalItems,
        total_gross_weight: totalGrossWeight,
        total_net_weight: totalNetWeight,
        total_amount: totalAmount,
        final_total: finalTotal,
        created_by: user.id,
      };

      if (editingStatementId) {
        const { error } = await supabase
          .from('vendor_statements')
          .update(statementData)
          .eq('id', editingStatementId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendor_statements')
          .insert(statementData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-statements'] });
      toast.success(editingStatementId ? 'Statement updated successfully' : 'Statement saved successfully');
      setEditingStatementId(null);
    },
    onError: (error) => {
      toast.error('Failed to save statement: ' + error.message);
    },
  });

  // Delete statement mutation
  const deleteStatementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vendor_statements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-statements'] });
      toast.success('Statement deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete statement: ' + error.message);
    },
  });

  const loadStatement = (statement: any) => {
    setSelectedVendor(statement.vendor_id);
    setDateFrom(new Date(statement.date_from));
    setDateTo(new Date(statement.date_to));
    setVehicleNumber(statement.vehicle_number || '');
    setLoaderName(statement.loader_name || '');
    setLoad(statement.load || 0);
    setMt(statement.mt || 0);
    setRent(statement.rent || 0);
    setRentIsAddition(statement.rent_is_addition || false);
    setOtherExpenses(statement.other_expenses || 0);
    setOtherExpensesIsAddition(statement.other_expenses_is_addition || false);
    setEditingStatementId(statement.id);
    setActiveTab('create');
  };

  const resetForm = () => {
    setSelectedVendor('');
    setDateFrom(startOfMonth(new Date()));
    setDateTo(endOfMonth(new Date()));
    setVehicleNumber('');
    setLoaderName('');
    setLoad(0);
    setMt(0);
    setRent(0);
    setRentIsAddition(false);
    setOtherExpenses(0);
    setOtherExpensesIsAddition(false);
    setEditingStatementId(null);
  };

  // Calculate adjusted gross weight (gross_weight - benches_weight)
  const getAdjustedGrossWeight = (item: any) => {
    const grossWeight = item.gross_weight || 0;
    const benchesWeight = item.benches_weight || 0;
    return grossWeight - benchesWeight;
  };

  // Group items by product name and aggregate values, also store individual items
  const groupedItems = vendorItems?.reduce((acc: Record<string, { name: string; quantity: number; grossWeight: number; netWeight: number; total: number; items: any[] }>, item: any) => {
    const productName = item.products?.name || 'Unknown';
    if (!acc[productName]) {
      acc[productName] = {
        name: productName,
        quantity: 0,
        grossWeight: 0,
        netWeight: 0,
        total: 0,
        items: [],
      };
    }
    acc[productName].quantity += item.quantity || 0;
    acc[productName].grossWeight += getAdjustedGrossWeight(item);
    acc[productName].netWeight += item.net_weight || 0;
    acc[productName].total += item.total || 0;
    acc[productName].items.push(item);
    return acc;
  }, {}) || {};

  const aggregatedItems = Object.values(groupedItems);

  // Get detail items for the selected product
  const detailItems = detailViewProduct ? (groupedItems[detailViewProduct]?.items || []) : [];

  const totalAmount = vendorItems?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
  const totalNetWeight = vendorItems?.reduce((sum, item) => sum + (item.net_weight || 0), 0) || 0;
  const totalItems = vendorItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  const totalGrossWeight = vendorItems?.reduce((sum, item) => sum + getAdjustedGrossWeight(item), 0) || 0;
  const rentAdjustment = rentIsAddition ? rent : -rent;
  const otherExpensesAdjustment = otherExpensesIsAddition ? otherExpenses : -otherExpenses;
  const finalTotal = totalAmount + rentAdjustment + otherExpensesAdjustment;
  const loadMtTotal = load - mt - totalGrossWeight;

  const handleExport = () => {
    if (!vendorItems) return;
    
    const csvContent = [
      ['Date', 'Item Name', 'No. of Items', 'Gross Weight (kg)', 'Net Weight (kg)', 'Total'].join(','),
      ...vendorItems.map((item: any) => 
        [
          item.invoices?.date || '',
          item.products?.name || '',
          item.quantity || 0,
          getAdjustedGrossWeight(item).toFixed(2),
          item.net_weight || 0,
          item.total || 0
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-statement-${selectedVendorData?.name || 'vendor'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const generatePrintContent = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vendor Statement - ${selectedVendorData?.name || 'Vendor'}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
          .container { max-width: 100%; padding: 0; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .header h1 { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
          .header p { font-size: 11px; color: #666; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
          .info-box { background: #f9f9f9; padding: 10px; border-radius: 4px; border: 1px solid #ddd; }
          .info-box h3 { font-size: 12px; font-weight: bold; margin-bottom: 5px; color: #555; }
          .info-box p { font-size: 11px; margin: 2px 0; }
          .calc-box { background: #e8f4fd; padding: 12px; border-radius: 4px; border: 2px solid #3b82f6; margin-bottom: 15px; }
          .calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; }
          .calc-item label { font-size: 10px; color: #666; display: block; margin-bottom: 3px; }
          .calc-item .value { font-size: 14px; font-weight: bold; }
          .calc-item.total .value { color: ${loadMtTotal >= 0 ? '#16a34a' : '#dc2626'}; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; }
          .summary-card { background: #f9f9f9; padding: 10px; border-radius: 4px; border: 1px solid #ddd; text-align: center; }
          .summary-card label { font-size: 10px; color: #666; display: block; }
          .summary-card .value { font-size: 16px; font-weight: bold; color: #3b82f6; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
          th { background: #f3f4f6; font-weight: bold; }
          .text-right { text-align: right; }
          .totals { background: #f0f9ff; }
          .expenses-section { background: #fafafa; padding: 12px; border-radius: 4px; border: 1px solid #ddd; }
          .expense-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 11px; }
          .expense-row.total { border-top: 2px solid #333; margin-top: 8px; padding-top: 8px; font-weight: bold; font-size: 14px; }
          .text-green { color: #16a34a; }
          .text-red { color: #dc2626; }
          .final-total { background: #3b82f6; color: white; padding: 12px; border-radius: 4px; text-align: center; margin-top: 15px; }
          .final-total label { font-size: 12px; opacity: 0.9; }
          .final-total .value { font-size: 24px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${company?.name || 'Company'}</h1>
            <p>${company?.address || ''} ${company?.phone ? '| ' + company.phone : ''}</p>
            <p style="margin-top: 10px; font-size: 14px; font-weight: bold;">VENDOR STATEMENT</p>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <h3>Vendor Details</h3>
              <p><strong>${selectedVendorData?.name || '-'}</strong></p>
              <p>${selectedVendorData?.phone || ''}</p>
              <p>${selectedVendorData?.address || ''}</p>
            </div>
            <div class="info-box">
              <h3>Statement Period</h3>
              <p><strong>From:</strong> ${format(dateFrom, 'dd MMM yyyy')}</p>
              <p><strong>To:</strong> ${format(dateTo, 'dd MMM yyyy')}</p>
              ${vehicleNumber ? `<p><strong>Vehicle:</strong> ${vehicleNumber}</p>` : ''}
              ${loaderName ? `<p><strong>Loader:</strong> ${loaderName}</p>` : ''}
            </div>
          </div>

          <div class="calc-box">
            <div class="calc-grid">
              <div class="calc-item">
                <label>Load</label>
                <div class="value">${load.toFixed(2)} kg</div>
              </div>
              <div class="calc-item">
                <label>MT</label>
                <div class="value">${mt.toFixed(2)} kg</div>
              </div>
              <div class="calc-item">
                <label>Gross Weight</label>
                <div class="value">${totalGrossWeight.toFixed(2)} kg</div>
              </div>
              <div class="calc-item total">
                <label>Total (Load − MT − Gross)</label>
                <div class="value">${loadMtTotal.toFixed(2)} kg</div>
              </div>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <label>Total Items</label>
              <div class="value">${totalItems}</div>
            </div>
            <div class="summary-card">
              <label>Total Net Weight</label>
              <div class="value">${totalNetWeight.toLocaleString()} kg</div>
            </div>
            <div class="summary-card">
              <label>Total Amount</label>
              <div class="value">₹${totalAmount.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th class="text-right">No. of Items</th>
                <th class="text-right">Gross Weight (kg)</th>
                <th class="text-right">Net Weight (kg)</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${aggregatedItems.length > 0 ? aggregatedItems.map((item: any) => `
                <tr>
                  <td>${item.name}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${item.grossWeight.toFixed(2)}</td>
                  <td class="text-right">${item.netWeight.toFixed(2)}</td>
                  <td class="text-right">₹${item.total.toLocaleString()}</td>
                </tr>
              `).join('') : '<tr><td colspan="5" style="text-align:center;">No items found</td></tr>'}
              <tr class="totals">
                <td><strong>Total</strong></td>
                <td class="text-right"><strong>${totalItems}</strong></td>
                <td class="text-right"><strong>${totalGrossWeight.toFixed(2)}</strong></td>
                <td class="text-right"><strong>${totalNetWeight.toFixed(2)}</strong></td>
                <td class="text-right"><strong>₹${totalAmount.toLocaleString()}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="expenses-section">
            <div class="expense-row">
              <span>Items Total</span>
              <span>₹${totalAmount.toLocaleString()}</span>
            </div>
            ${rent > 0 ? `
              <div class="expense-row">
                <span>Rent ${rentIsAddition ? '(+)' : '(-)'}</span>
                <span class="${rentIsAddition ? 'text-green' : 'text-red'}">${rentIsAddition ? '+' : '-'}₹${rent.toLocaleString()}</span>
              </div>
            ` : ''}
            ${otherExpenses > 0 ? `
              <div class="expense-row">
                <span>Other Expenses ${otherExpensesIsAddition ? '(+)' : '(-)'}</span>
                <span class="${otherExpensesIsAddition ? 'text-green' : 'text-red'}">${otherExpensesIsAddition ? '+' : '-'}₹${otherExpenses.toLocaleString()}</span>
              </div>
            ` : ''}
            <div class="expense-row total">
              <span>Final Total</span>
              <span>₹${finalTotal.toLocaleString()}</span>
            </div>
          </div>

          <div class="final-total">
            <label>Final Total Amount</label>
            <div class="value">₹${finalTotal.toLocaleString()}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintContent());
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintContent());
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        // User can save as PDF from print dialog
      }, 250);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Vendor Statement
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="gap-2">
              {editingStatementId ? <Edit className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
              {editingStatementId ? 'Edit Statement' : 'Create Statement'}
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Saved Statements ({savedStatements?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="mt-4">
            {isLoadingSaved ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : savedStatements && savedStatements.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Gross Wt (kg)</TableHead>
                      <TableHead className="text-right">Net Wt (kg)</TableHead>
                      <TableHead className="text-right">Final Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedStatements.map((statement: any) => (
                      <TableRow key={statement.id}>
                        <TableCell className="font-medium">{statement.vendors?.name || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(statement.date_from), 'dd MMM')} - {format(new Date(statement.date_to), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>{statement.vehicle_number || '-'}</TableCell>
                        <TableCell className="text-right">{statement.total_items || 0}</TableCell>
                        <TableCell className="text-right">{statement.total_gross_weight?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="text-right">{statement.total_net_weight?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="text-right font-medium">₹{statement.final_total?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => loadStatement(statement)}
                              title="View/Edit"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this statement?')) {
                                  deleteStatementMutation.mutate(statement.id);
                                }
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
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No saved statements yet</p>
                <p className="text-sm">Create a statement and save it to view here</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Select Vendor *</label>
                <SearchableSelect
                  value={selectedVendor}
                  onValueChange={setSelectedVendor}
                  options={vendors.map((v) => ({ value: v.id, label: v.name }))}
                  placeholder="Select vendor"
                  searchPlaceholder="Search vendors..."
                  emptyMessage="No vendors found."
                  className="w-[200px]"
                />
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

              <div className="flex gap-2 ml-auto">
                {editingStatementId && (
                  <Button variant="outline" onClick={resetForm} className="gap-2">
                    New
                  </Button>
                )}
                <Button variant="outline" onClick={handleExport} className="gap-2">
                  <Download className="w-4 h-4" />
                  CSV
                </Button>
                <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                  <FileDown className="w-4 h-4" />
                  A4 Download
                </Button>
                <Button variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              </div>
            </div>

        {!selectedVendor ? (
          <div className="text-center py-12 text-muted-foreground">
            Please select a vendor to view their statement
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Vehicle & Loader Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="Enter vehicle number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loaderName">Loader Name</Label>
                <Input
                  id="loaderName"
                  value={loaderName}
                  onChange={(e) => setLoaderName(e.target.value)}
                  placeholder="Enter loader name"
                />
              </div>
            </div>

            {/* Load/MT Calculation Box */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="load">Load</Label>
                    <Input
                      id="load"
                      type="number"
                      min="0"
                      step="0.01"
                      value={load || ''}
                      onChange={(e) => setLoad(Number(e.target.value) || 0)}
                      placeholder="Enter load"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mt">MT</Label>
                    <Input
                      id="mt"
                      type="number"
                      min="0"
                      step="0.01"
                      value={mt || ''}
                      onChange={(e) => setMt(Number(e.target.value) || 0)}
                      placeholder="Enter MT"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Gross Weight (Auto)</Label>
                    <div className="h-10 px-3 py-2 border rounded-md bg-muted font-mono flex items-center">
                      {totalGrossWeight.toFixed(2)} kg
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Total (Load − MT − Gross)</Label>
                    <div className={cn(
                      "h-10 px-3 py-2 border-2 rounded-md font-mono font-bold flex items-center",
                      loadMtTotal >= 0 ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700"
                    )}>
                      {loadMtTotal.toFixed(2)} kg
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="md:col-span-2">
                <CardContent className="pt-4">
                  <div className="text-lg font-semibold">{selectedVendorData?.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedVendorData?.phone}</div>
                  <div className="text-sm text-muted-foreground">{selectedVendorData?.address}</div>
                </CardContent>
            </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Items</div>
                  <div className="text-xl font-bold">{totalItems}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Gross Weight (kg)</div>
                  <div className="text-xl font-bold">{totalGrossWeight.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Net Weight (kg)</div>
                  <div className="text-xl font-bold">{totalNetWeight.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                  <div className="text-xl font-bold text-primary">₹{totalAmount.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Items Table */}
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">No. of Items</TableHead>
                    <TableHead className="text-right">Gross Weight (kg)</TableHead>
                    <TableHead className="text-right">Net Weight (kg)</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregatedItems.map((item: any, index: number) => (
                    <TableRow key={item.name + index}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDetailViewProduct(item.name)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.grossWeight.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.netWeight.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">₹{item.total.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {aggregatedItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No items found for selected period
                      </TableCell>
                    </TableRow>
                  )}
                  {aggregatedItems.length > 0 && (
                    <TableRow className="bg-muted/50 font-semibold border-t-2">
                      <TableCell></TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{totalItems}</TableCell>
                      <TableCell className="text-right">{totalGrossWeight.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{totalNetWeight.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{totalAmount.toLocaleString()}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Detail View Dialog */}
            <Dialog open={!!detailViewProduct} onOpenChange={(open) => !open && setDetailViewProduct(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    {detailViewProduct} - Detailed Breakdown
                  </DialogTitle>
                </DialogHeader>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Gross Wt (kg)</TableHead>
                        <TableHead className="text-right">Net Wt (kg)</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailItems.map((item: any, idx: number) => (
                        <TableRow key={item.id || idx}>
                          <TableCell>{item.invoices?.date ? format(new Date(item.invoices.date), 'dd MMM yyyy') : '-'}</TableCell>
                          <TableCell className="text-right">{item.quantity || 0}</TableCell>
                          <TableCell className="text-right">{getAdjustedGrossWeight(item).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.net_weight?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell className="text-right">₹{item.rate?.toLocaleString() || 0}</TableCell>
                          <TableCell className="text-right font-medium">₹{item.total?.toLocaleString() || 0}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{detailItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)}</TableCell>
                        <TableCell className="text-right">{detailItems.reduce((sum: number, i: any) => sum + getAdjustedGrossWeight(i), 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{detailItems.reduce((sum: number, i: any) => sum + (i.net_weight || 0), 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">₹{detailItems.reduce((sum: number, i: any) => sum + (i.total || 0), 0).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>

            {/* Additional Expenses Section */}
            <div className="mt-6 space-y-4">
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rent">Rent</Label>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-medium", !rentIsAddition ? "text-red-600" : "text-muted-foreground")}>
                        Reduce
                      </span>
                      <Switch
                        checked={rentIsAddition}
                        onCheckedChange={setRentIsAddition}
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-500"
                      />
                      <span className={cn("text-xs font-medium", rentIsAddition ? "text-green-600" : "text-muted-foreground")}>
                        Add
                      </span>
                    </div>
                  </div>
                  <Input
                    id="rent"
                    type="number"
                    min="0"
                    value={rent || ''}
                    onChange={(e) => setRent(Number(e.target.value) || 0)}
                    placeholder="Enter rent amount"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="otherExpenses">Other Expenses</Label>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-medium", !otherExpensesIsAddition ? "text-red-600" : "text-muted-foreground")}>
                        Reduce
                      </span>
                      <Switch
                        checked={otherExpensesIsAddition}
                        onCheckedChange={setOtherExpensesIsAddition}
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-500"
                      />
                      <span className={cn("text-xs font-medium", otherExpensesIsAddition ? "text-green-600" : "text-muted-foreground")}>
                        Add
                      </span>
                    </div>
                  </div>
                  <Input
                    id="otherExpenses"
                    type="number"
                    min="0"
                    value={otherExpenses || ''}
                    onChange={(e) => setOtherExpenses(Number(e.target.value) || 0)}
                    placeholder="Enter other expenses"
                    className="font-mono"
                  />
                </div>
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="py-3">
                    <div className="text-sm text-muted-foreground">Final Total Amount</div>
                    <div className="text-2xl font-bold text-primary">₹{finalTotal.toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Breakdown */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items Total</span>
                  <span className="font-medium">₹{totalAmount.toLocaleString()}</span>
                </div>
                {rent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rent {rentIsAddition ? '(+)' : '(-)'}</span>
                    <span className={cn("font-medium", rentIsAddition ? "text-green-600" : "text-red-600")}>
                      {rentIsAddition ? '+' : '-'}₹{rent.toLocaleString()}
                    </span>
                  </div>
                )}
                {otherExpenses > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Other Expenses {otherExpensesIsAddition ? '(+)' : '(-)'}</span>
                    <span className={cn("font-medium", otherExpensesIsAddition ? "text-green-600" : "text-red-600")}>
                      {otherExpensesIsAddition ? '+' : '-'}₹{otherExpenses.toLocaleString()}
                    </span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Final Total</span>
                  <span className="text-primary">₹{finalTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={() => saveStatementMutation.mutate()}
                  disabled={!selectedVendor || saveStatementMutation.isPending}
                  className="gap-2"
                >
                  {saveStatementMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingStatementId ? 'Update Statement' : 'Save Statement'}
                </Button>
              </div>
            </div>
          </>
        )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
