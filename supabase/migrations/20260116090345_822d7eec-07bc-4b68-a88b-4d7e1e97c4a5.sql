
-- Create loose_products table
CREATE TABLE public.loose_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  default_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on loose_products
ALTER TABLE public.loose_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for loose_products
CREATE POLICY "Users can view loose products in their company"
ON public.loose_products FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage loose products in their company"
ON public.loose_products FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Create loose_invoice_items table
CREATE TABLE public.loose_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL,
  loose_product_id UUID REFERENCES public.loose_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  net_weight NUMERIC DEFAULT 0,
  weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'g')),
  rate NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on loose_invoice_items
ALTER TABLE public.loose_invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for loose_invoice_items
CREATE POLICY "Users can view loose invoice items"
ON public.loose_invoice_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM invoices
  WHERE invoices.id = loose_invoice_items.invoice_id
  AND invoices.company_id = get_user_company_id(auth.uid())
));

CREATE POLICY "Users can manage loose invoice items"
ON public.loose_invoice_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM invoices
  WHERE invoices.id = loose_invoice_items.invoice_id
  AND invoices.company_id = get_user_company_id(auth.uid())
));
