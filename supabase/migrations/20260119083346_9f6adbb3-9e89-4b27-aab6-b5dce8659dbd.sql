-- Create vendor_statements table to store saved vendor statements
CREATE TABLE public.vendor_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  vehicle_number TEXT,
  loader_name TEXT,
  load NUMERIC DEFAULT 0,
  mt NUMERIC DEFAULT 0,
  rent NUMERIC DEFAULT 0,
  rent_is_addition BOOLEAN DEFAULT false,
  other_expenses NUMERIC DEFAULT 0,
  other_expenses_is_addition BOOLEAN DEFAULT false,
  total_items NUMERIC DEFAULT 0,
  total_gross_weight NUMERIC DEFAULT 0,
  total_net_weight NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  final_total NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.vendor_statements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view vendor statements in their company"
ON public.vendor_statements FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert vendor statements in their company"
ON public.vendor_statements FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update vendor statements in their company"
ON public.vendor_statements FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete vendor statements in their company"
ON public.vendor_statements FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_vendor_statements_updated_at
BEFORE UPDATE ON public.vendor_statements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();