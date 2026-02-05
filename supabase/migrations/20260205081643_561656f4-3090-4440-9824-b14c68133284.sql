-- Add discount column to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0;

-- Update the RLS policies to include the new column (policies already exist, just need to ensure column access)