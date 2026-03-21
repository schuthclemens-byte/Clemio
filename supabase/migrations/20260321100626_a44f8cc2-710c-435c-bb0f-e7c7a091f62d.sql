
CREATE TABLE public.contact_autoplay (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_user_id uuid NOT NULL,
  auto_play boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, contact_user_id)
);

ALTER TABLE public.contact_autoplay ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own autoplay settings"
  ON public.contact_autoplay FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own autoplay settings"
  ON public.contact_autoplay FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own autoplay settings"
  ON public.contact_autoplay FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own autoplay settings"
  ON public.contact_autoplay FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
