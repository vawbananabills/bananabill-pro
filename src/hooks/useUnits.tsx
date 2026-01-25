import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Unit {
  id: string;
  company_id: string;
  name: string;
  symbol: string;
  is_default: boolean;
  weight_value: number;
  created_at: string;
}

export function useUnits() {
  const { company } = useAuth();
  const queryClient = useQueryClient();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      
      if (error) throw error;
      return data as Unit[];
    },
    enabled: !!company?.id,
  });

  const addUnit = useMutation({
    mutationFn: async (unit: Omit<Unit, 'id' | 'company_id' | 'created_at'>) => {
      if (!company?.id) throw new Error('No company');
      const { data, error } = await supabase
        .from('units')
        .insert({ ...unit, company_id: company.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Unit added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add unit: ' + error.message);
    },
  });

  const updateUnit = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Unit> & { id: string }) => {
      const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Unit updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update unit: ' + error.message);
    },
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Unit deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete unit: ' + error.message);
    },
  });

  return {
    units,
    isLoading,
    addUnit,
    updateUnit,
    deleteUnit,
  };
}
