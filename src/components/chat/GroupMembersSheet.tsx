import { useState, useEffect } from "react";
import { X, UserPlus, LogOut, Trash2, Crown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAccessibleProfiles, searchAccessibleProfiles } from "@/lib/accessibleProfiles";
import { toast } from "sonner";

interface Member {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface FoundUser {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
}

interface GroupMembersSheetProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  creatorId: string;
  onLeft: () => void;
}

const GroupMembersSheet = ({ open, onClose, conversationId, creatorId, onLeft }: GroupMembersSheetProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteMode, setInviteMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const isCreator = user?.id === creatorId;

  const loadMembers = async () => {
    const { data: memberRows } = await supabase
      .from("conversation_members")
      .select("id, user_id")
      .eq("conversation_id", conversationId);

    if (!memberRows) return;

    const userIds = memberRows.map((m) => m.user_id);
    const profiles = await fetchAccessibleProfiles(userIds);
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    setMembers(
      memberRows.map((m) => ({
        id: m.id,
        userId: m.user_id,
        displayName: profileMap.get(m.user_id)?.display_name || "Nutzer",
        avatarUrl: profileMap.get(m.user_id)?.avatar_url,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (open) loadMembers();
  }, [open, conversationId]);

  const handleRemoveMember = async (membershipId: string, userId: string) => {
    if (userId === user?.id) return;
    const { error } = await supabase
      .from("conversation_members")
      .delete()
      .eq("id", membershipId);
    if (error) {
      toast.error("Konnte Mitglied nicht entfernen");
    } else {
      toast.success("Mitglied entfernt");
      setMembers((prev) => prev.filter((m) => m.id !== membershipId));
    }
  };

  const handleLeaveGroup = async () => {
    const myMembership = members.find((m) => m.userId === user?.id);
    if (!myMembership) return;
    const { error } = await supabase
      .from("conversation_members")
      .delete()
      .eq("id", myMembership.id);
    if (error) {
      toast.error("Fehler beim Verlassen");
    } else {
      toast.success("Gruppe verlassen");
      onLeft();
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchAccessibleProfiles(searchQuery.trim());
    const memberUserIds = new Set(members.map((m) => m.userId));
    setSearchResults(results.filter((r) => r.id !== user?.id && !memberUserIds.has(r.id)));
    setSearching(false);
  };

  const handleInvite = async (targetUser: FoundUser) => {
    const { error } = await supabase.from("chat_invitations").insert({
      conversation_id: conversationId,
      invited_by: user!.id,
      invited_user_id: targetUser.id,
      status: "pending",
    });
    if (error) {
      toast.error("Einladung fehlgeschlagen");
    } else {
      toast.success(`${targetUser.display_name || "Nutzer"} eingeladen`);
      setSearchResults((prev) => prev.filter((r) => r.id !== targetUser.id));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl animate-reveal-up max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold">
            {inviteMode ? "Mitglied einladen" : "Mitglieder"}
          </h2>
          <div className="flex items-center gap-2">
            {isCreator && !inviteMode && (
              <button
                onClick={() => setInviteMode(true)}
                className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Einladen
              </button>
            )}
            <button
              onClick={() => { setInviteMode(false); onClose(); }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {inviteMode ? (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Name oder Nummer..."
                    className="w-full h-10 rounded-xl bg-secondary pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                >
                  {searching ? "..." : "Suchen"}
                </button>
              </div>
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleInvite(r)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                    {(r.display_name || "?")[0].toUpperCase()}
                  </div>
                  <p className="flex-1 text-sm font-medium truncate">{r.display_name || "Nutzer"}</p>
                  <UserPlus className="w-4 h-4 text-primary shrink-0" />
                </button>
              ))}
              <button
                onClick={() => { setInviteMode(false); setSearchQuery(""); setSearchResults([]); }}
                className="w-full text-center text-sm text-muted-foreground py-2"
              >
                ← Zurück zur Mitgliederliste
              </button>
            </>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                    {m.displayName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-1.5">
                      {m.displayName}
                      {m.userId === user?.id && (
                        <span className="text-xs text-muted-foreground">(Du)</span>
                      )}
                      {m.userId === creatorId && (
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </p>
                  </div>
                  {isCreator && m.userId !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(m.id, m.userId)}
                      className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {/* Leave group */}
              {!isCreator && (
                <button
                  onClick={handleLeaveGroup}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  Gruppe verlassen
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupMembersSheet;
