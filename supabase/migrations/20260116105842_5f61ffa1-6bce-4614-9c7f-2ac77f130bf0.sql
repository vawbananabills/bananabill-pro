-- Add vendor_id column to loose_invoice_items
ALTER TABLE public.loose_invoice_items 
ADD COLUMN vendor_id uuid REFERENCES public.vendors(id);

-- Create index for better query performance
CREATE INDEX idx_loose_invoice_items_vendor_id ON public.loose_invoice_items(vendor_id);