import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Payment {
  id: string;
  company_id: string;
  invoice_id: string | null;
  customer_id: string | null;
  amount: number;
  discount: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string | null;
  created_by: string | null;
}

export interface PaymentWithDetails extends Payment {
  customer_name?: string;
  invoice_number?: string;
}

export function usePayments() {
  const { company, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('payments' as any)
        .select(`
          *,
          customers (name),
          invoices (invoice_number)
        `)
        .eq('company_id', company.id)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((payment: any) => ({
        ...payment,
        customer_name: payment.customers?.name,
        invoice_number: payment.invoices?.invoice_number,
      })) as PaymentWithDetails[];
    },
    enabled: !!company?.id,
  });

  const createPayment = useMutation({
    mutationFn: async (payment: Omit<Payment, 'id' | 'company_id' | 'created_at' | 'created_by'>) => {
      if (!company?.id) throw new Error('No company found');
      
      const { data, error } = await supabase
        .from('payments' as any)
        .insert({
          ...payment,
          company_id: company.id,
          created_by: user?.id,
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // If payment is linked to an invoice, update the invoice's received_amount
      if (payment.invoice_id) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('received_amount, total')
          .eq('id', payment.invoice_id)
          .single() as any;
        
        if (invoice) {
          const totalApplied = payment.amount + (payment.discount || 0);
          const newReceivedAmount = (invoice.received_amount || 0) + totalApplied;
          const newStatus = newReceivedAmount >= (invoice.total || 0) ? 'paid' : 
                           newReceivedAmount > 0 ? 'partial' : 'pending';
          
          await supabase
            .from('invoices')
            .update({ 
              received_amount: newReceivedAmount,
              status: newStatus 
            } as any)
            .eq('id', payment.invoice_id);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to record payment: ' + error.message);
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...payment }: Partial<Payment> & { id: string }) => {
      const { data, error } = await supabase
        .from('payments' as any)
        .update(payment as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update payment: ' + error.message);
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      // Get the payment first to restore invoice amount
      const { data: payment } = await supabase
        .from('payments' as any)
        .select('invoice_id, amount')
        .eq('id', id)
        .single() as any;
      
      const { error } = await supabase
        .from('payments' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Restore invoice received_amount
      if (payment?.invoice_id) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('received_amount, total')
          .eq('id', payment.invoice_id)
          .single() as any;
        
        if (invoice) {
          const newReceivedAmount = Math.max(0, (invoice.received_amount || 0) - payment.amount);
          const newStatus = newReceivedAmount >= (invoice.total || 0) ? 'paid' : 
                           newReceivedAmount > 0 ? 'partial' : 'pending';
          
          await supabase
            .from('invoices')
            .update({ 
              received_amount: newReceivedAmount,
              status: newStatus 
            } as any)
            .eq('id', payment.invoice_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete payment: ' + error.message);
    },
  });

  return {
    payments,
    isLoading,
    createPayment,
    updatePayment,
    deletePayment,
  };
}
