-- First create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create weekly_invoices table for storing saved weekly invoice reports
CREATE TABLE IF NOT EXISTS public.weekly_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  discount NUMERIC DEFAULT 0,
  other_charges NUMERIC DEFAULT 0,
  notes TEXT,
  subtotal NUMERIC DEFAULT 0,
  final_total NUMERIC DEFAULT 0,
  opening_balance NUMERIC DEFAULT 0,
  total_payments NUMERIC DEFAULT 0,
  closing_balance NUMERIC DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  total_net_weight NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies (drop if exists first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view weekly invoices in their company" ON public.weekly_invoices;
DROP POLICY IF EXISTS "Users can insert weekly invoices in their company" ON public.weekly_invoices;
DROP POLICY IF EXISTS "Users can update weekly invoices in their company" ON public.weekly_invoices;
DROP POLICY IF EXISTS "Users can delete weekly invoices in their company" ON public.weekly_invoices;

CREATE POLICY "Users can view weekly invoices in their company"
ON public.weekly_invoices FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert weekly invoices in their company"
ON public.weekly_invoices FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update weekly invoices in their company"
ON public.weekly_invoices FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete weekly invoices in their company"
ON public.weekly_invoices FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_weekly_invoices_updated_at ON public.weekly_invoices;
CREATE TRIGGER update_weekly_invoices_updated_at
BEFORE UPDATE ON public.weekly_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();