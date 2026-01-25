-- Update RLS policies to allow super admins to view all data

-- Companies: Super admins can view all
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company" ON public.companies
FOR SELECT USING (
  id = get_user_company_id(auth.uid()) 
  OR is_super_admin(auth.uid())
);

-- Super admins can update any company
DROP POLICY IF EXISTS "Super admins can update any company" ON public.companies;
CREATE POLICY "Super admins can update any company" ON public.companies
FOR UPDATE USING (is_super_admin(auth.uid()));

-- Profiles: Super admins can view all
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
CREATE POLICY "Users can view profiles in their company" ON public.profiles
FOR SELECT USING (
  company_id = get_user_company_id(auth.uid()) 
  OR is_super_admin(auth.uid())
);

-- User roles: Super admins can view all
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (
  user_id = auth.uid() 
  OR is_super_admin(auth.uid())
);

-- Invoices: Super admins can view all
DROP POLICY IF EXISTS "Super admins can view all invoices" ON public.invoices;
CREATE POLICY "Super admins can view all invoices" ON public.invoices
FOR SELECT USING (is_super_admin(auth.uid()));

-- Purchases: Super admins can view all
DROP POLICY IF EXISTS "Super admins can view all purchases" ON public.purchases;
CREATE POLICY "Super admins can view all purchases" ON public.purchases
FOR SELECT USING (is_super_admin(auth.uid()));