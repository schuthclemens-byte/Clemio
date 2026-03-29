import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Video, PhoneIncoming, PhoneMissed, PhoneOff, PhoneForwarded } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { cn } from "@/lib/utils";

interface CallEntry {
  id: string;
  caller_id: string;
  receiver_id: string;
  conversation_id: string;
  status: string;
  call_type: string;
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
  missed_at: string | null;
  declined_at: string | null;
  // Resolved
  contactName: string;
  isOutgoing: boolean;
  duration: number | null;
}

const CallHistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  useSwipeBack({ fallbackPath: "/chats" });

  const [calls, setCalls] = useState<CallEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Fetch all calls involving this user
      const { data, error } = await supabase
        .from("calls" as any)
        .select("*")
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error || !data) {
        console.error("[CallHistory] Error loading calls:", error);
        setLoading(false);
        return;
      }

      // Resolve contact names
      const otherIds = [...new Set((data as any[]).map((c) =>
        c.caller_id === user.id ? c.receiver_id : c.caller_id
      ))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, phone_number")
        .in("id", otherIds);

      const { data: aliases } = await supabase
        .from("contact_aliases")
        .select("contact_user_id, first_name, last_name")
        .eq("user_id", user.id)
        .in("contact_user_id", otherIds);

      const nameMap: Record<string, string> = {};
      for (const p of profiles || []) {
        nameMap[p.id] = p.display_name || p.phone_number;
      }
      for (const a of aliases || []) {
        if (a.first_name) {
          nameMap[a.contact_user_id] = [a.first_name, a.last_name].filter(Boolean).join(" ");
        }
      }

      const entries: CallEntry[] = (data as any[]).map((c) => {
        const isOutgoing = c.caller_id === user.id;
        const otherId = isOutgoing ? c.receiver_id : c.caller_id;
        let duration: number | null = null;
        if (c.answered_at && c.ended_at) {
          duration = Math.round(
            (new Date(c.ended_at).getTime() - new Date(c.answered_at).getTime()) / 1000
          );
        }
        return {
          ...c,
          contactName: nameMap[otherId] || "Unbekannt",
          isOutgoing,
          duration,
        };
      });

      setCalls(entries);
      setLoading(false);
    };

    load();
  }, [user]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

    if (isToday) return time;
    if (isYesterday) return `Gestern, ${time}`;
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) + `, ${time}`;
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const getStatusInfo = (call: CallEntry) => {
    switch (call.status) {
      case "accepted":
      case "ended":
        return {
          icon: call.isOutgoing ? PhoneForwarded : PhoneIncoming,
          label: call.duration ? formatDuration(call.duration) : "Verbunden",
          color: "text-green-500",
        };
      case "missed":
        return {
          icon: PhoneMissed,
          label: "Verpasst",
          color: "text-destructive",
        };
      case "declined":
        return {
          icon: PhoneOff,
          label: call.isOutgoing ? "Abgelehnt" : "Abgelehnt",
          color: "text-destructive",
        };
      case "failed":
        return {
          icon: PhoneOff,
          label: "Fehlgeschlagen",
          color: "text-destructive",
        };
      case "calling":
        return {
          icon: Phone,
          label: "Nicht beantwortet",
          color: "text-muted-foreground",
        };
      default:
        return {
          icon: Phone,
          label: call.status,
          color: "text-muted-foreground",
        };
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <button
          onClick={() => navigate("/chats")}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Anrufe</h1>
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
            <Phone className="w-8 h-8 text-muted-foreground/50" />
            <p>Noch keine Anrufe</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {calls.map((call) => {
              const status = getStatusInfo(call);
              const StatusIcon = status.icon;

              return (
                <button
                  key={call.id}
                  onClick={() => navigate(`/chat/${call.conversation_id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left active:bg-secondary"
                >
                  {/* Call type icon */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    call.status === "missed" || call.status === "declined" || call.status === "failed"
                      ? "bg-destructive/10"
                      : "bg-green-500/10"
                  )}>
                    {call.call_type === "video" ? (
                      <Video className={cn("w-5 h-5", status.color)} />
                    ) : (
                      <Phone className={cn("w-5 h-5", status.color)} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium text-sm truncate",
                      call.status === "missed" ? "text-destructive" : "text-foreground"
                    )}>
                      {call.contactName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusIcon className={cn("w-3 h-3", status.color)} />
                      <span className={cn("text-xs", status.color)}>
                        {call.isOutgoing ? "Ausgehend" : "Eingehend"} · {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Time */}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTime(call.created_at)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallHistoryPage;
