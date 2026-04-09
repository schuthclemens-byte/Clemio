-- Enable RLS on realtime.messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow users to subscribe only to channels matching conversations they are members of
CREATE POLICY "Users can only subscribe to their conversation channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.is_conversation_member(
    (realtime.topic())::uuid,
    auth.uid()
  )
);

-- Also allow basic presence/broadcast channels (non-UUID topics like 'online-users')
CREATE POLICY "Users can subscribe to non-conversation channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);
