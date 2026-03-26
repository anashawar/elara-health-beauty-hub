
INSERT INTO storage.buckets (id, name, public)
VALUES ('database-backups', 'database-backups', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Only admins can access backups"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'database-backups' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'database-backups' AND public.has_role(auth.uid(), 'admin'));
