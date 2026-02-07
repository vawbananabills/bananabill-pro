import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';

export interface SubscriptionSettings {
  id: string;
  first_time_price: number;
  renewal_price: number;
  duration_days: number;
  trial_duration_days: number;
  created_at: string;
  updated_at: string;
}

export interface CompanySubscription {
  subscription_status: string | null;
  subscription_expires_at: string | null;
  subscription_started_at: string | null;
}

export function useSubscription() {
  const { company, user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch subscription settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['subscription-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_settings')
        .select('*')
        .single();

      if (error) throw error;
      return data as SubscriptionSettings;
    },
    enabled: !!user,
  });

  // Fetch current company subscription status
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['company-subscription', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('companies')
        .select('subscription_status, subscription_expires_at, subscription_started_at')
        .eq('id', company.id)
        .single();

      if (error) throw error;
      return data as CompanySubscription;
    },
    enabled: !!company?.id,
  });

  // Calculate days left
  const daysLeft = subscription?.subscription_expires_at
    ? Math.max(0, differenceInDays(parseISO(subscription.subscription_expires_at), new Date()))
    : 0;

  const isTrial = subscription?.subscription_status === 'trial' || !subscription?.subscription_status;

  const isExpired = subscription?.subscription_expires_at
    ? new Date() > parseISO(subscription.subscription_expires_at)
    : !isTrial;

  const isTrialActive = isTrial && !!subscription?.subscription_expires_at && !isExpired;
  const isActive = (subscription?.subscription_status === 'active' && !isExpired) || isTrialActive;

  // Update subscription settings (admin only)
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<SubscriptionSettings>) => {
      const { error } = await supabase
        .from('subscription_settings')
        .update(newSettings)
        .eq('id', settings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-settings'] });
      toast.success('Subscription settings updated');
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  // Update company subscription (admin sets renewal for specific company)
  const updateCompanySubscription = useMutation({
    mutationFn: async ({ 
      companyId, 
      expiresAt, 
      status = 'active' 
    }: { 
      companyId: string; 
      expiresAt: string; 
      status?: string;
    }) => {
      const { error } = await supabase
        .from('companies')
        .update({
          subscription_status: status,
          subscription_expires_at: expiresAt,
          subscription_started_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['all-companies'] });
      toast.success('Subscription updated');
    },
    onError: () => {
      toast.error('Failed to update subscription');
    },
  });

  return {
    settings,
    subscription,
    daysLeft,
    isExpired,
    isActive,
    isTrial,
    settingsLoading,
    subscriptionLoading,
    updateSettings,
    updateCompanySubscription,
  };
}
