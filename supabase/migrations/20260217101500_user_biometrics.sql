-- Create a table for biometrics
CREATE TABLE IF NOT EXISTS public.user_biometrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL,
    public_key TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    device_name TEXT,
    UNIQUE(user_id, credential_id)
);

-- Enable RLS
ALTER TABLE public.user_biometrics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own biometrics"
    ON public.user_biometrics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biometrics"
    ON public.user_biometrics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own biometrics"
    ON public.user_biometrics FOR DELETE
    USING (auth.uid() = user_id);
