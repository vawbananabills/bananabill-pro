-- Drop existing SELECT policies and recreate with super admin access

-- Customers: Allow super admin to view all
DROP POLICY IF EXISTS "Users can view customers in their company" ON public.customers;
CREATE POLICY "Users can view customers in their company" 
  ON public.customers FOR SELECT 
  USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));

-- Vendors: Allow super admin to view all
DROP POLICY IF EXISTS "Users can view vendors in their company" ON public.vendors;
CREATE POLICY "Users can view vendors in their company" 
  ON public.vendors FOR SELECT 
  USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));

-- Products: Allow super admin to view all
DROP POLICY IF EXISTS "Users can view products in their company" ON public.products;
CREATE POLICY "Users can view products in their company" 
  ON public.products FOR SELECT 
  USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));

-- Payments: Allow super admin to view all
DROP POLICY IF EXISTS "Users can view payments in their company" ON public.payments;
CREATE POLICY "Users can view payments in their company" 
  ON public.payments FOR SELECT 
  USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));