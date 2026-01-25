import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export function useReportsData() {
  const { company } = useAuth();
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const { data: stats, isLoading } = useQuery({
    queryKey: ['reports-stats', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      // Get this month's sales
      const { data: thisMonthInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('company_id', company.id)
        .gte('date', format(thisMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(thisMonthEnd, 'yyyy-MM-dd'));

      // Get last month's sales for comparison
      const { data: lastMonthInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('company_id', company.id)
        .gte('date', format(lastMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(lastMonthEnd, 'yyyy-MM-dd'));

      // Get this month's purchases
      const { data: thisMonthPurchases } = await supabase
        .from('purchases')
        .select('total')
        .eq('company_id', company.id)
        .gte('date', format(thisMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(thisMonthEnd, 'yyyy-MM-dd'));

      // Get customer outstanding balances
      const { data: customers } = await supabase
        .from('customers')
        .select('balance')
        .eq('company_id', company.id)
        .gt('balance', 0);

      const thisMonthSales = thisMonthInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const lastMonthSales = lastMonthInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const thisMonthPurchaseTotal = thisMonthPurchases?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;
      const totalOutstanding = customers?.reduce((sum, c) => sum + (c.balance || 0), 0) || 0;
      const outstandingCustomers = customers?.length || 0;
      const grossProfit = thisMonthSales - thisMonthPurchaseTotal;
      const profitMargin = thisMonthSales > 0 ? (grossProfit / thisMonthSales) * 100 : 0;
      const salesGrowth = lastMonthSales > 0 ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100 : 0;

      return {
        thisMonthSales,
        lastMonthSales,
        thisMonthPurchases: thisMonthPurchaseTotal,
        totalOutstanding,
        outstandingCustomers,
        grossProfit,
        profitMargin,
        salesGrowth,
      };
    },
    enabled: !!company?.id,
  });

  return { stats, isLoading };
}
