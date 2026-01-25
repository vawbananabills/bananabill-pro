import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useEffect } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  target_type: string;
  target_id: string | null;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface NotificationRead {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications for the current user
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  // Fetch read notifications for the current user
  const { data: readNotifications = [] } = useQuery({
    queryKey: ['notification-reads', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_reads')
        .select('*');

      if (error) throw error;
      return data as NotificationRead[];
    },
    enabled: !!user,
  });

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notification_reads')
        .insert({ notification_id: notificationId, user_id: user?.id });

      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-reads'] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications
        .filter(n => !readNotifications.some(r => r.notification_id === n.id))
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const inserts = unreadIds.map(id => ({
        notification_id: id,
        user_id: user?.id,
      }));

      const { error } = await supabase
        .from('notification_reads')
        .insert(inserts);

      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-reads'] });
    },
  });

  // Send notification (super admin only)
  const sendNotification = useMutation({
    mutationFn: async (notification: {
      title: string;
      message: string;
      type: string;
      target_type: string;
      target_id?: string;
      expires_at?: string;
    }) => {
      const { error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          created_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notification sent successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to send notification', description: error.message, variant: 'destructive' });
    },
  });

  // Get unread count
  const unreadCount = notifications.filter(
    n => !readNotifications.some(r => r.notification_id === n.id)
  ).length;

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    notifications,
    readNotifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    sendNotification,
  };
}
