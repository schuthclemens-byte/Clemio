-- Restrict presence visibility to self + shared conversation members
DROP POLICY IF EXISTS "Authenticated users can read presence" ON public.user_presence;

CREATE POLICY "Users can read presence of conversation members"
ON public.user_presence
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversation_members cm1
    JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
    WHERE cm1.user_id = auth.uid()
      AND cm2.user_id = user_presence.user_id
  )
);