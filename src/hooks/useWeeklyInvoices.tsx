import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface WeeklyInvoice {
  id: string;
  company_id: string;
  customer_id: string;
  date_from: string;
  date_to: string;
  discount: number;
  other_charges: number;
  notes: string | null;
  subtotal: number;
  final_total: number;
  opening_balance: number;
  total_payments: number;
  closing_balance: number;
  total_items: number;
  total_net_weight: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customers?: { name: string };
}

export function useWeeklyInvoices() {
  const { company, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: weeklyInvoices = [], isLoading } = useQuery({
    queryKey: ['weekly-invoices', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('weekly_invoices')
        .select('*, customers(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WeeklyInvoice[];
    },
    enabled: !!company?.id,
  });

  const createWeeklyInvoice = useMutation({
    mutationFn: async (invoice: Omit<WeeklyInvoice, 'id' | 'created_at' | 'updated_at' | 'customers'>) => {
      const { data, error } = await supabase
        .from('weekly_invoices')
        .insert({
          ...invoice,
          company_id: company?.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-invoices'] });
      toast.success('Weekly invoice saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save weekly invoice: ' + error.message);
    },
  });

  const updateWeeklyInvoice = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WeeklyInvoice> & { id: string }) => {
      const { data, error } = await supabase
        .from('weekly_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-invoices'] });
      toast.success('Weekly invoice updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  const deleteWeeklyInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('weekly_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-invoices'] });
      toast.success('Weekly invoice deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  return {
    weeklyInvoices,
    isLoading,
    createWeeklyInvoice,
    updateWeeklyInvoice,
    deleteWeeklyInvoice,
  };
}
