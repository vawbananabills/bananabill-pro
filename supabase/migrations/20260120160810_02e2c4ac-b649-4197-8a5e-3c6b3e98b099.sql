-- Create party_adjustments table for storing discounts and additional amounts
CREATE TABLE public.party_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('discount', 'additional')),
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.party_adjustments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view party adjustments in their company"
ON public.party_adjustments
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert party adjustments in their company"
ON public.party_adjustments
FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete party adjustments in their company"
ON public.party_adjustments
FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_party_adjustments_customer ON public.party_adjustments(customer_id);
CREATE INDEX idx_party_adjustments_date ON public.party_adjustments(date);