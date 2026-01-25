import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface LooseProduct {
  id: string;
  company_id: string;
  name: string;
  default_rate: number;
  created_at: string;
}

export function useLooseProducts() {
  const { company } = useAuth();
  const queryClient = useQueryClient();

  const { data: looseProducts = [], isLoading } = useQuery({
    queryKey: ['loose-products', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('loose_products')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      
      if (error) throw error;
      return data as LooseProduct[];
    },
    enabled: !!company?.id,
  });

  const addLooseProduct = useMutation({
    mutationFn: async (product: Omit<LooseProduct, 'id' | 'company_id' | 'created_at'>) => {
      if (!company?.id) throw new Error('No company');
      const { data, error } = await supabase
        .from('loose_products')
        .insert({ ...product, company_id: company.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loose-products'] });
      toast.success('Loose product added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add loose product: ' + error.message);
    },
  });

  const updateLooseProduct = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LooseProduct> & { id: string }) => {
      const { data, error } = await supabase
        .from('loose_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loose-products'] });
      toast.success('Loose product updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update loose product: ' + error.message);
    },
  });

  const deleteLooseProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('loose_products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loose-products'] });
      toast.success('Loose product deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete loose product: ' + error.message);
    },
  });

  return {
    looseProducts,
    isLoading,
    addLooseProduct,
    updateLooseProduct,
    deleteLooseProduct,
  };
}
