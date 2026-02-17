-- Create vendor_receipts table
CREATE TABLE IF NOT EXISTS public.vendor_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    vehicle_number TEXT,
    notes TEXT,
    payment_mode TEXT DEFAULT 'Cash',
    amount_received NUMERIC(15, 2) DEFAULT 0,
    cooli NUMERIC(15, 2) DEFAULT 0,
    rent NUMERIC(15, 2) DEFAULT 0,
    padi NUMERIC(15, 2) DEFAULT 0,
    loading_charge NUMERIC(15, 2) DEFAULT 0,
    commission_percent NUMERIC(5, 2) DEFAULT 10,
    first_total NUMERIC(15, 2) DEFAULT 0,
    final_total NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Create vendor_receipt_items table
CREATE TABLE IF NOT EXISTS public.vendor_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES public.vendor_receipts(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    qty NUMERIC(15, 2) DEFAULT 0,
    gross_weight NUMERIC(15, 2) DEFAULT 0,
    net_weight NUMERIC(15, 2) DEFAULT 0,
    rate NUMERIC(15, 2) DEFAULT 0,
    amount NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vendor_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_receipt_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent "already exists" errors
DROP POLICY IF EXISTS "Users can manage their company's vendor receipts" ON public.vendor_receipts;
DROP POLICY IF EXISTS "Users can manage company vendor receipts" ON public.vendor_receipts;
DROP POLICY IF EXISTS "Users can manage their company's vendor receipt items" ON public.vendor_receipt_items;
DROP POLICY IF EXISTS "Users can manage company vendor receipt items" ON public.vendor_receipt_items;

-- Re-create policies with clean names
CREATE POLICY "Users can manage company vendor receipts" ON public.vendor_receipts
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage company vendor receipt items" ON public.vendor_receipt_items
    FOR ALL USING (receipt_id IN (SELECT id FROM vendor_receipts WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())));
