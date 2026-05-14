
-- 1. Allow system-originated entries (no admin user)
ALTER TABLE public.admin_audit_log
  ALTER COLUMN admin_user_id DROP NOT NULL;

-- 2. Generic logger (SECURITY DEFINER so triggers can bypass RLS)
CREATE OR REPLACE FUNCTION public.log_security_event(
  _action text,
  _target_user_id uuid,
  _target_resource text,
  _metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (
    admin_user_id, action, target_user_id, target_resource, metadata, success, created_at
  ) VALUES (
    auth.uid(), _action, _target_user_id, _target_resource, COALESCE(_metadata, '{}'::jsonb), true, now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_security_event(text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- 3. Trigger: user_roles changes
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
      jsonb_build_object('role', NEW.role, 'role_row_id', NEW.id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event(
      'role_revoked', OLD.user_id, 'user_roles',
      jsonb_build_object('role', OLD.role, 'role_row_id', OLD.id)
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event(
      'role_changed', NEW.user_id, 'user_roles',
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role, 'role_row_id', NEW.id)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles();

-- 4. Trigger: subscriptions premium-state / IAP changes
CREATE OR REPLACE FUNCTION public.audit_subscription_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _changes jsonb := '{}'::jsonb;
  _action text := NULL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event(
      'subscription_created', NEW.user_id, 'subscriptions',
      jsonb_build_object(
        'premium_status', NEW.premium_status,
        'premium_plan', NEW.premium_plan,
        'iap_provider', NEW.iap_provider,
        'iap_product_id', NEW.iap_product_id,
        'iap_environment', NEW.iap_environment,
        'period_end', NEW.premium_current_period_end
      )
    );
    RETURN NEW;
  END IF;

  -- UPDATE: only log when something security-relevant changed
  IF NEW.premium_status IS DISTINCT FROM OLD.premium_status THEN
    _changes := _changes || jsonb_build_object(
      'premium_status', jsonb_build_object('old', OLD.premium_status, 'new', NEW.premium_status)
    );
    _action := 'premium_status_changed';
  END IF;
  IF NEW.premium_plan IS DISTINCT FROM OLD.premium_plan THEN
    _changes := _changes || jsonb_build_object(
      'premium_plan', jsonb_build_object('old', OLD.premium_plan, 'new', NEW.premium_plan)
    );
    _action := COALESCE(_action, 'premium_plan_changed');
  END IF;
  IF NEW.iap_provider IS DISTINCT FROM OLD.iap_provider
     OR NEW.iap_product_id IS DISTINCT FROM OLD.iap_product_id
     OR NEW.iap_original_transaction_id IS DISTINCT FROM OLD.iap_original_transaction_id THEN
    _changes := _changes || jsonb_build_object(
      'iap', jsonb_build_object(
        'provider', jsonb_build_object('old', OLD.iap_provider, 'new', NEW.iap_provider),
        'product_id', jsonb_build_object('old', OLD.iap_product_id, 'new', NEW.iap_product_id),
        'original_transaction_id', jsonb_build_object('old', OLD.iap_original_transaction_id, 'new', NEW.iap_original_transaction_id)
      )
    );
    _action := COALESCE(_action, 'iap_subscription_updated');
  END IF;
  IF NEW.cancel_at_period_end IS DISTINCT FROM OLD.cancel_at_period_end THEN
    _changes := _changes || jsonb_build_object(
      'cancel_at_period_end', jsonb_build_object('old', OLD.cancel_at_period_end, 'new', NEW.cancel_at_period_end)
    );
    _action := COALESCE(_action, 'subscription_cancellation_toggled');
  END IF;

  IF _action IS NOT NULL THEN
    PERFORM public.log_security_event(
      _action, NEW.user_id, 'subscriptions',
      _changes || jsonb_build_object('iap_environment', NEW.iap_environment)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_subscription_changes ON public.subscriptions;
CREATE TRIGGER trg_audit_subscription_changes
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.audit_subscription_changes();

-- 5. Lock down new helper functions (triggers run as definer regardless)
REVOKE EXECUTE ON FUNCTION public.audit_user_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_subscription_changes() FROM PUBLIC, anon, authenticated;
