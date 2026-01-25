import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CompanyWithStats {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  userCount?: number;
  invoiceCount?: number;
}

export function useSuperAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user is super admin
  const { data: isSuperAdmin = false, isLoading: checkingRole } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Get all companies
  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get user counts for each company
      const companiesWithStats: CompanyWithStats[] = await Promise.all(
        (companiesData || []).map(async (company) => {
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

          const { count: invoiceCount } = await supabase
            .from('invoices')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

          return {
            ...company,
            userCount: userCount || 0,
            invoiceCount: invoiceCount || 0,
          };
        })
      );

      return companiesWithStats;
    },
    enabled: isSuperAdmin,
  });

  // Get all users with their companies
  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          companies:company_id (name),
          user_roles!inner (role)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Toggle company active status
  const toggleCompanyStatus = useMutation({
    mutationFn: async ({ companyId, isActive }: { companyId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('companies')
        .update({ is_active: isActive })
        .eq('id', companyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      toast.success('Company status updated');
    },
    onError: (error) => {
      toast.error('Failed to update company: ' + error.message);
    },
  });

  // Get platform stats
  const { data: platformStats } = useQuery({
    queryKey: ['admin-platform-stats'],
    queryFn: async () => {
      const { count: totalCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: totalInvoices } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });

      const { data: revenueData } = await supabase
        .from('invoices')
        .select('total');

      const totalRevenue = revenueData?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      return {
        totalCompanies: totalCompanies || 0,
        totalUsers: totalUsers || 0,
        totalInvoices: totalInvoices || 0,
        totalRevenue,
      };
    },
    enabled: isSuperAdmin,
  });

  return {
    isSuperAdmin,
    checkingRole,
    companies,
    loadingCompanies,
    allUsers,
    loadingUsers,
    toggleCompanyStatus,
    platformStats,
  };
}
