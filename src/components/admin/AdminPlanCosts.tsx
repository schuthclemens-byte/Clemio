import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  Search,
  TrendingUp,
  Users,
  Crown,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  X,
} from "lucide-react";

interface Overview {
  total_users: number;
  free_users: number;
  trial_users: number;
  premium_users: number;
  founding_users: number;
  active_subs: number;
  cancelled_subs: number;
  expired_subs: number;
  payment_failed: number;
  mrr_eur: number;
  inconsistent_premium: number;
}

interface UsageRow {
  user_id: string;
  user_name: string;
  user_phone: string;
  plan: string;
  effective_plan: string;
  subscription_status: string | null;
  subscription_provider: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_used: boolean;
  trial_end: string | null;
  premium_until: string | null;
  used: Record<string, number>;
  limits: Record<string, number>;
  pct_max: number;
  total_count: number;
}

const METRICS: Array<{ key: string; label: string; suffix?: string }> = [
  { key: "voice_listen", label: "Voice anhören" },
  { key: "ki_improve", label: "KI verbessern" },
  { key: "translate", label: "Übersetzen" },
  { key: "stt_seconds", label: "STT", suffix: "s" },
  { key: "tts_seconds", label: "TTS", suffix: "s" },
  { key: "voice_retrain", label: "Voice clones" },
];

// Geschätzte Kosten in € pro Einheit (best-effort, basierend auf
// ElevenLabs-Tarifen und Gemini-Flash). Anpassbar wenn echte Tarife bekannt.
const COST_PER_UNIT: Record<string, number> = {
  stt_seconds: 0.0001,    // ~€0.36/Stunde
  tts_seconds: 0.00018,   // ~€0.65/Stunde mp3
  ki_improve: 0.0003,     // Gemini Flash
  translate: 0.0002,      // Gemini Flash
  voice_retrain: 1.0,     // Voice-Clone Erstellung
  voice_listen: 0,        // Kosten stecken in tts_seconds
};

const calcUserCost = (used: Record<string, number>) =>
  Object.entries(COST_PER_UNIT).reduce(
    (sum, [k, rate]) => sum + (Number(used?.[k] ?? 0) * rate),
    0
  );

const planBadge = (plan: string) => {
  const map: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    trial: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    premium: "bg-primary/15 text-primary border-primary/30",
    founding: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  };
  return map[plan] || "bg-muted text-muted-foreground";
};

export default function AdminPlanCosts() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [overLimitOnly, setOverLimitOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    const [ov, list] = await Promise.all([
      (supabase as any).rpc("admin_plan_overview"),
      (supabase as any).rpc("admin_list_user_usage", {
        _search: search || null,
        _plan: planFilter === "all" ? null : planFilter,
        _over_limit_only: overLimitOnly,
        _limit: 100,
        _offset: 0,
      }),
    ]);
    if (!ov.error) setOverview(ov.data as Overview);
    if (!list.error) setRows((list.data as UsageRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planFilter, overLimitOnly]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalCost = useMemo(
    () => rows.reduce((sum, r) => sum + calcUserCost(r.used), 0),
    [rows]
  );

  const kpis = useMemo(() => {
    if (!overview) return [];
    const avgCost = overview.active_subs > 0 ? overview.mrr_eur / overview.active_subs : 0;
    return [
      { icon: TrendingUp, label: "MRR", value: `€ ${overview.mrr_eur.toFixed(2)}`, color: "text-emerald-600" },
      { icon: TrendingUp, label: "API-Kosten (sichtbar)", value: `€ ${totalCost.toFixed(2)}`, color: "text-rose-600" },
      { icon: Users, label: "Aktiv", value: overview.active_subs, color: "text-primary" },
      { icon: Crown, label: "Premium", value: overview.premium_users, color: "text-amber-600" },
      { icon: Users, label: "Trial", value: overview.trial_users, color: "text-blue-500" },
      { icon: Users, label: "Free", value: overview.free_users, color: "text-muted-foreground" },
      { icon: AlertTriangle, label: "Zahlung fehlgeschlagen", value: overview.payment_failed, color: "text-destructive" },
      { icon: TrendingUp, label: "ø Erlös/Abo", value: `€ ${avgCost.toFixed(2)}`, color: "text-emerald-600" },
    ];
  }, [overview, totalCost]);

  return (
    <div className="p-4 space-y-4">
      {/* KPIs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Plan & Kosten
          </h2>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {kpis.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border/50">
              <Icon className={`w-4 h-4 ${color} shrink-0`} />
              <div className="min-w-0">
                <span className="text-base font-bold block truncate">{value}</span>
                <span className="text-[0.65rem] text-muted-foreground">{label}</span>
              </div>
            </div>
          ))}
        </div>
        {overview && overview.inconsistent_premium > 0 && (
          <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              <strong>{overview.inconsistent_premium}</strong> Nutzer mit aktivem Premium aber abgelaufenem Abo
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Name oder Nummer suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "free", "trial", "premium", "founding"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                planFilter === p ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
              }`}
            >
              {p === "all" ? "Alle" : p}
            </button>
          ))}
          <button
            onClick={() => setOverLimitOnly((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              overLimitOnly ? "bg-destructive text-destructive-foreground border-destructive" : "bg-card border-border text-muted-foreground"
            }`}
          >
            ⚠️ Nur ≥80%
          </button>
        </div>
      </div>

      {/* Users */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Keine Nutzer gefunden</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const overLimit = r.pct_max >= 80;
            const userCost = calcUserCost(r.used);
            return (
              <Collapsible key={r.user_id}>
                <div className={`rounded-xl border ${overLimit ? "border-destructive/40" : "border-border/50"} bg-card`}>
                  <CollapsibleTrigger className="w-full flex items-center gap-3 p-3 text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{r.user_name}</span>
                        <Badge className={`text-[0.6rem] px-1.5 ${planBadge(r.effective_plan)}`}>
                          {r.effective_plan}
                        </Badge>
                        {r.subscription_provider && (
                          <Badge variant="outline" className="text-[0.6rem] px-1.5">
                            {r.subscription_provider}
                          </Badge>
                        )}
                        {r.cancel_at_period_end && (
                          <Badge variant="outline" className="text-[0.6rem] px-1.5 text-orange-500 border-orange-500/40">
                            gekündigt
                          </Badge>
                        )}
                        {overLimit && (
                          <Badge className="text-[0.6rem] px-1.5 bg-destructive/15 text-destructive border-destructive/30">
                            {Math.round(r.pct_max)}%
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[0.6rem] px-1.5 text-rose-600 border-rose-500/30">
                          € {userCost.toFixed(2)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{r.user_phone}</div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2 border-t border-border/40 pt-3">
                      {METRICS.map((m) => {
                        const used = Number(r.used?.[m.key] ?? 0);
                        const limit = Number(r.limits?.[m.key] ?? 0);
                        const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
                        return (
                          <div key={m.key}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">{m.label}</span>
                              <span className="tabular-nums">
                                {used}{m.suffix || ""} / {limit}{m.suffix || ""}
                              </span>
                            </div>
                            <Progress value={pct} className={pct >= 100 ? "bg-destructive/20" : pct >= 80 ? "bg-amber-500/20" : ""} />
                          </div>
                        );
                      })}
                      <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-muted-foreground pt-2">
                        {r.subscription_status && <div>Status: <span className="text-foreground">{r.subscription_status}</span></div>}
                        {r.current_period_end && (
                          <div>Period bis: <span className="text-foreground">{new Date(r.current_period_end).toLocaleDateString("de")}</span></div>
                        )}
                        {r.trial_end && (
                          <div>Trial bis: <span className="text-foreground">{new Date(r.trial_end).toLocaleDateString("de")}</span></div>
                        )}
                        {r.premium_until && (
                          <div>Premium bis: <span className="text-foreground">{new Date(r.premium_until).toLocaleDateString("de")}</span></div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
