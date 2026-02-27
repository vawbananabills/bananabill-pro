-- Add default invoice print size setting
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS invoice_print_size TEXT DEFAULT 'A4';

