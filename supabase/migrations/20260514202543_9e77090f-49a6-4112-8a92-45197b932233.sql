DO $$
DECLARE
  fn record;
  internal_only text[] := ARRAY[
    '_compute_phone_trial_key',
    'anonymize_trial_claim_for_user',
    'check_and_consume_quota',
    'delete_email',
    'enqueue_email',
    'read_email_batch',
    'move_to_dlq',
    'handle_new_subscription',
    'handle_new_user',
    'enforce_call_identity_fields',
    'enforce_message_update_scope',
    'notify_admin_on_report',
    'notify_chat_invitation',
    'notify_new_message',
    'log_signup_activity',
    'log_subscription_activity',
    'log_voice_activity'
  ];
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema,
           p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    -- Always strip anon and PUBLIC
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC',
                   fn.schema, fn.name, fn.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon',
                   fn.schema, fn.name, fn.args);

    -- Strip authenticated for internal-only helpers (triggers, queue, anonymization)
    IF fn.name = ANY(internal_only) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated',
                     fn.schema, fn.name, fn.args);
    END IF;
  END LOOP;
END;
$$;