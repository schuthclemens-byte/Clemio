
-- Focus contacts: which contacts should be read aloud in focus mode
CREATE TABLE public.focus_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, contact_user_id)
);

ALTER TABLE public.focus_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own focus contacts"
  ON public.focus_contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus contacts"
  ON public.focus_contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus contacts"
  ON public.focus_contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
