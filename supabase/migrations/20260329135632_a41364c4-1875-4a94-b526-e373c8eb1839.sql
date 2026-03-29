
-- 1. Add unique constraint on voice_consents to prevent duplicate requests
CREATE UNIQUE INDEX IF NOT EXISTS uq_voice_consents_owner_grantee 
ON public.voice_consents (voice_owner_id, granted_to_user_id);

-- 2. Create chat_invitations table for group invitation flow
CREATE TABLE IF NOT EXISTS public.chat_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  invited_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (conversation_id, invited_user_id)
);

ALTER TABLE public.chat_invitations ENABLE ROW LEVEL SECURITY;

-- Inviter can create invitations (only conversation creator)
CREATE POLICY "Creator can invite" ON public.chat_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = invited_by
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = chat_invitations.conversation_id
        AND created_by = auth.uid()
    )
  );

-- Both parties can read the invitation
CREATE POLICY "Parties can read invitations" ON public.chat_invitations
  FOR SELECT TO authenticated
  USING (auth.uid() = invited_by OR auth.uid() = invited_user_id);

-- Invited user can update (accept/decline)
CREATE POLICY "Invited user can respond" ON public.chat_invitations
  FOR UPDATE TO authenticated
  USING (auth.uid() = invited_user_id);

-- Either party can delete
CREATE POLICY "Parties can delete invitations" ON public.chat_invitations
  FOR DELETE TO authenticated
  USING (auth.uid() = invited_by OR auth.uid() = invited_user_id);
