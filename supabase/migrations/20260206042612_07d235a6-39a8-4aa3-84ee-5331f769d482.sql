-- Create subscription_settings table for admin to set rates
CREATE TABLE public.subscription_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_time_price numeric NOT NULL DEFAULT 0,
  renewal_price numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.subscription_settings (first_time_price, renewal_price, duration_days) 
VALUES (999, 499, 30);

-- Enable RLS
ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage subscription settings
CREATE POLICY "Super admins can manage subscription settings"
ON public.subscription_settings
FOR ALL
USING (is_super_admin(auth.uid()));

-- Anyone authenticated can view settings
CREATE POLICY "Authenticated users can view subscription settings"
ON public.subscription_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add subscription fields to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_started_at timestamp with time zone DEFAULT NULL;

-- Create trigger to update updated_at
CREATE TRIGGER update_subscription_settings_updated_at
BEFORE UPDATE ON public.subscription_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();