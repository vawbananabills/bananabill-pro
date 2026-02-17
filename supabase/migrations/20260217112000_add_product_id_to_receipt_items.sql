-- Add product_id to vendor_receipt_items
ALTER TABLE public.vendor_receipt_items 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
