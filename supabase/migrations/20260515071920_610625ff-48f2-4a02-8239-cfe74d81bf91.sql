-- 1. Add context columns to admin_audit_log
ALTER TABLE public.admin_audit_log
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_source ON public.admin_audit_log(source);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user ON public.admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- 2. Helper to extract request context from PostgREST headers (best-effort, never throws)
CREATE OR REPLACE FUNCTION public.audit_request_context()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  headers jsonb;
  ip text;
  ua text;
  rid text;
BEGIN
  BEGIN
    headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN others THEN
    headers := '{}'::jsonb;
  END;

  IF headers IS NULL THEN headers := '{}'::jsonb; END IF;

  ip := COALESCE(
    headers->>'cf-connecting-ip',
    headers->>'x-real-ip',
    split_part(COALESCE(headers->>'x-forwarded-for', ''), ',', 1)
  );
  ua := headers->>'user-agent';
  rid := COALESCE(headers->>'x-request-id', headers->>'cf-ray');

  RETURN jsonb_build_object(
    'ip_address', NULLIF(trim(ip), ''),
    'user_agent', NULLIF(trim(ua), ''),
    'request_id', NULLIF(trim(rid), '')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_request_context() FROM PUBLIC, anon, authenticated;

-- 3. Update log_security_event helper to accept and store request context
CREATE OR REPLACE FUNCTION public.log_security_event(
  _action text,
  _target_user_id uuid,
  _target_resource text,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _source text DEFAULT 'db_trigger'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ctx jsonb;
  actor uuid;
  actor_role_txt text;
BEGIN
  ctx := public.audit_request_context();
  actor := auth.uid();

  IF actor IS NOT NULL THEN
    SELECT string_agg(role::text, ',') INTO actor_role_txt
    FROM public.user_roles WHERE user_id = actor;
  END IF;

  INSERT INTO public.admin_audit_log (
    admin_user_id, action, target_user_id, target_resource,
    metadata, success, ip_address, user_agent, request_id,
    actor_role, source
  ) VALUES (
    actor, _action, _target_user_id, _target_resource,
    COALESCE(_metadata, '{}'::jsonb), true,
    ctx->>'ip_address', ctx->>'user_agent', ctx->>'request_id',
    COALESCE(actor_role_txt, CASE WHEN actor IS NULL THEN 'system' ELSE 'user' END),
    _source
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_security_event(text, uuid, text, jsonb, text) FROM PUBLIC, anon, authenticated;

-- 4. Recreate audit triggers to use enriched helper
CREATE OR REPLACE FUNCTION public.audit_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event(
      'role_granted', NEW.user_id, 'user_roles',
      jsonb_build_object('role', NEW.role::text, 'role_id', NEW.id),
      'db_trigger'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event(
      'role_revoked', OLD.user_id, 'user_roles',
      jsonb_build_object('role', OLD.role::text, 'role_id', OLD.id),
      'db_trigger'
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    PERFORM public.log_security_event(
      'role_changed', NEW.user_id, 'user_roles',
      jsonb_build_object('old_role', OLD.role::text, 'new_role', NEW.role::text, 'role_id', NEW.id),
      'db_trigger'
    );
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_subscription_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  diff jsonb := '{}'::jsonb;
BEGIN
  IF NEW.premium_status IS DISTINCT FROM OLD.premium_status THEN
    diff := diff || jsonb_build_object('premium_status', jsonb_build_object('old', OLD.premium_status, 'new', NEW.premium_status));
  END IF;
  IF NEW.premium_plan IS DISTINCT FROM OLD.premium_plan THEN
    diff := diff || jsonb_build_object('premium_plan', jsonb_build_object('old', OLD.premium_plan, 'new', NEW.premium_plan));
  END IF;
  IF NEW.iap_provider IS DISTINCT FROM OLD.iap_provider THEN
    diff := diff || jsonb_build_object('iap_provider', jsonb_build_object('old', OLD.iap_provider, 'new', NEW.iap_provider));
  END IF;
  IF NEW.iap_product_id IS DISTINCT FROM OLD.iap_product_id THEN
    diff := diff || jsonb_build_object('iap_product_id', jsonb_build_object('old', OLD.iap_product_id, 'new', NEW.iap_product_id));
  END IF;
  IF NEW.iap_original_transaction_id IS DISTINCT FROM OLD.iap_original_transaction_id THEN
    diff := diff || jsonb_build_object('iap_original_transaction_id', jsonb_build_object('old', OLD.iap_original_transaction_id, 'new', NEW.iap_original_transaction_id));
  END IF;
  IF NEW.cancel_at_period_end IS DISTINCT FROM OLD.cancel_at_period_end THEN
    diff := diff || jsonb_build_object('cancel_at_period_end', jsonb_build_object('old', OLD.cancel_at_period_end, 'new', NEW.cancel_at_period_end));
  END IF;

  IF diff <> '{}'::jsonb THEN
    PERFORM public.log_security_event(
      'subscription_changed', NEW.user_id, 'subscriptions',
      diff, 'db_trigger'
    );
  END IF;
  RETURN NEW;
END;
$$;
