
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'calling',
  call_type TEXT NOT NULL DEFAULT 'audio',
  created_at TIMESTAMPTZ DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  missed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ
);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own calls" ON public.calls
  FOR SELECT TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create calls" ON public.calls
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Participants can update calls" ON public.calls
  FOR UPDATE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
