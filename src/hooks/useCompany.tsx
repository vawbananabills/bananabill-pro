import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CompanySettings {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  gst_number: string | null;
  invoice_prefix: string | null;
  next_invoice_number: number | null;
  bank_details: string | null;
  footer_notes: string | null;
  logo_url: string | null;
  upi_id: string | null;
  show_logo_on_invoice: boolean | null;
  date_format: string | null;
}

export function useCompany() {
  const { company, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const updateCompany = useMutation({
    mutationFn: async (updates: Partial<CompanySettings>) => {
      if (!company?.id) throw new Error('No company');
      
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', company.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });

  return {
    company,
    updateCompany,
  };
}
