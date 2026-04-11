DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversations'
      AND policyname = 'Creators can read own conversations'
  ) THEN
    CREATE POLICY "Creators can read own conversations"
    ON public.conversations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = created_by);
  END IF;
END $$;