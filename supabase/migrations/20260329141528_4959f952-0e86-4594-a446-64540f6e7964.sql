
-- 1. Add DELETE policy for user_presence so users can clean up their own presence
CREATE POLICY "Users can delete own presence"
  ON public.user_presence
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
