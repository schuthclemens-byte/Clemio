import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

interface AuditEntry {
  id: string;
  admin_user_id: string;
  action: string;
  target_user_id: string | null;
  target_resource: string | null;
  metadata: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

const AdminAuditLog = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!error) setEntries((data || []) as AuditEntry[]);
      setLoading(false);
    })();
  }, []);

  const actions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action))).sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (actionFilter && e.action !== actionFilter) return false;
      if (!q) return true;
      return (
        e.action.toLowerCase().includes(q) ||
        e.admin_user_id.includes(q) ||
        (e.target_user_id || "").includes(q) ||
        (e.target_resource || "").toLowerCase().includes(q)
      );
    });
  }, [entries, search, actionFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Suche nach Action, Admin-ID, Ziel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Alle Aktionen</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtered.length} von {entries.length} Einträgen
      </div>

      <div className="space-y-2">
        {filtered.map((e) => (
          <div
            key={e.id}
            className="rounded-lg border border-border bg-card p-3 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              {e.success ? (
                <ShieldCheck className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
              <Badge variant={e.success ? "secondary" : "destructive"}>
                {e.action}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString("de-DE")}
              </span>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Admin:</span>{" "}
                <code className="font-mono">{e.admin_user_id.slice(0, 8)}…</code>
              </div>
              {e.target_user_id && (
                <div>
                  <span className="font-medium text-foreground">Ziel-User:</span>{" "}
                  <code className="font-mono">{e.target_user_id.slice(0, 8)}…</code>
                </div>
              )}
              {e.target_resource && (
                <div>
                  <span className="font-medium text-foreground">Ressource:</span>{" "}
                  <code className="font-mono">{e.target_resource}</code>
                </div>
              )}
              {e.error_message && (
                <div className="text-destructive">
                  <span className="font-medium">Fehler:</span> {e.error_message}
                </div>
              )}
              {Object.keys(e.metadata || {}).length > 0 && (
                <details>
                  <summary className="cursor-pointer">Metadata</summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-[10px]">
                    {JSON.stringify(e.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Keine Einträge gefunden.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLog;
