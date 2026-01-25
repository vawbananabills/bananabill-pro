import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, Loader2, Download, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ProfitLossDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfitLossDialog({ open, onOpenChange }: ProfitLossDialogProps) {
  const { company } = useAuth();
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));

  const { data, isLoading } = useQuery({
    queryKey: ['profit-loss', company?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!company?.id) return null;

      // Get total sales (revenue)
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('total, discount, other_charges')
        .eq('company_id', company.id)
        .gte('date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('date', format(dateTo, 'yyyy-MM-dd'));

      if (invError) throw invError;

      // Get total purchases (cost of goods)
      const { data: purchases, error: purError } = await supabase
        .from('purchases')
        .select('total')
        .eq('company_id', company.id)
        .gte('date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('date', format(dateTo, 'yyyy-MM-dd'));

      if (purError) throw purError;

      const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const totalDiscounts = invoices?.reduce((sum, inv) => sum + (inv.discount || 0), 0) || 0;
      const totalOtherCharges = invoices?.reduce((sum, inv) => sum + (inv.other_charges || 0), 0) || 0;
      const costOfGoods = purchases?.reduce((sum, pur) => sum + (pur.total || 0), 0) || 0;
      
      const grossProfit = totalRevenue - costOfGoods;
      const netProfit = grossProfit + totalOtherCharges - totalDiscounts;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return {
        totalRevenue,
        costOfGoods,
        grossProfit,
        totalDiscounts,
        totalOtherCharges,
        netProfit,
        profitMargin,
        invoiceCount: invoices?.length || 0,
        purchaseCount: purchases?.length || 0,
      };
    },
    enabled: open && !!company?.id,
  });

  const pieData = data ? [
    { name: 'Cost of Goods', value: data.costOfGoods, color: 'hsl(var(--destructive))' },
    { name: 'Gross Profit', value: Math.max(0, data.grossProfit), color: 'hsl(var(--success))' },
  ].filter(d => d.value > 0) : [];

  const handleExport = () => {
    if (!data) return;
    
    const content = [
      'Profit & Loss Statement',
      `Period: ${format(dateFrom, 'dd MMM yyyy')} - ${format(dateTo, 'dd MMM yyyy')}`,
      '',
      'INCOME',
      `Total Revenue,₹${data.totalRevenue.toLocaleString()}`,
      `Other Charges,₹${data.totalOtherCharges.toLocaleString()}`,
      '',
      'EXPENSES',
      `Cost of Goods Sold,₹${data.costOfGoods.toLocaleString()}`,
      `Discounts Given,₹${data.totalDiscounts.toLocaleString()}`,
      '',
      'SUMMARY',
      `Gross Profit,₹${data.grossProfit.toLocaleString()}`,
      `Net Profit,₹${data.netProfit.toLocaleString()}`,
      `Profit Margin,${data.profitMargin.toFixed(1)}%`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${format(dateFrom, 'yyyy-MM')}.csv`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Profit & Loss Statement
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

          <Button variant="outline" onClick={handleExport} className="gap-2 ml-auto">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Net Profit Card */}
            <Card className={cn(
              "border-2",
              (data?.netProfit || 0) >= 0 ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"
            )}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Net Profit</div>
                    <div className={cn(
                      "text-4xl font-bold",
                      (data?.netProfit || 0) >= 0 ? "text-success" : "text-destructive"
                    )}>
                      ₹{(data?.netProfit || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {(data?.profitMargin || 0).toFixed(1)}% profit margin
                    </div>
                  </div>
                  {(data?.netProfit || 0) >= 0 ? (
                    <TrendingUp className="w-16 h-16 text-success/50" />
                  ) : (
                    <TrendingDown className="w-16 h-16 text-destructive/50" />
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Income Section */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-success flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Income
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Revenue</span>
                    <span className="font-medium">₹{(data?.totalRevenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Other Charges</span>
                    <span className="font-medium">₹{(data?.totalOtherCharges || 0).toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Income</span>
                    <span className="text-success">₹{((data?.totalRevenue || 0) + (data?.totalOtherCharges || 0)).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses Section */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-destructive flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost of Goods Sold</span>
                    <span className="font-medium">₹{(data?.costOfGoods || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discounts Given</span>
                    <span className="font-medium">₹{(data?.totalDiscounts || 0).toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Expenses</span>
                    <span className="text-destructive">₹{((data?.costOfGoods || 0) + (data?.totalDiscounts || 0)).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            {pieData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-center text-sm text-muted-foreground">
              <div>Invoices: {data?.invoiceCount || 0}</div>
              <div>Purchases: {data?.purchaseCount || 0}</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
