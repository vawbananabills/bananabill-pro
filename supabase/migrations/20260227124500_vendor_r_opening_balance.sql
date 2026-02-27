-- Opening balance specific to Vendor R (receipt-only vendors)
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS vendor_r_opening_balance NUMERIC(15, 2) DEFAULT 0;

