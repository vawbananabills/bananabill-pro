
CREATE TABLE public.user_biometrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credential_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  device_name TEXT DEFAULT 'Device',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_biometrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own biometrics"
ON public.user_biometrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biometrics"
ON public.user_biometrics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own biometrics"
ON public.user_biometrics FOR DELETE
USING (auth.uid() = user_id);
