import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, MessageCirclePlus, Users, UserPlus, Check, ContactRound } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "@/lib/authPhone";
import { searchAccessibleProfiles } from "@/lib/accessibleProfiles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Contact Picker API is only available on Android Chrome */
const isContactPickerSupported = "contacts" in navigator && "ContactsManager" in window;

interface FoundUser {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
}

interface ContactPickerEntry {
  tel?: string[];
}

interface ContactPickerNavigator extends Navigator {
  contacts?: {
    select?: (properties: string[], options: { multiple: boolean }) => Promise<ContactPickerEntry[]>;
  };
}

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
}

const NewChatDialog = ({ open, onClose }: NewChatDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [result, setResult] = useState<FoundUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<FoundUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();

  const reset = () => {
    setSearchQuery("");
    setResults([]);
    setResult(null);
    setError("");
    setCreating(false);
    setIsGroupMode(false);
    setSelectedUsers([]);
    setGroupName("");
    setSearching(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickContact = useCallback(async () => {
    try {
      const nav = navigator as ContactPickerNavigator;
      if (!nav.contacts?.select) return;

      const contacts = await nav.contacts.select(["tel"], { multiple: false });
      if (!contacts?.length || !contacts[0].tel?.length) return;

      // Take the first phone number, clean it up
      const rawPhone = contacts[0].tel[0] as string;
      const cleaned = rawPhone.replace(/[\s()-]/g, "");
      setSearchQuery(cleaned);

      // Auto-search
      setSearching(true);
      setError("");
      setResult(null);
      setResults([]);

      const digits = cleaned.replace(/\D/g, "");
      const normalized = digits ? normalizePhone(cleaned) : "";

      const found = (await searchAccessibleProfiles(digits || normalized))
        .filter((c) => c.id !== user?.id);
      setSearching(false);

      if (found.length === 0) {
        setError("Nutzer nicht gefunden – ist die Person bei Clemio registriert?");
      } else {
        setResults(found);
      }
    } catch (err) {
      console.warn("[ContactPicker]", err);
    }
  }, [user]);

  const isPhoneQuery = (q: string) => /^[+0-9\s()-]+$/.test(q.trim());

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query || !user) return;

    setSearching(true);
    setError("");
    setResult(null);
    setResults([]);

    const lowerQuery = query.toLowerCase();
    const digitsQuery = query.replace(/\D/g, "");
    const normalizedDigitsQuery = digitsQuery ? normalizePhone(query) : "";
    const shouldSearchByName = /[^\d\s()+-]/.test(query);
    const shouldSearchByPhone = digitsQuery.length >= 3 || isPhoneQuery(query);

    const searchTerm = shouldSearchByName ? query : (digitsQuery || normalizedDigitsQuery);
    const deduped = await searchAccessibleProfiles(searchTerm);

    const found = deduped.filter((candidate) => {
      const candidateName = (candidate.display_name || "").toLowerCase();
      const nameMatches = candidateName.includes(lowerQuery);
      const phoneMatches = shouldSearchByPhone;

      return (
        candidate.id !== user.id &&
        !selectedUsers.some((selected) => selected.id === candidate.id) &&
        (nameMatches || phoneMatches)
      );
    });

    setSearching(false);

    if (found.length === 0) {
      setError(t("chat.userNotFound") || "Nutzer nicht gefunden");
      return;
    }

    setResults(found);
  };

  const selectUser = (u: FoundUser) => {
    if (isGroupMode) {
      setSelectedUsers((prev) => [...prev, u]);
      setResults((prev) => prev.filter((r) => r.id !== u.id));
      setSearchQuery("");
    } else {
      // Directly start chat on click
      handleStartChatWith(u);
    }
  };

  const removeUser = (id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleStartChatWith = async (target: FoundUser) => {
    if (!target || !user || creating) return;
    setCreating(true);
    setError("");

    try {
      const [myMembershipsResponse, targetMembershipsResponse] = await Promise.all([
        supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", user.id),
        supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", target.id),
      ]);

      if (myMembershipsResponse.error) throw myMembershipsResponse.error;
      if (targetMembershipsResponse.error) throw targetMembershipsResponse.error;

      const myConversationIds = new Set((myMembershipsResponse.data ?? []).map((membership) => membership.conversation_id));
      const sharedConversationIds = (targetMembershipsResponse.data ?? [])
        .map((membership) => membership.conversation_id)
        .filter((conversationId) => myConversationIds.has(conversationId));

      if (sharedConversationIds.length > 0) {
        const { data: existingConversation, error: existingConversationError } = await supabase
          .from("conversations")
          .select("id")
          .in("id", sharedConversationIds)
          .eq("is_group", false)
          .limit(1)
          .maybeSingle();

        if (existingConversationError) throw existingConversationError;

        if (existingConversation?.id) {
          handleClose();
          navigate(`/chat/${existingConversation.id}`);
          return;
        }
      }

      const conversationId = crypto.randomUUID();

      const { error: convErr } = await supabase
        .from("conversations")
        .insert({ id: conversationId, created_by: user.id, name: null, is_group: false });

      if (convErr) throw convErr;

      const { error: ownMembershipError } = await supabase
        .from("conversation_members")
        .insert({ conversation_id: conversationId, user_id: user.id });

      if (ownMembershipError) throw ownMembershipError;

      const { error: invitationError } = await supabase
        .from("chat_invitations")
        .insert({
          conversation_id: conversationId,
          invited_by: user.id,
          invited_user_id: target.id,
          status: "accepted",
        });

      if (invitationError) throw invitationError;

      const { error: targetMembershipError } = await supabase
        .from("conversation_members")
        .insert({ conversation_id: conversationId, user_id: target.id });

      if (targetMembershipError) throw targetMembershipError;

      handleClose();
      navigate(`/chat/${conversationId}`);
    } catch (err: any) {
      console.error("[NewChatDialog] Chat start failed", err);
      const msg = err?.message || "";
      if (msg.includes("conversations")) {
        toast.error("Konversation konnte nicht erstellt werden");
      } else if (msg.includes("chat_invitations")) {
        toast.error("Einladung konnte nicht gesendet werden");
      } else if (msg.includes("conversation_members")) {
        toast.error("Mitglied konnte nicht hinzugefügt werden");
      } else {
        toast.error("Chat konnte nicht gestartet werden");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleStartChat = () => {
    if (result) handleStartChatWith(result);
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length < 2 || !user || !groupName.trim()) return;
    setCreating(true);

    try {
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ created_by: user.id, name: groupName.trim(), is_group: true })
        .select()
        .single();

      if (convErr || !conv) { setCreating(false); return; }

      // Add creator as member
      await supabase.from("conversation_members").insert({ conversation_id: conv.id, user_id: user.id });

      // Send invitations to selected users instead of adding them directly
      const invitations = selectedUsers.map((u) => ({
        conversation_id: conv.id,
        invited_by: user.id,
        invited_user_id: u.id,
        status: "pending" as const,
      }));

      await supabase.from("chat_invitations").insert(invitations);

      toast.success("Gruppeneinladungen gesendet");
      handleClose();
      navigate(`/chat/${conv.id}`);
    } catch (err: any) {
      console.error("[NewChatDialog] Group creation failed", err);
      const msg = err?.message || "";
      if (msg.includes("conversations")) {
        toast.error("Gruppe konnte nicht erstellt werden");
      } else if (msg.includes("chat_invitations")) {
        toast.error("Gruppeneinladungen konnten nicht gesendet werden");
      } else if (msg.includes("conversation_members")) {
        toast.error("Ersteller konnte nicht als Mitglied hinzugefügt werden");
      } else {
        toast.error("Gruppe konnte nicht erstellt werden");
      }
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-end sm:items-center justify-center pb-[env(safe-area-inset-bottom)]">
        <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl animate-reveal-up flex flex-col max-h-[80dvh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold">
            {isGroupMode ? (t("chat.newGroup") || "Neue Gruppe") : (t("chat.newChat") || "Neuer Chat")}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsGroupMode(!isGroupMode);
                setResult(null);
                setResults([]);
                setError("");
                if (!isGroupMode) setSelectedUsers([]);
              }}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all",
                isGroupMode
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Gruppe
            </button>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {isGroupMode && (
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Gruppenname..."
              className="w-full h-10 rounded-xl bg-secondary px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Name oder Nummer suchen..."
                className="w-full h-10 rounded-xl bg-secondary pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            {isContactPickerSupported && (
              <button
                onClick={handlePickContact}
                className="h-10 w-10 shrink-0 rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 flex items-center justify-center transition-colors"
                title="Kontakt auswählen"
              >
                <ContactRound className="w-4.5 h-4.5" />
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {searching ? "..." : isGroupMode ? <UserPlus className="w-4 h-4" /> : (t("chat.search") || "Suchen")}
            </button>
          </div>

          {/* iOS hint – only show when no results and no error */}
          {!isContactPickerSupported && results.length === 0 && !error && !result && (
            <p className="text-xs text-muted-foreground text-center px-2">
              Gib die Telefonnummer deines Kontakts ein, um ihn auf Clemio zu finden.
            </p>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          {/* Search results list */}
          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-left disabled:opacity-60 disabled:pointer-events-none"
                >
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                    {(u.display_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{u.display_name || "Nutzer"}</p>
                    <p className="text-xs text-muted-foreground">Kontakt gefunden</p>
                  </div>
                  {isGroupMode ? (
                    <UserPlus className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <MessageCirclePlus className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Selected group members */}
          {isGroupMode && selectedUsers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {selectedUsers.length} {selectedUsers.length === 1 ? "Mitglied" : "Mitglieder"}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => removeUser(u.id)}
                    className="flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    {u.display_name || "Nutzer"}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 1:1 result */}
          {!isGroupMode && result && (
            <button
              onClick={handleStartChat}
              disabled={creating}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                {(result.display_name || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{result.display_name || "Nutzer"}</p>
                <p className="text-xs text-muted-foreground">Kontakt gefunden</p>
              </div>
              <MessageCirclePlus className="w-5 h-5 text-primary shrink-0" />
            </button>
          )}

          {/* Create group button */}
          {isGroupMode && selectedUsers.length >= 2 && (
            <button
              onClick={handleCreateGroup}
              disabled={creating || !groupName.trim()}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-soft hover:shadow-elevated transition-all disabled:opacity-50"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Gruppe erstellen
                </>
              )}
            </button>
          )}

          {isGroupMode && selectedUsers.length < 2 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Füge mindestens 2 Kontakte hinzu
            </p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default NewChatDialog;
