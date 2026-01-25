import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DashboardStats {
  todaySales: number;
  weekSales: number;
  monthSales: number;
  totalCustomers: number;
  totalVendors: number;
  pendingAmount: number;
}

export function useDashboardStats() {
  const { company } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', company?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!company?.id) {
        return {
          todaySales: 0,
          weekSales: 0,
          monthSales: 0,
          totalCustomers: 0,
          totalVendors: 0,
          pendingAmount: 0,
        };
      }

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // Fetch all data in parallel
      const [
        todayInvoices,
        weekInvoices,
        monthInvoices,
        customers,
        vendors,
        allInvoices,
        allPayments,
        allAdjustments,
      ] = await Promise.all([
        supabase
          .from('invoices')
          .select('total')
          .eq('company_id', company.id)
          .gte('created_at', startOfDay),
        supabase
          .from('invoices')
          .select('total')
          .eq('company_id', company.id)
          .gte('created_at', startOfWeek),
        supabase
          .from('invoices')
          .select('total')
          .eq('company_id', company.id)
          .gte('created_at', startOfMonth),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id),
        supabase
          .from('vendors')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id),
        supabase
          .from('invoices')
          .select('total')
          .eq('company_id', company.id),
        supabase
          .from('payments')
          .select('amount')
          .eq('company_id', company.id),
        supabase
          .from('party_adjustments')
          .select('amount, type')
          .eq('company_id', company.id),
      ]);

      const sumTotals = (data: { total: number }[] | null) =>
        (data || []).reduce((sum, inv) => sum + Number(inv.total || 0), 0);

      // Calculate pending amount (total invoices - total payments - adjustments)
      const totalInvoices = sumTotals(allInvoices.data);
      const totalPayments = (allPayments.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalAdjustments = (allAdjustments.data || []).reduce((sum, a) => {
        const amount = Number(a.amount || 0);
        return sum + (a.type === 'discount' ? amount : -amount);
      }, 0);
      const pendingAmount = totalInvoices - totalPayments - totalAdjustments;

      return {
        todaySales: sumTotals(todayInvoices.data),
        weekSales: sumTotals(weekInvoices.data),
        monthSales: sumTotals(monthInvoices.data),
        totalCustomers: customers.count || 0,
        totalVendors: vendors.count || 0,
        pendingAmount: Math.max(0, pendingAmount),
      };
    },
    enabled: !!company?.id,
  });
}
