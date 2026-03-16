
CREATE POLICY "Users can update their own support conversations"
  ON public.support_conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
