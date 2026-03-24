CREATE POLICY "Operations can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND has_role(auth.uid(), 'operations'::public.app_role)
);

CREATE POLICY "Operations can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND has_role(auth.uid(), 'operations'::public.app_role)
)
WITH CHECK (
  bucket_id = 'product-images'
  AND has_role(auth.uid(), 'operations'::public.app_role)
);

CREATE POLICY "Operations can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND has_role(auth.uid(), 'operations'::public.app_role)
);