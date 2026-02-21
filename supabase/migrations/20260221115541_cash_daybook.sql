-- Create cash_daybook table
CREATE TABLE IF NOT EXISTS public.cash_daybook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    person_name TEXT NOT NULL,
    vehicle_number TEXT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('cash_in', 'cash_out')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.cash_daybook ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage company cash daybook" ON public.cash_daybook
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_cash_daybook_updated_at
BEFORE UPDATE ON public.cash_daybook
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_cash_daybook_company_id ON public.cash_daybook(company_id);
CREATE INDEX idx_cash_daybook_date ON public.cash_daybook(date);
