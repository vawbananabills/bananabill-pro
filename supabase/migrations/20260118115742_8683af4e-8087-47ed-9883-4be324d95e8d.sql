-- Add date_format column to companies table
ALTER TABLE public.companies
ADD COLUMN date_format text DEFAULT 'dd/MM/yyyy';

-- Add comment for clarity
COMMENT ON COLUMN public.companies.date_format IS 'Date format to use across the application (e.g., dd/MM/yyyy, MM/dd/yyyy, yyyy-MM-dd)';