-- Add payment_mode to cash_daybook: Cash (default), UPI, Bank
ALTER TABLE public.cash_daybook
ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'Cash';

