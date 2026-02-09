-- Add column to store the custom subscription amount for each company
ALTER TABLE public.companies ADD COLUMN subscription_amount numeric DEFAULT NULL;
