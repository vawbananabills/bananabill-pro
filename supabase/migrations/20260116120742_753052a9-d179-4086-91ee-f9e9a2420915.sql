-- Add explicit foreign key constraint from loose_invoice_items to invoices
-- First check if it exists and drop it, then add it fresh
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'loose_invoice_items_invoice_id_fkey' 
    AND table_name = 'loose_invoice_items'
  ) THEN
    ALTER TABLE public.loose_invoice_items DROP CONSTRAINT loose_invoice_items_invoice_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint
ALTER TABLE public.loose_invoice_items
ADD CONSTRAINT loose_invoice_items_invoice_id_fkey
FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;