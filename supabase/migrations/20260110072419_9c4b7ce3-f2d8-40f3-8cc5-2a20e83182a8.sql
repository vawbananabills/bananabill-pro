-- Add UPI ID column to companies table for UPI QR code generation
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS upi_id text;

-- Add comment for clarity
COMMENT ON COLUMN public.companies.upi_id IS 'UPI ID for generating payment QR codes on invoices';