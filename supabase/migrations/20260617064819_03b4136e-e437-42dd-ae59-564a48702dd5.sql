REVOKE EXECUTE ON FUNCTION public.get_web_vitals_summary(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_web_vitals_summary(integer) TO authenticated, service_role;
-- Function body already restricted to admins via has_role check; ensure the guard exists.
-- (No body change needed — the function already raises if caller is not admin.)