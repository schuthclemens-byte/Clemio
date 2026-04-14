import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Ban, Trash2, Unlock, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import BottomTabBar from "@/components/BottomTabBar";

interface UserProfile {
  id: string;
  display_name: string | null;
  phone_number: string;
  created_at: string | null;
  avatar_url: string | null;
  is_blocked: boolean;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { user } = useAuth();
  const { locale } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "list", targetUserId: "dummy" },
    });
    if (error) {
      toast.error(tr("Fehler beim Laden", "Error loading users"));
    } else {
      setProfiles(data?.profiles || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!adminLoading && isAdmin) fetchUsers();
  }, [adminLoading, isAdmin]);

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate("/chats");
    return null;
  }

  const performAction = async (action: string, targetUserId: string, label: string) => {
    setActionLoading(targetUserId);
    const { error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action, targetUserId },
    });
    if (error) {
      toast.error(`${label} fehlgeschlagen`);
    } else {
      toast.success(`${label} erfolgreich`);
      await fetchUsers();
    }
    setActionLoading(null);
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Admin</h1>
          <span className="text-xs text-muted-foreground ml-auto">
            {profiles.length} {tr("Nutzer", "Users")}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {profiles.map((p) => {
            const isMe = p.id === user?.id;
            const initials = (p.display_name || "?").substring(0, 2).toUpperCase();
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {p.display_name || tr("Unbekannt", "Unknown")}
                    </span>
                    {p.is_blocked && (
                      <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold">
                        {tr("Blockiert", "Blocked")}
                      </span>
                    )}
                    {isMe && (
                      <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                        Du
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.phone_number}</p>
                </div>

                {!isMe && (
                  <div className="flex items-center gap-1.5">
                    {p.is_blocked ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1"
                        disabled={actionLoading === p.id}
                        onClick={() => performAction("unblock", p.id, tr("Entblockieren", "Unblock"))}
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        {tr("Entblockieren", "Unblock")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1 text-orange-500 border-orange-500/30"
                        disabled={actionLoading === p.id}
                        onClick={() => performAction("block", p.id, tr("Blockieren", "Block"))}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        {tr("Sperren", "Block")}
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1 text-destructive border-destructive/30"
                          disabled={actionLoading === p.id}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {tr("Löschen", "Delete")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {tr("Account löschen?", "Delete account?")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {tr(
                              `Der Account von "${p.display_name || p.phone_number}" wird unwiderruflich gelöscht. Alle Nachrichten, Daten und Dateien werden entfernt.`,
                              `The account of "${p.display_name || p.phone_number}" will be permanently deleted. All messages, data and files will be removed.`
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{tr("Abbrechen", "Cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => performAction("delete", p.id, tr("Löschen", "Delete"))}
                          >
                            {tr("Endgültig löschen", "Delete permanently")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <BottomTabBar />
    </div>
  );
};

export default AdminPage;
