import { useState, useEffect } from "react";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { useSmartBack } from "@/hooks/useSmartBack";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccessibleProfiles } from "@/lib/accessibleProfiles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Contact {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  auto_play: boolean;
}

const ContactAutoplayPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get all conversation partners
      const { data: myConvos } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!myConvos?.length) { setLoading(false); return; }

      const convoIds = myConvos.map((c) => c.conversation_id);
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .in("conversation_id", convoIds)
        .neq("user_id", user.id);

      if (!members?.length) { setLoading(false); return; }

      const uniqueIds = [...new Set(members.map((m) => m.user_id))];

      const profiles = await fetchAccessibleProfiles(uniqueIds);

      const { data: autoplaySettings } = await supabase
        .from("contact_autoplay" as any)
        .select("contact_user_id, auto_play")
        .eq("user_id", user.id);

      const settingsMap = new Map(
        ((autoplaySettings as any[]) || []).map((s: any) => [s.contact_user_id, s.auto_play])
      );

      setContacts(
        (profiles || []).map((p) => ({
          user_id: p.id,
          display_name: p.display_name || tr("Unbekannt", "Unknown"),
          avatar_url: p.avatar_url,
          auto_play: settingsMap.get(p.id) ?? false,
        }))
      );
      setLoading(false);
    };
    load();
  }, [user]);

  const toggleAutoplay = async (contactId: string, currentValue: boolean) => {
    if (!user) return;
    const newValue = !currentValue;

    setContacts((prev) =>
      prev.map((c) => (c.user_id === contactId ? { ...c, auto_play: newValue } : c))
    );

    const { error } = await supabase
      .from("contact_autoplay" as any)
      .upsert(
        { user_id: user.id, contact_user_id: contactId, auto_play: newValue } as any,
        { onConflict: "user_id,contact_user_id" }
      );

    if (error) {
      toast.error(tr("Fehler beim Speichern", "Failed to save"));
      setContacts((prev) =>
        prev.map((c) => (c.user_id === contactId ? { ...c, auto_play: currentValue } : c))
      );
    }
  };

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{tr("Auto-Play pro Kontakt", "Auto-play per contact")}</h1>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-4">
        <div className="bg-primary/5 rounded-2xl p-4 animate-reveal-up">
          <p className="text-sm text-muted-foreground">
            {tr("🔊 Wähle aus, bei welchen Kontakten Nachrichten automatisch vorgelesen werden sollen. Alle anderen bleiben stumm.", "🔊 Choose which contacts should have messages read aloud automatically. All others stay silent.")}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 text-center border border-border">
            <p className="text-sm text-muted-foreground">{tr("Noch keine Kontakte vorhanden.", "No contacts yet.")}</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden animate-reveal-up" style={{ animationDelay: "60ms" }}>
            {contacts.map((contact) => (
              <button
                key={contact.user_id}
                onClick={() => toggleAutoplay(contact.user_id, contact.auto_play)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 transition-colors",
                  "hover:bg-secondary/50 active:scale-[0.99]",
                  "border-b border-border last:border-b-0"
                )}
                role="switch"
                aria-checked={contact.auto_play}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                  {contact.avatar_url ? (
                    <img src={contact.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {initials(contact.display_name)}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[0.938rem] font-medium">{contact.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {contact.auto_play ? tr("Automatisch abspielen", "Play automatically") : tr("Normal", "Normal")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {contact.auto_play ? (
                    <Volume2 className="w-4 h-4 text-primary" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div className={cn(
                    "w-11 h-6 rounded-full relative transition-colors duration-200",
                    contact.auto_play ? "bg-primary" : "bg-border"
                  )}>
                    <div className={cn(
                      "absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform duration-200",
                      contact.auto_play ? "translate-x-[1.375rem]" : "translate-x-0.5"
                    )} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactAutoplayPage;
