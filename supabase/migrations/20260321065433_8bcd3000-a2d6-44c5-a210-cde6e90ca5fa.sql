DROP POLICY "Auth users can add members" ON public.conversation_members;

CREATE POLICY "Auth users can add members to own conversations"
  ON public.conversation_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id AND created_by = auth.uid()
    )
    OR user_id = auth.uid()
  );