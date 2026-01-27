import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers } from '@/hooks/useCustomers';
import { useProducts } from '@/hooks/useProducts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, Loader2, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalesReportDialog({ open, onOpenChange }: SalesReportDialogProps) {
  const { company } = useAuth();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [filterBy, setFilterBy] = useState<'all' | 'customer' | 'product'>('all');
  const [selectedFilter, setSelectedFilter] = useState<string>('');

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales-report', company?.id, dateFrom, dateTo, filterBy, selectedFilter],
    queryFn: async () => {
      if (!company?.id) return null;

      let query = supabase
        .from('invoices')
        .select(`
          *,
          customers(name),
          invoice_items(
            *,
            products(name),
            vendors(name)
          )
        `)
        .eq('company_id', company.id)
        .gte('date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('date', format(dateTo, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (filterBy === 'customer' && selectedFilter) {
        query = query.eq('customer_id', selectedFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process data for chart
      const dailySales: { [key: string]: number } = {};
      let totalSales = 0;
      let totalInvoices = 0;

      data?.forEach((invoice: any) => {
        const dateKey = format(new Date(invoice.date), 'dd MMM');
        dailySales[dateKey] = (dailySales[dateKey] || 0) + (invoice.total || 0);
        totalSales += invoice.total || 0;
        totalInvoices++;
      });

      const chartData = Object.entries(dailySales).map(([date, total]) => ({
        date,
        total,
      }));

      return {
        invoices: data || [],
        chartData,
        totalSales,
        totalInvoices,
        avgSale: totalInvoices > 0 ? totalSales / totalInvoices : 0,
      };
    },
    enabled: open && !!company?.id,
  });

  const handleExport = () => {
    if (!salesData?.invoices) return;
    
    const csvContent = [
      ['Date', 'Invoice #', 'Customer', 'Total', 'Status'].join(','),
      ...salesData.invoices.map((inv: any) => 
        [
          inv.date,
          inv.invoice_number,
          inv.customers?.name || 'Walk-in',
          inv.total,
          inv.status
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${format(dateFrom, 'yyyy-MM-dd')}-to-${format(dateTo, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Sales Report
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
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

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Filter By</label>
            <Select value={filterBy} onValueChange={(v: any) => { setFilterBy(v); setSelectedFilter(''); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterBy === 'customer' && (
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Select Customer</label>
              <SearchableSelect
                value={selectedFilter}
                onValueChange={setSelectedFilter}
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="All Customers"
                searchPlaceholder="Search customers..."
                emptyMessage="No customers found."
                className="w-[180px]"
              />
            </div>
          )}

          <Button variant="outline" onClick={handleExport} className="gap-2 ml-auto">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Sales</div>
                  <div className="text-2xl font-bold text-primary">₹{(salesData?.totalSales || 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Invoices</div>
                  <div className="text-2xl font-bold">{salesData?.totalInvoices || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Average Sale</div>
                  <div className="text-2xl font-bold">₹{(salesData?.avgSale || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            {salesData?.chartData && salesData.chartData.length > 0 && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Sales']} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Table */}
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData?.invoices?.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{format(new Date(invoice.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.customers?.name || 'Walk-in'}</TableCell>
                      <TableCell className="text-right font-medium">₹{invoice.total?.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs",
                          invoice.status === 'paid' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        )}>
                          {invoice.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!salesData?.invoices || salesData.invoices.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No sales data for selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
