-- Update the signup function to auto-assign trial subscription
CREATE OR REPLACE FUNCTION public.handle_new_user_signup(p_user_id uuid, p_name text, p_email text, p_company_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_company_id UUID;
  v_trial_days INTEGER;
BEGIN
  -- Get trial duration from settings
  SELECT trial_duration_days INTO v_trial_days FROM public.subscription_settings LIMIT 1;
  IF v_trial_days IS NULL THEN
    v_trial_days := 14;
  END IF;

  -- 1. Create company with trial subscription
  INSERT INTO public.companies (name, invoice_prefix, subscription_status, subscription_started_at, subscription_expires_at)
  VALUES (
    p_company_name, 
    'INV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-',
    'trial',
    NOW(),
    NOW() + (v_trial_days || ' days')::INTERVAL
  )
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