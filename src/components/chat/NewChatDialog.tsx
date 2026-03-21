import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, MessageCirclePlus } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface FoundUser {
  id: string;
  display_name: string | null;
  phone_number: string;
}

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
}

const NewChatDialog = ({ open, onClose }: NewChatDialogProps) => {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<FoundUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();

  const handleSearch = async () => {
    if (!phone.trim() || !user) return;
    setSearching(true);
    setError("");
    setResult(null);

    const { data, error: err } = await supabase
      .from("profiles")
      .select("id, display_name, phone_number")
      .eq("phone_number", phone.trim())
      .maybeSingle();

    setSearching(false);

    if (err || !data) {
      setError(t("chat.userNotFound") || "Nutzer nicht gefunden");
      return;
    }

    if (data.id === user.id) {
      setError("Du kannst nicht mit dir selbst chatten");
      return;
    }

    setResult(data);
  };

  const handleStartChat = async () => {
    if (!result || !user) return;
    setCreating(true);

    // Check if conversation already exists between these two users
    const { data: myMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myMemberships) {
      for (const m of myMemberships) {
        const { data: otherMember } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", m.conversation_id)
          .eq("user_id", result.id)
          .maybeSingle();

        if (otherMember) {
          // Conversation already exists
          onClose();
          navigate(`/chat/${m.conversation_id}`);
          return;
        }
      }
    }

    // Create new conversation
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .insert({ created_by: user.id, name: null, is_group: false })
      .select()
      .single();

    if (convErr || !conv) {
      setCreating(false);
      return;
    }

    await supabase.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: result.id },
    ]);

    onClose();
    navigate(`/chat/${conv.id}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl animate-reveal-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">{t("chat.newChat") || "Neuer Chat"}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={t("chat.enterPhone") || "Handynummer eingeben..."}
                className="w-full h-10 rounded-xl bg-secondary pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !phone.trim()}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {searching ? "..." : t("chat.search") || "Suchen"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Result */}
          {result && (
            <button
              onClick={handleStartChat}
              disabled={creating}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                {(result.display_name || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {result.display_name || result.phone_number}
                </p>
                <p className="text-xs text-muted-foreground">{result.phone_number}</p>
              </div>
              <MessageCirclePlus className="w-5 h-5 text-primary shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatDialog;
