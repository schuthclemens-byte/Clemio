-- 1. Tabelle
CREATE TABLE public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_activity_log_event_type_check CHECK (
    event_type IN (
      'signup', 'premium_activated', 'premium_cancelled',
      'voice_cloned', 'voice_deleted', 'account_deleted',
      'profile_completed', 'first_chat_created'
    )
  )
);

CREATE INDEX idx_user_activity_log_created_at ON public.user_activity_log (created_at DESC);
CREATE INDEX idx_user_activity_log_user_id ON public.user_activity_log (user_id);
CREATE INDEX idx_user_activity_log_event_type ON public.user_activity_log (event_type);

-- 2. RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read activity log"
  ON public.user_activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role can write activity log"
  ON public.user_activity_log FOR INSERT TO service_role
  WITH CHECK (true);

-- 3. Helper für Display-Name
CREATE OR REPLACE FUNCTION public.user_activity_display_name(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(p.display_name, ''), NULLIF(p.first_name, ''), 'Nutzer')
  FROM public.profiles p WHERE p.id = _user_id
$$;

-- 4. Trigger: Anmeldung (auf profiles, da handle_new_user dort einfügt)
CREATE OR REPLACE FUNCTION public.log_signup_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text := COALESCE(NULLIF(NEW.display_name, ''), NULLIF(NEW.first_name, ''), 'Nutzer');
BEGIN
  INSERT INTO public.user_activity_log (user_id, event_type, description, metadata)
  VALUES (
    NEW.id, 'signup',
    _name || ' hat sich angemeldet.',
    jsonb_build_object('phone_number', NEW.phone_number, 'source', 'profiles_trigger')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_signup_activity
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_signup_activity();

-- 5. Trigger: Premium aktiviert/gekündigt
CREATE OR REPLACE FUNCTION public.log_subscription_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _name text := public.user_activity_display_name(NEW.user_id);
  _was_premium boolean := COALESCE(OLD.premium_until, 'epoch'::timestamptz) > now() OR OLD.plan IN ('founding','premium','stripe');
  _is_premium boolean := COALESCE(NEW.premium_until, 'epoch'::timestamptz) > now() OR NEW.plan IN ('founding','premium','stripe');
BEGIN
  IF TG_OP = 'INSERT' AND _is_premium AND NEW.plan <> 'trial' THEN
    INSERT INTO public.user_activity_log (user_id, event_type, description, metadata)
    VALUES (NEW.user_id, 'premium_activated',
      _name || ' hat Premium aktiviert (Plan: ' || NEW.plan || ').',
      jsonb_build_object('plan', NEW.plan, 'premium_until', NEW.premium_until, 'is_founding_user', NEW.is_founding_user));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NOT _was_premium AND _is_premium THEN
      INSERT INTO public.user_activity_log (user_id, event_type, description, metadata)
      VALUES (NEW.user_id, 'premium_activated',
        _name || ' hat Premium aktiviert (Plan: ' || NEW.plan || ').',
        jsonb_build_object('plan', NEW.plan, 'premium_until', NEW.premium_until, 'previous_plan', OLD.plan));
    ELSIF _was_premium AND NOT _is_premium THEN
      INSERT INTO public.user_activity_log (user_id, event_type, description, metadata)
      VALUES (NEW.user_id, 'premium_cancelled',
        _name || ' hat Premium gekündigt oder Premium ist abgelaufen.',
        jsonb_build_object('plan', NEW.plan, 'previous_plan', OLD.plan, 'previous_until', OLD.premium_until));
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_subscription_activity
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.log_subscription_activity();

-- 6. Trigger: Stimme geklont/gelöscht
CREATE OR REPLACE FUNCTION public.log_voice_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _name := public.user_activity_display_name(NEW.user_id);
    INSERT INTO public.user_activity_log (user_id, event_type, description, metadata)
    VALUES (NEW.user_id, 'voice_cloned',
      _name || ' hat eine eigene Stimme geklont' || COALESCE(' („' || NEW.voice_name || '")', '') || '.',
      jsonb_build_object('voice_id', NEW.elevenlabs_voice_id, 'voice_name', NEW.voice_name));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    _name := public.user_activity_display_name(OLD.user_id);
    INSERT INTO public.user_activity_log (user_id, event_type, description, metadata)
    VALUES (OLD.user_id, 'voice_deleted',
      _name || ' hat die eigene Stimme gelöscht.',
      jsonb_build_object('voice_id', OLD.elevenlabs_voice_id, 'voice_name', OLD.voice_name));
    RETURN OLD;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_log_voice_activity
AFTER INSERT OR DELETE ON public.voice_profiles
FOR EACH ROW EXECUTE FUNCTION public.log_voice_activity();

-- 7. RPC für die Admin-UI
CREATE OR REPLACE FUNCTION public.list_user_activity(
  _event_type text DEFAULT NULL,
  _search text DEFAULT NULL,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, user_id uuid, event_type text, description text, metadata jsonb, created_at timestamptz,
  user_name text, user_phone text, user_avatar text, total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _safe_limit int := LEAST(GREATEST(COALESCE(_limit, 50), 1), 100);
  _safe_offset int := GREATEST(COALESCE(_offset, 0), 0);
  _safe_search text := NULLIF(trim(COALESCE(_search, '')), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT a.*,
      COALESCE(NULLIF(p.display_name, ''), NULLIF(p.first_name, ''), 'Unbekannt') AS resolved_name,
      p.phone_number AS resolved_phone,
      p.avatar_url AS resolved_avatar,
      count(*) OVER() AS matched_count
    FROM public.user_activity_log a
    LEFT JOIN public.profiles p ON p.id = a.user_id
    WHERE (_event_type IS NULL OR a.event_type = _event_type)
      AND (_from IS NULL OR a.created_at >= _from)
      AND (_to IS NULL OR a.created_at <= _to)
      AND (_safe_search IS NULL
           OR a.description ILIKE '%' || _safe_search || '%'
           OR p.display_name ILIKE '%' || _safe_search || '%'
           OR p.first_name ILIKE '%' || _safe_search || '%'
           OR p.phone_number ILIKE '%' || _safe_search || '%')
  )
  SELECT f.id, f.user_id, f.event_type, f.description, f.metadata, f.created_at,
         f.resolved_name, f.resolved_phone, f.resolved_avatar, f.matched_count
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT _safe_limit OFFSET _safe_offset;
END;
$$;

-- 8. Backfill: Anmeldungen aus profiles
INSERT INTO public.user_activity_log (user_id, event_type, description, metadata, created_at)
SELECT
  p.id,
  'signup',
  COALESCE(NULLIF(p.display_name, ''), NULLIF(p.first_name, ''), 'Nutzer') || ' hat sich angemeldet.',
  jsonb_build_object('phone_number', p.phone_number, 'source', 'backfill'),
  COALESCE(p.created_at, now())
FROM public.profiles p
ON CONFLICT DO NOTHING;

-- 9. Backfill: aktive Premium-Abos
INSERT INTO public.user_activity_log (user_id, event_type, description, metadata, created_at)
SELECT
  s.user_id,
  'premium_activated',
  COALESCE(NULLIF(p.display_name, ''), NULLIF(p.first_name, ''), 'Nutzer')
    || ' hat Premium aktiviert (Plan: ' || s.plan || ').',
  jsonb_build_object('plan', s.plan, 'premium_until', s.premium_until,
                     'is_founding_user', s.is_founding_user, 'source', 'backfill'),
  COALESCE(s.created_at, now())
FROM public.subscriptions s
LEFT JOIN public.profiles p ON p.id = s.user_id
WHERE s.plan IN ('founding', 'premium', 'stripe')
   OR (s.premium_until IS NOT NULL AND s.premium_until > now() AND s.plan <> 'trial');