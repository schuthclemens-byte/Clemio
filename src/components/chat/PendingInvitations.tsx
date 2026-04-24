import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { fetchAccessibleProfiles } from "@/lib/accessibleProfiles";
import { toast } from "sonner";

interface Invitation {
  id: string;
  conversation_id: string;
  invited_by: string;
  inviterName: string;
  conversationName: string;
}

const PendingInvitations = () => {
  const { user } = useAuth();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const loadInvitations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("chat_invitations")
      .select("id, conversation_id, invited_by, conversations:conversation_id(name, is_group)")
      .eq("invited_user_id", user.id)
      .eq("status", "pending");

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Only show group invitations here; 1:1 requests are handled by MessageRequests
    const groupInvites = data.filter((d) => (d.conversations as any)?.is_group === true);

    if (groupInvites.length === 0) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    const inviterIds = [...new Set(groupInvites.map((d) => d.invited_by))];
    const profiles = await fetchAccessibleProfiles(inviterIds);
    const profileMap = new Map(profiles.map((p) => [p.id, p.display_name || tr("Nutzer", "User")]));

    const mapped: Invitation[] = groupInvites.map((d) => ({
      id: d.id,
      conversation_id: d.conversation_id,
      invited_by: d.invited_by,
      inviterName: profileMap.get(d.invited_by) || tr("Nutzer", "User"),
      conversationName: (d.conversations as any)?.name || tr("Gruppe", "Group"),
    }));

    setInvitations(mapped);
    setLoading(false);
  };

  useEffect(() => {
    loadInvitations();
  }, [user]);

  // Realtime updates for new invitations
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("invitation-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_invitations" },
        () => loadInvitations()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleAccept = async (inv: Invitation) => {
    setActing(inv.id);
    try {
      // Update invitation status
      const { error: updateErr } = await supabase
        .from("chat_invitations")
        .update({ status: "accepted" })
        .eq("id", inv.id);
      if (updateErr) throw updateErr;

      // Add self as member
      const { error: memberErr } = await supabase
        .from("conversation_members")
        .insert({ conversation_id: inv.conversation_id, user_id: user!.id });
      if (memberErr) throw memberErr;

      toast.success(tr("Einladung angenommen", "Invitation accepted"));
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      navigate(`/chat/${inv.conversation_id}`);
    } catch (err) {
      console.error("Accept invitation failed", err);
      toast.error(tr("Fehler beim Annehmen", "Failed to accept"));
    } finally {
      setActing(null);
    }
  };

  const handleDecline = async (inv: Invitation) => {
    setActing(inv.id);
    try {
      const { error } = await supabase
        .from("chat_invitations")
        .update({ status: "declined" })
        .eq("id", inv.id);
      if (error) throw error;

      toast.success(tr("Einladung abgelehnt", "Invitation declined"));
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (err) {
      console.error("Decline invitation failed", err);
      toast.error(tr("Fehler beim Ablehnen", "Failed to decline"));
    } finally {
      setActing(null);
    }
  };

  if (loading || invitations.length === 0) return null;

  return (
    <div className="px-5 py-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <UserPlus className="w-3.5 h-3.5" />
        {tr("Einladungen", "Invitations")} ({invitations.length})
      </p>
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10"
        >
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
            {inv.conversationName[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{inv.conversationName}</p>
            <p className="text-xs text-muted-foreground">
              {tr("Einladung von", "Invitation from")} {inv.inviterName}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleAccept(inv)}
              disabled={acting === inv.id}
              className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDecline(inv)}
              disabled={acting === inv.id}
              className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PendingInvitations;
