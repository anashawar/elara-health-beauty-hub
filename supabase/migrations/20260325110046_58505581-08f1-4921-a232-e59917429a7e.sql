
-- Create skin-scans storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('skin-scans', 'skin-scans', false);

-- Only authenticated users can upload their own scans
CREATE POLICY "Users can upload their own scans"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'skin-scans' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can view their own scans
CREATE POLICY "Users can view their own scans"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'skin-scans' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own scans
CREATE POLICY "Users can delete their own scans"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'skin-scans' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can view all scans
CREATE POLICY "Admins can view all skin scans"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'skin-scans' AND public.has_role(auth.uid(), 'admin'));
