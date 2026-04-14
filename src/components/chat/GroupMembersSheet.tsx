import { useState, useEffect, useRef } from "react";
import { X, UserPlus, LogOut, Trash2, Crown, Search, Pencil, Camera, Check } from "lucide-react";
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
  groupName?: string;
  groupAvatarUrl?: string | null;
  onNameChanged?: (name: string) => void;
  onAvatarChanged?: (url: string) => void;
}

const GroupMembersSheet = ({ open, onClose, conversationId, creatorId, onLeft, groupName, groupAvatarUrl, onNameChanged, onAvatarChanged }: GroupMembersSheetProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteMode, setInviteMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const isCreator = user?.id === creatorId;

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(groupName || "");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Avatar uploading
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (groupName) setNameValue(groupName);
  }, [groupName]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

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

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === groupName) {
      setEditingName(false);
      return;
    }
    const { error } = await supabase
      .from("conversations")
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq("id", conversationId);
    if (error) {
      toast.error("Name konnte nicht geändert werden");
    } else {
      toast.success("Gruppenname geändert");
      onNameChanged?.(trimmed);
    }
    setEditingName(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);

    const filePath = `group_${conversationId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Avatar-Upload fehlgeschlagen");
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl || "";

    const { error: updateError } = await supabase
      .from("conversations")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() } as any)
      .eq("id", conversationId);

    if (updateError) {
      toast.error("Avatar konnte nicht gespeichert werden");
    } else {
      toast.success("Gruppen-Avatar aktualisiert");
      onAvatarChanged?.(publicUrl);
    }
    setUploadingAvatar(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

  const avatarInitials = (groupName || "G")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl animate-reveal-up max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold">
            {inviteMode ? "Mitglied einladen" : "Gruppeninfo"}
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
              onClick={() => { setInviteMode(false); setEditingName(false); onClose(); }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
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
              {/* Group profile section */}
              <div className="flex flex-col items-center gap-3 pb-4 border-b border-border">
                {/* Avatar */}
                <button
                  onClick={() => isCreator && fileInputRef.current?.click()}
                  disabled={!isCreator || uploadingAvatar}
                  className="relative w-20 h-20 rounded-full overflow-hidden group"
                >
                  {groupAvatarUrl ? (
                    <img src={groupAvatarUrl} alt="Gruppen-Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                      {avatarInitials}
                    </div>
                  )}
                  {isCreator && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />

                {/* Group name */}
                {editingName ? (
                  <div className="flex items-center gap-2 w-full max-w-[250px]">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                      className="flex-1 h-9 rounded-lg bg-secondary px-3 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                      maxLength={50}
                    />
                    <button
                      onClick={handleSaveName}
                      className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold">{groupName || "Gruppe"}</h3>
                    {isCreator && (
                      <button
                        onClick={() => setEditingName(true)}
                        className="w-6 h-6 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{members.length} Mitglieder</p>
              </div>

              {/* Members list */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Mitglieder</p>
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
              </div>

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
