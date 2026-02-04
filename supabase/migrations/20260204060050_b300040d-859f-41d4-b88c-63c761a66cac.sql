-- Invoices: Allow super admin to view all
DROP POLICY IF EXISTS "Users can view invoices in their company" ON public.invoices;
CREATE POLICY "Users can view invoices in their company" 
  ON public.invoices FOR SELECT 
  USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));

-- Purchases: Allow super admin to view all
DROP POLICY IF EXISTS "Users can view purchases in their company" ON public.purchases;
CREATE POLICY "Users can view purchases in their company" 
  ON public.purchases FOR SELECT 
  USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));

-- Party Adjustments: Allow super admin to view all
DROP POLICY IF EXISTS "Users can view party adjustments in their company" ON public.party_adjustments;
CREATE POLICY "Users can view party adjustments in their company" 
  ON public.party_adjustments FOR SELECT 
  USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));