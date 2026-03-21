-- 1) Allow members to delete their own messages
CREATE POLICY "Members can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- 2) Create message_reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read reactions"
ON public.message_reactions
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.messages m
  WHERE m.id = message_id
  AND is_conversation_member(m.conversation_id, auth.uid())
));

CREATE POLICY "Users can add reactions"
ON public.message_reactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.messages m
  WHERE m.id = message_id
  AND is_conversation_member(m.conversation_id, auth.uid())
));

CREATE POLICY "Users can remove own reactions"
ON public.message_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3) Create typing_indicators table (ephemeral)
CREATE TABLE public.typing_indicators (
  user_id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read typing"
ON public.typing_indicators
FOR SELECT
TO authenticated
USING (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can upsert own typing"
ON public.typing_indicators
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own typing"
ON public.typing_indicators
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own typing"
ON public.typing_indicators
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4) Enable realtime for typing_indicators and message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- 5) Allow profile deletion (for account deletion)
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- 6) Allow conversation deletion
CREATE POLICY "Creator can delete conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- 7) Allow subscription deletion
CREATE POLICY "Users can delete own subscription"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 8) Allow voice consent deletion
CREATE POLICY "Users can delete own consents"
ON public.voice_consents
FOR DELETE
TO authenticated
USING (auth.uid() = voice_owner_id OR auth.uid() = granted_to_user_id);