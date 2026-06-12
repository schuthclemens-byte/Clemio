import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus, Activity, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MetricName = "LCP" | "CLS" | "FCP" | "INP" | "TTFB";

interface SummaryRow {
  route: string;
  metric: MetricName;
  p75_current: number | null;
  p75_previous: number | null;
  delta_pct: number | null;
  sample_count_current: number;
  sample_count_previous: number;
  good_pct: number | null;
}

const METRIC_ORDER: MetricName[] = ["LCP", "CLS", "FCP", "INP"];

// Google Web Vitals thresholds (p75)
const THRESHOLDS: Record<MetricName, { good: number; poor: number; unit: string; decimals: number }> = {
  LCP: { good: 2500, poor: 4000, unit: "ms", decimals: 0 },
  FCP: { good: 1800, poor: 3000, unit: "ms", decimals: 0 },
  INP: { good: 200, poor: 500, unit: "ms", decimals: 0 },
  CLS: { good: 0.1, poor: 0.25, unit: "", decimals: 3 },
  TTFB: { good: 800, poor: 1800, unit: "ms", decimals: 0 },
};

function rateValue(metric: MetricName, value: number | null): "good" | "ni" | "poor" | "none" {
  if (value == null) return "none";
  const t = THRESHOLDS[metric];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "ni";
  return "poor";
}

function formatValue(metric: MetricName, value: number | null): string {
  if (value == null) return "—";
  const t = THRESHOLDS[metric];
  return `${value.toFixed(t.decimals)}${t.unit}`;
}

function ratingColor(rating: "good" | "ni" | "poor" | "none"): string {
  switch (rating) {
    case "good": return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
    case "ni": return "bg-amber-500/15 text-amber-600 border-amber-500/30";
    case "poor": return "bg-destructive/15 text-destructive border-destructive/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

interface TrendBadgeProps {
  delta: number | null;
  /** For LCP/CLS/FCP/INP, lower = better, so positive delta is bad */
  lowerIsBetter: boolean;
}

function TrendBadge({ delta, lowerIsBetter }: TrendBadgeProps) {
  if (delta == null) return <span className="text-xs text-muted-foreground">neu</span>;
  const absDelta = Math.abs(delta);
  if (absDelta < 2) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" /> stabil
      </span>
    );
  }
  const isWorse = lowerIsBetter ? delta > 0 : delta < 0;
  const isSignificant = absDelta >= 10;
  const Icon = lowerIsBetter
    ? (delta > 0 ? TrendingUp : TrendingDown)
    : (delta > 0 ? TrendingUp : TrendingDown);
  const color = isWorse
    ? (isSignificant ? "text-destructive" : "text-amber-600")
    : "text-emerald-600";
  const sign = delta > 0 ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {sign}{delta.toFixed(1)}%
    </span>
  );
}

const AdminWebVitals = () => {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(7);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("get_web_vitals_summary", { _days: days });
    if (rpcError) {
      setError(rpcError.message);
      setRows([]);
    } else {
      setRows((data || []) as SummaryRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [days]);

  const byRoute = useMemo(() => {
    const map = new Map<string, Map<MetricName, SummaryRow>>();
    for (const r of rows) {
      if (!map.has(r.route)) map.set(r.route, new Map());
      map.get(r.route)!.set(r.metric as MetricName, r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const totalSamples = useMemo(
    () => rows.reduce((sum, r) => sum + (r.sample_count_current || 0), 0),
    [rows]
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Web Vitals — Öffentliche Seiten
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            p75 der letzten {days} Tage · Δ ggü. vorherigen {days} Tagen · {totalSamples} Messpunkte
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            {[1, 7, 30].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  days === d ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {d}T
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className={ratingColor("good")}>Good</Badge>
        <Badge variant="outline" className={ratingColor("ni")}>Needs Improvement</Badge>
        <Badge variant="outline" className={ratingColor("poor")}>Poor</Badge>
        <span className="text-muted-foreground ml-2">
          LCP ≤2.5s · FCP ≤1.8s · INP ≤200ms · CLS ≤0.1
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : byRoute.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Messdaten. Sobald Besucher die öffentlichen Seiten aufrufen, werden hier LCP/CLS/FCP/INP angezeigt.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {byRoute.map(([route, metricsMap]) => (
            <div key={route} className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                <code className="text-sm font-semibold">{route}</code>
                <span className="text-[0.65rem] text-muted-foreground">
                  {Math.max(...Array.from(metricsMap.values()).map(r => r.sample_count_current))} Samples
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/50">
                {METRIC_ORDER.map(metric => {
                  const row = metricsMap.get(metric);
                  const rating = rateValue(metric, row?.p75_current ?? null);
                  return (
                    <div key={metric} className="p-3 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold">
                          {metric}
                        </span>
                        {row && (
                          <Badge variant="outline" className={`${ratingColor(rating)} text-[0.6rem] px-1.5 py-0`}>
                            {rating === "good" ? "good" : rating === "ni" ? "ni" : rating === "poor" ? "poor" : "—"}
                          </Badge>
                        )}
                      </div>
                      <span className="text-lg font-bold tabular-nums">
                        {formatValue(metric, row?.p75_current ?? null)}
                      </span>
                      {row ? (
                        <div className="flex items-center justify-between">
                          <TrendBadge delta={row.delta_pct} lowerIsBetter={true} />
                          <span className="text-[0.6rem] text-muted-foreground tabular-nums">
                            n={row.sample_count_current}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[0.65rem] text-muted-foreground">keine Daten</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminWebVitals;
