import { useState, useEffect } from "react";
import { ArrowLeft, Shield, UserPlus, Trash2, Search } from "lucide-react";
import { useSmartBack } from "@/hooks/useSmartBack";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccessibleProfiles } from "@/lib/accessibleProfiles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FocusContact {
  id: string;
  contact_user_id: string;
  display_name: string;
  avatar_url: string | null;
}

const FocusModePage = () => {
  const { goBack, swipeHandlers } = useSmartBack("/settings");
  const { user } = useAuth();
  const { focusMode, toggle } = useAccessibility();
  const [contacts, setContacts] = useState<FocusContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string; avatar_url: string | null }[]>([]);
  const [searching, setSearching] = useState(false);

  // Load focus contacts
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("focus_contacts" as any)
        .select("id, contact_user_id")
        .eq("user_id", user.id);

      if (data && (data as any[]).length > 0) {
        const contactIds = (data as any[]).map((d: any) => d.contact_user_id);
        const profiles = await fetchAccessibleProfiles(contactIds);

        const merged = (data as any[]).map((fc: any) => {
          const profile = profiles?.find((p) => p.id === fc.contact_user_id);
          return {
            id: fc.id,
            contact_user_id: fc.contact_user_id,
            display_name: profile?.display_name || "Unbekannt",
            avatar_url: profile?.avatar_url || null,
          };
        });
        setContacts(merged);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Search conversations for contacts to add
  const handleSearch = async () => {
    if (!user || !searchQuery.trim()) return;
    setSearching(true);

    // Get all conversation members the user shares a conversation with
    const { data: myConvos } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConvos && myConvos.length > 0) {
      const convoIds = myConvos.map((c) => c.conversation_id);
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .in("conversation_id", convoIds)
        .neq("user_id", user.id);

      if (members && members.length > 0) {
        const uniqueIds = [...new Set(members.map((m) => m.user_id))];
        const alreadyAdded = contacts.map((c) => c.contact_user_id);
        const filteredIds = uniqueIds.filter((id) => !alreadyAdded.includes(id));

        const profiles = await fetchAccessibleProfiles(filteredIds);

        const filtered = (profiles || []).filter((p) =>
          (p.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
      }
    }
    setSearching(false);
  };

  const addContact = async (contactId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("focus_contacts" as any)
      .insert({ user_id: user.id, contact_user_id: contactId } as any);

    if (error) {
      toast.error("Fehler beim Hinzufügen");
      return;
    }

    const profile = searchResults.find((p) => p.id === contactId);
    setContacts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        contact_user_id: contactId,
        display_name: profile?.display_name || "Unbekannt",
        avatar_url: profile?.avatar_url || null,
      },
    ]);
    setSearchResults((prev) => prev.filter((p) => p.id !== contactId));
    toast.success("Kontakt hinzugefügt");
  };

  const removeContact = async (focusContactId: string) => {
    await supabase
      .from("focus_contacts" as any)
      .delete()
      .eq("id", focusContactId);

    setContacts((prev) => prev.filter((c) => c.id !== focusContactId));
    toast.success("Kontakt entfernt");
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <div className="flex flex-col min-h-screen bg-background" {...swipeHandlers}>
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Fokus-Modus</h1>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6">
        {/* Toggle */}
        <section className="animate-reveal-up">
          <div className="bg-card rounded-2xl shadow-sm p-4 border border-border">
            <button
              onClick={() => toggle("focusMode")}
              className="w-full flex items-center justify-between"
              role="switch"
              aria-checked={focusMode}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  focusMode ? "gradient-primary" : "bg-secondary"
                )}>
                  <Shield className={cn("w-6 h-6", focusMode ? "text-primary-foreground" : "text-muted-foreground")} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[0.938rem]">Fokus-Modus</p>
                  <p className="text-xs text-muted-foreground">
                    Nur wichtige Kontakte vorlesen
                  </p>
                </div>
              </div>
              <div className={cn(
                "w-11 h-6 rounded-full relative transition-colors duration-200",
                focusMode ? "bg-primary" : "bg-border"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform duration-200",
                  focusMode ? "translate-x-[1.375rem]" : "translate-x-0.5"
                )} />
              </div>
            </button>
          </div>
        </section>

        {/* Info */}
        <section className="animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <div className="bg-primary/5 rounded-2xl p-4">
            <p className="text-sm text-muted-foreground">
              🛡️ Im Fokus-Modus werden nur Nachrichten von ausgewählten Kontakten automatisch vorgelesen. Alle anderen Nachrichten bleiben stumm – kein Spam, keine Ablenkung.
            </p>
          </div>
        </section>

        {/* Priority Contacts */}
        <section className="animate-reveal-up" style={{ animationDelay: "120ms" }}>
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
            Wichtige Kontakte ({contacts.length})
          </label>

          {/* Search to add */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Kontakt suchen..."
                className="w-full h-12 rounded-xl bg-card pl-10 pr-4 text-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="h-12 px-4 rounded-xl gradient-primary text-primary-foreground text-sm font-medium shadow-soft disabled:opacity-50"
            >
              {searching ? "..." : "Suchen"}
            </button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="bg-card rounded-2xl shadow-sm border border-border mb-4 overflow-hidden">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => addContact(result.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                    {result.avatar_url ? (
                      <img src={result.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {initials(result.display_name || "")}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium flex-1 text-left">{result.display_name}</span>
                  <UserPlus className="w-4 h-4 text-primary" />
                </button>
              ))}
            </div>
          )}

          {/* Current focus contacts */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="bg-card rounded-2xl p-6 text-center border border-border">
              <p className="text-sm text-muted-foreground">
                Noch keine wichtigen Kontakte. Suche oben nach Kontakten, um sie hinzuzufügen.
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                    {contact.avatar_url ? (
                      <img src={contact.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                        {initials(contact.display_name)}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium flex-1">{contact.display_name}</span>
                  <button
                    onClick={() => removeContact(contact.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default FocusModePage;
