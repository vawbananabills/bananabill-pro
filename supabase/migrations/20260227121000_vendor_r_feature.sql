-- Add feature flag for Vendor R functionality
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS enable_vendor_r BOOLEAN DEFAULT FALSE;

