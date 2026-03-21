-- Allow authenticated users to find others by phone number
CREATE POLICY "Users can search profiles by phone"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow members to mark messages as read
CREATE POLICY "Members can update message read status"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- Allow conversation creator to update conversation
CREATE POLICY "Members can update conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );