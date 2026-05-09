import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Archive, RotateCcw, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAccessibleProfiles } from "@/lib/accessibleProfiles";
import {
  trashConversations,
  restoreConversations,
  purgeConversations,
} from "@/lib/chatManagement";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ManagedChatItem {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar?: string;
  deleted_at?: string | null;
}

interface Props {
  /** "archived" = is_archived=true & deleted_at IS NULL. "trash" = deleted_at IS NOT NULL. */
  mode: "archived" | "trash";
  title: string;
}

const daysUntilPurge = (deletedAt?: string | null): number => {
  if (!deletedAt) return 30;
  const elapsed = (Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(30 - elapsed));
};

const ManageChatsPage = ({ mode, title }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<ManagedChatItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!memberships || memberships.length === 0) {
        setItems([]);
        return;
      }

      const convIds = memberships.map((m) => m.conversation_id);

      let query = supabase
        .from("conversations")
        .select("*")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      if (mode === "archived") {
        query = query.eq("is_archived", true).is("deleted_at" as any, null);
      } else {
        query = query.not("deleted_at" as any, "is", null);
      }

      const { data: convos } = await query;
      if (!convos || convos.length === 0) {
        setItems([]);
        return;
      }

      const { data: members } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id")
        .in("conversation_id", convos.map((c) => c.id))
        .neq("user_id", user.id);

      const otherMap = new Map<string, string>();
      members?.forEach((m) => {
        if (!otherMap.has(m.conversation_id)) otherMap.set(m.conversation_id, m.user_id);
      });

      const profileIds = new Set<string>();
      convos.forEach((c) => {
        if (!c.is_group) {
          const o = otherMap.get(c.id);
          if (o) profileIds.add(o);
        }
      });

      const profileMap = new Map<string, { display_name: string | null }>();
      if (profileIds.size > 0) {
        const profiles = await fetchAccessibleProfiles(Array.from(profileIds));
        profiles.forEach((p) => profileMap.set(p.id, p));
      }

      const result: ManagedChatItem[] = convos.map((conv) => {
        let name = conv.name || "Chat";
        if (!conv.is_group) {
          const otherId = otherMap.get(conv.id);
          if (otherId) {
            name = profileMap.get(otherId)?.display_name || "Chat";
          }
        }
        return {
          id: conv.id,
          name,
          lastMessage: "",
          time: conv.updated_at
            ? new Date(conv.updated_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
            : "",
          avatar: (conv as any).avatar_url || undefined,
          deleted_at: (conv as any).deleted_at,
        };
      });

      setItems(result);
    } finally {
      setLoading(false);
    }
  }, [user, mode]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const handleRestore = async () => {
    const ids = Array.from(selected);
    try {
      await restoreConversations(ids);
      setItems((prev) => prev.filter((i) => !selected.has(i.id)));
      setSelected(new Set());
      toast.success(`${ids.length} wiederhergestellt`);
    } catch {
      toast.error("Wiederherstellen fehlgeschlagen");
    }
  };

  const handleTrash = async () => {
    const ids = Array.from(selected);
    try {
      await trashConversations(ids);
      setItems((prev) => prev.filter((i) => !selected.has(i.id)));
      setSelected(new Set());
      toast.success(`${ids.length} in Papierkorb verschoben`);
    } catch {
      toast.error("Verschieben fehlgeschlagen");
    }
  };

  const handlePurge = async (allOfThem = false) => {
    const ids = allOfThem ? items.map((i) => i.id) : Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`${ids.length} Chat(s) endgültig löschen? Dies kann nicht rückgängig gemacht werden.`)) return;
    try {
      await purgeConversations(ids);
      setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
      setSelected(new Set());
      toast.success("Endgültig gelöscht");
    } catch {
      toast.error("Löschen fehlgeschlagen");
    }
  };

  const allSelected = items.length > 0 && selected.size === items.length;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 glass-strong border-b border-border/30">
        <div className="flex items-center gap-2 px-3 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1 truncate">{title}</h1>
          {items.length > 0 && (
            <button
              onClick={selectAll}
              className="px-3 h-9 rounded-lg text-sm font-medium bg-secondary/70 active:scale-95"
            >
              {allSelected ? "Keine" : "Alle"}
            </button>
          )}
        </div>
        {mode === "trash" && items.length > 0 && (
          <p className="px-5 pb-2 text-xs text-muted-foreground">
            Chats werden 30 Tage nach dem Verschieben automatisch endgültig gelöscht.
          </p>
        )}
      </header>

      <div className="flex-1">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">Lädt…</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-20 text-center text-sm text-muted-foreground">
            {mode === "archived" ? "Keine archivierten Chats" : "Papierkorb ist leer"}
          </div>
        ) : (
          <ul role="list">
            {items.map((item) => {
              const isChecked = selected.has(item.id);
              const initials = item.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const hue = item.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
              const remaining = mode === "trash" ? daysUntilPurge(item.deleted_at) : null;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => toggle(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors",
                      isChecked ? "bg-primary/10" : "hover:bg-secondary/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                        isChecked ? "border-primary bg-primary" : "border-muted-foreground/40"
                      )}
                    >
                      {isChecked && (
                        <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div
                      className="rounded-xl flex items-center justify-center font-bold text-sm shrink-0 text-primary-foreground overflow-hidden"
                      style={{
                        width: "2.75rem",
                        height: "2.75rem",
                        background: item.avatar ? undefined : `linear-gradient(135deg, hsl(${hue} 60% 55%), hsl(${(hue + 40) % 360} 50% 60%))`,
                      }}
                    >
                      {item.avatar ? <img src={item.avatar} alt="" className="w-full h-full object-cover" /> : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.938rem] font-semibold truncate">{item.name}</p>
                      {remaining !== null && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Wird in {remaining} Tag{remaining === 1 ? "" : "en"} gelöscht
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Bottom action bar */}
      {(selected.size > 0 || (mode === "trash" && items.length > 0)) && (
        <div
          className="sticky bottom-0 z-10 glass-strong border-t border-border/30 px-4 py-3 flex items-center gap-2"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          {selected.size > 0 ? (
            <>
              <span className="text-sm font-medium text-muted-foreground mr-auto">
                {selected.size} ausgewählt
              </span>
              <button
                onClick={handleRestore}
                className="h-10 px-3 rounded-lg bg-secondary text-foreground flex items-center gap-1.5 active:scale-95 text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Wiederherstellen
              </button>
              {mode === "archived" ? (
                <button
                  onClick={handleTrash}
                  className="h-10 px-3 rounded-lg bg-destructive text-destructive-foreground flex items-center gap-1.5 active:scale-95 text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Papierkorb
                </button>
              ) : (
                <button
                  onClick={() => handlePurge(false)}
                  className="h-10 px-3 rounded-lg bg-destructive text-destructive-foreground flex items-center gap-1.5 active:scale-95 text-sm font-medium"
                >
                  <Trash className="w-4 h-4" />
                  Endgültig
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => handlePurge(true)}
              className="h-10 w-full rounded-lg bg-destructive/10 text-destructive flex items-center justify-center gap-1.5 active:scale-95 text-sm font-semibold"
            >
              <Trash className="w-4 h-4" />
              Papierkorb leeren
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageChatsPage;
