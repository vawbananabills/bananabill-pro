-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, warning, success, error
  target_type TEXT NOT NULL DEFAULT 'all', -- all, company, user
  target_id UUID, -- company_id or user_id depending on target_type
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create notification reads table to track which users have read which notifications
CREATE TABLE public.notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Super admins can manage notifications"
ON public.notifications
FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view relevant notifications"
ON public.notifications
FOR SELECT
USING (
  target_type = 'all' OR
  (target_type = 'company' AND target_id = public.get_user_company_id(auth.uid())) OR
  (target_type = 'user' AND target_id = auth.uid())
);

-- Notification reads policies
CREATE POLICY "Users can read their own notification reads"
ON public.notification_reads
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can mark notifications as read"
ON public.notification_reads
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;