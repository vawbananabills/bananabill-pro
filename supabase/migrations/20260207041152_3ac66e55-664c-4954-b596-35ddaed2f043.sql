-- Add trial duration setting
ALTER TABLE public.subscription_settings 
ADD COLUMN IF NOT EXISTS trial_duration_days integer DEFAULT 14;

-- Update existing row with default trial duration
UPDATE public.subscription_settings SET trial_duration_days = 14 WHERE trial_duration_days IS NULL;