-- Add opening_balance column to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS opening_balance numeric DEFAULT 0;

-- Add opening_balance column to vendors table
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS opening_balance numeric DEFAULT 0;