import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Vendor {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number;
  created_at: string;
}

export function useVendors() {
  const { company } = useAuth();
  const queryClient = useQueryClient();

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      // Fetch vendors
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      
      if (vendorsError) throw vendorsError;
      if (!vendorsData || vendorsData.length === 0) return [];

      // Fetch all purchases for these vendors
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('vendor_id, total')
        .eq('company_id', company.id)
        .in('vendor_id', vendorsData.map(v => v.id));

      // Calculate balance for each vendor (total purchases = amount payable)
      return vendorsData.map(vendor => {
        const vendorPurchases = (purchasesData || []).filter(p => p.vendor_id === vendor.id);
        const totalPurchases = vendorPurchases.reduce((sum, p) => sum + Number(p.total || 0), 0);

        return {
          ...vendor,
          balance: totalPurchases,
        } as Vendor;
      });
    },
    enabled: !!company?.id,
  });

  const addVendor = useMutation({
    mutationFn: async (vendor: Omit<Vendor, 'id' | 'company_id' | 'created_at' | 'balance'>) => {
      if (!company?.id) throw new Error('No company');
      const { data, error } = await supabase
        .from('vendors')
        .insert({ ...vendor, company_id: company.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add vendor: ' + error.message);
    },
  });

  const updateVendor = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vendor> & { id: string }) => {
      const { data, error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update vendor: ' + error.message);
    },
  });

  const deleteVendor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete vendor: ' + error.message);
    },
  });

  return {
    vendors,
    isLoading,
    addVendor,
    updateVendor,
    deleteVendor,
  };
}
