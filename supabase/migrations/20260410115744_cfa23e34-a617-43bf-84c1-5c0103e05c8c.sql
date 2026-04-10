
-- Fix: Non-group conversation creator can add arbitrary members
-- Drop the old permissive policy
DROP POLICY IF EXISTS "Only creator can add members" ON public.conversation_members;

-- New policy: Creator can add themselves freely.
-- For non-group conversations, the other member must have accepted an invitation.
-- For group conversations, the member must have an accepted invitation.
CREATE POLICY "Only creator can add members"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = conversation_members.conversation_id
      AND c.created_by = auth.uid()
      AND (
        -- Creator adding themselves is always allowed
        conversation_members.user_id = auth.uid()
        OR
        -- For non-group: other user must have accepted an invitation
        (
          (c.is_group IS NULL OR c.is_group = false)
          AND (
            SELECT count(*) FROM conversation_members cm WHERE cm.conversation_id = c.id
          ) < 2
          AND EXISTS (
            SELECT 1 FROM chat_invitations ci
            WHERE ci.conversation_id = c.id
              AND ci.invited_user_id = conversation_members.user_id
              AND ci.status = 'accepted'
          )
        )
        OR
        -- For groups: invited user must have accepted
        (
          c.is_group = true
          AND EXISTS (
            SELECT 1 FROM chat_invitations ci
            WHERE ci.conversation_id = c.id
              AND ci.invited_user_id = conversation_members.user_id
              AND ci.status = 'accepted'
          )
        )
      )
  )
);
