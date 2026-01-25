-- Create a secure function to handle new user signup with company creation
CREATE OR REPLACE FUNCTION public.handle_new_user_signup(
  p_user_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_company_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- 1. Create company
  INSERT INTO public.companies (name, invoice_prefix)
  VALUES (p_company_name, 'INV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-')
  RETURNING id INTO v_company_id;

  -- 2. Create profile
  INSERT INTO public.profiles (user_id, company_id, name, email)
  VALUES (p_user_id, v_company_id, p_name, p_email);

  -- 3. Assign owner role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'owner');

  -- 4. Create default units
  INSERT INTO public.units (company_id, name, symbol, is_default) VALUES
    (v_company_id, 'Kilogram', 'kg', true),
    (v_company_id, 'Crate', 'crate', false),
    (v_company_id, 'Bunch', 'bunch', false),
    (v_company_id, 'Box', 'box', false);

  RETURN v_company_id;
END;
$$;