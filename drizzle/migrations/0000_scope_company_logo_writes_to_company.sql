DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload company logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND (
    (storage.foldername(name))[1] = public.get_user_company_id((SELECT auth.uid()))::text
    OR public.is_super_admin((SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can update their company logos" ON storage.objects;
CREATE POLICY "Users can update their company logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (
    (storage.foldername(name))[1] = public.get_user_company_id((SELECT auth.uid()))::text
    OR public.is_super_admin((SELECT auth.uid()))
  )
)
WITH CHECK (
  bucket_id = 'company-logos'
  AND (
    (storage.foldername(name))[1] = public.get_user_company_id((SELECT auth.uid()))::text
    OR public.is_super_admin((SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can delete their company logos" ON storage.objects;
CREATE POLICY "Users can delete their company logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (
    (storage.foldername(name))[1] = public.get_user_company_id((SELECT auth.uid()))::text
    OR public.is_super_admin((SELECT auth.uid()))
  )
);