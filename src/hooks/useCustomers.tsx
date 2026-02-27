import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number;
  opening_balance: number;
  created_at: string;
}

export function useCustomers() {
  const { company } = useAuth();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      
      if (customersError) throw customersError;
      if (!customersData || customersData.length === 0) return [];

      // Fetch all invoices for these customers
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('customer_id, total')
        .eq('company_id', company.id)
        .in('customer_id', customersData.map(c => c.id));

      // Fetch all payments for these customers
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('customer_id, amount, discount')
        .eq('company_id', company.id)
        .in('customer_id', customersData.map(c => c.id));

      // Fetch all adjustments for these customers
      const { data: adjustmentsData } = await supabase
        .from('party_adjustments')
        .select('customer_id, amount, type')
        .eq('company_id', company.id)
        .in('customer_id', customersData.map(c => c.id));

      // Calculate balance for each customer
      return customersData.map(customer => {
        const customerInvoices = (invoicesData || []).filter(i => i.customer_id === customer.id);
        const customerPayments = (paymentsData || []).filter(p => p.customer_id === customer.id);
        const customerAdjustments = (adjustmentsData || []).filter(a => a.customer_id === customer.id);

        const totalInvoices = customerInvoices.reduce((sum, i) => sum + Number(i.total || 0), 0);
        const totalPayments = customerPayments.reduce(
          (sum, p) => sum + Number(p.amount || 0) + Number((p as any).discount || 0),
          0
        );
        const totalAdjustments = customerAdjustments.reduce((sum, a) => {
          const amount = Number(a.amount || 0);
          return sum + (a.type === 'discount' ? amount : -amount);
        }, 0);

        const calculatedBalance = Number(customer.opening_balance || 0) + totalInvoices - totalPayments - totalAdjustments;

        return {
          ...customer,
          balance: calculatedBalance,
        } as Customer;
      });
    },
    enabled: !!company?.id,
  });

  const addCustomer = useMutation({
    mutationFn: async (customer: Omit<Customer, 'id' | 'company_id' | 'created_at' | 'balance'>) => {
      if (!company?.id) throw new Error('No company');
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...customer, company_id: company.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add customer: ' + error.message);
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update customer: ' + error.message);
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete customer: ' + error.message);
    },
  });

  return {
    customers,
    isLoading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
