-- 1. Table
CREATE TABLE public.web_vitals_samples (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route text NOT NULL,
  metric text NOT NULL CHECK (metric IN ('LCP','CLS','FCP','INP','TTFB')),
  value numeric NOT NULL,
  rating text CHECK (rating IN ('good','needs-improvement','poor')),
  device text CHECK (device IN ('mobile','desktop','tablet','unknown')),
  navigation_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_web_vitals_route_metric_created ON public.web_vitals_samples (route, metric, created_at DESC);
CREATE INDEX idx_web_vitals_created ON public.web_vitals_samples (created_at DESC);

-- 2. Grants
GRANT INSERT ON public.web_vitals_samples TO anon, authenticated;
GRANT SELECT ON public.web_vitals_samples TO authenticated;
GRANT ALL ON public.web_vitals_samples TO service_role;

-- 3. RLS
ALTER TABLE public.web_vitals_samples ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Anyone can insert web vitals samples"
  ON public.web_vitals_samples FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(route) <= 200
    AND value >= 0
    AND value < 1000000
  );

CREATE POLICY "Admins can read web vitals samples"
  ON public.web_vitals_samples FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. Summary RPC
CREATE OR REPLACE FUNCTION public.get_web_vitals_summary(_days integer DEFAULT 7)
RETURNS TABLE (
  route text,
  metric text,
  p75_current numeric,
  p75_previous numeric,
  delta_pct numeric,
  sample_count_current bigint,
  sample_count_previous bigint,
  good_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _safe_days integer := LEAST(GREATEST(COALESCE(_days, 7), 1), 90);
  _now timestamptz := now();
  _cur_from timestamptz := _now - make_interval(days => _safe_days);
  _prev_from timestamptz := _now - make_interval(days => _safe_days * 2);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH cur AS (
    SELECT s.route, s.metric,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY s.value) AS p75,
      count(*) AS n,
      count(*) FILTER (WHERE s.rating = 'good')::numeric AS good_n
    FROM public.web_vitals_samples s
    WHERE s.created_at >= _cur_from
    GROUP BY s.route, s.metric
  ),
  prev AS (
    SELECT s.route, s.metric,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY s.value) AS p75,
      count(*) AS n
    FROM public.web_vitals_samples s
    WHERE s.created_at >= _prev_from AND s.created_at < _cur_from
    GROUP BY s.route, s.metric
  )
  SELECT
    c.route,
    c.metric,
    round(c.p75::numeric, 3) AS p75_current,
    round(p.p75::numeric, 3) AS p75_previous,
    CASE WHEN p.p75 IS NULL OR p.p75 = 0 THEN NULL
         ELSE round(((c.p75 - p.p75) / p.p75 * 100)::numeric, 1)
    END AS delta_pct,
    c.n AS sample_count_current,
    COALESCE(p.n, 0) AS sample_count_previous,
    CASE WHEN c.n = 0 THEN NULL ELSE round((c.good_n / c.n * 100)::numeric, 1) END AS good_pct
  FROM cur c
  LEFT JOIN prev p ON p.route = c.route AND p.metric = c.metric
  ORDER BY c.route, c.metric;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_web_vitals_summary(integer) TO authenticated;