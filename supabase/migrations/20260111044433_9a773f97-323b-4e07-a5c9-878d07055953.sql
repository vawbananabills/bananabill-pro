-- Add weight_value to units table (for conversion, e.g., 1 crate = 5 kg)
ALTER TABLE public.units ADD COLUMN weight_value numeric DEFAULT 1;

-- Add fixed box_weight to products table
ALTER TABLE public.products ADD COLUMN box_weight numeric DEFAULT 0;
ALTER TABLE public.products ADD COLUMN box_weight_unit_id uuid REFERENCES public.units(id);

-- Add quantity to invoice_items
ALTER TABLE public.invoice_items ADD COLUMN quantity numeric DEFAULT 1;