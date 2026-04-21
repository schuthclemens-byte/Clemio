import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useLaunchMode } from "@/hooks/useLaunchMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Ban, Trash2, Unlock, Shield, Loader2, Search,
  Users, MessageSquare, Crown, ShieldAlert, Activity, KeyRound, Star, X, Mic, MicOff, Flag,
  Bell, Send, Headphones, ShieldCheck, AlertTriangle, Calendar, Rocket,
} from "lucide-react";
import { toast } from "sonner";
import BottomTabBar from "@/components/BottomTabBar";
import AdminReports from "@/components/admin/AdminReports";

interface UserSubscription {
  plan: string;
  premium_until: string | null;
  is_founding_user: boolean;
}

interface VoiceProfile {
  voice_name: string | null;
  created_at: string | null;
  elevenlabs_voice_id: string;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  phone_number: string;
  created_at: string | null;
  avatar_url: string | null;
  is_blocked: boolean;
  message_count: number;
  subscription: UserSubscription | null;
  voice_profile: VoiceProfile | null;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalMessages: number;
  premiumUsers: number;
  voiceProfiles: number;
  autoplayUsers: number;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { user } = useAuth();
  const { locale } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "reports" | "analytics">("users");
  const [openReportsCount, setOpenReportsCount] = useState(0);
  const { comingSoon, loading: launchLoading } = useLaunchMode();
  const [launchSaving, setLaunchSaving] = useState(false);

  const handleToggleLaunchMode = async (next: boolean) => {
    setLaunchSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        value: { coming_soon: next },
        updated_by: user?.id ?? null,
      })
      .eq("key", "launch_mode");
    setLaunchSaving(false);
    if (error) {
      toast.error(tr("Konnte Modus nicht ändern", "Could not change mode"));
      console.error("[AdminPage] launch mode update failed:", error.message);
    } else {
      toast.success(
        next
          ? tr("Coming Soon aktiv", "Coming Soon active")
          : tr("App ist live", "App is live")
      );
    }
  };

  // Password reset dialog
  const [pwDialog, setPwDialog] = useState<{ open: boolean; userId: string; name: string }>({ open: false, userId: "", name: "" });
  const [newPassword, setNewPassword] = useState("");

  // Subscription dialog
  const [subDialog, setSubDialog] = useState<{ open: boolean; userId: string; name: string; current: UserSubscription | null }>({ open: false, userId: "", name: "", current: null });
  const [subPlan, setSubPlan] = useState("premium");
  const [subDate, setSubDate] = useState("");

  // Voice detail dialog
  const [voiceDialog, setVoiceDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });

  const fetchData = async () => {
    setLoading(true);
    const [listRes, statsRes, reportsRes] = await Promise.all([
      supabase.functions.invoke("admin-manage-user", { body: { action: "list", targetUserId: "dummy" } }),
      supabase.functions.invoke("admin-manage-user", { body: { action: "stats" } }),
      supabase.functions.invoke("admin-manage-user", { body: { action: "list-reports" } }),
    ]);
    if (!listRes.error) setProfiles(listRes.data?.profiles || []);
    if (!statsRes.error) setStats(statsRes.data);
    if (!reportsRes.error) {
      const reports = reportsRes.data?.reports || [];
      setOpenReportsCount(reports.filter((r: any) => r.status === "open").length);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!adminLoading && isAdmin) fetchData();
  }, [adminLoading, isAdmin]);

  // Realtime: update badge when new reports come in
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("admin-reports-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => {
          // Re-fetch open reports count
          supabase.functions.invoke("admin-manage-user", {
            body: { action: "list-reports" },
          }).then(({ data, error }) => {
            if (!error && data?.reports) {
              setOpenReportsCount(data.reports.filter((r: any) => r.status === "open").length);
            }
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  const filtered = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(
      (p) =>
        (p.display_name || "").toLowerCase().includes(q) ||
        p.phone_number.toLowerCase().includes(q)
    );
  }, [profiles, search]);

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

  const performAction = async (action: string, targetUserId: string, label: string, extra?: Record<string, any>) => {
    setActionLoading(targetUserId);
    const { error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action, targetUserId, ...extra },
    });
    if (error) {
      toast.error(`${label} fehlgeschlagen`);
    } else {
      toast.success(`${label} erfolgreich`);
      await fetchData();
    }
    setActionLoading(null);
  };

  const handlePasswordReset = async () => {
    if (newPassword.length < 8) {
      toast.error(tr("Mindestens 8 Zeichen", "At least 8 characters"));
      return;
    }
    await performAction("reset-password", pwDialog.userId, tr("Passwort zurücksetzen", "Password reset"), { newPassword });
    setPwDialog({ open: false, userId: "", name: "" });
    setNewPassword("");
  };

  const handleSetSubscription = async () => {
    if (!subDate) {
      toast.error(tr("Datum wählen", "Choose a date"));
      return;
    }
    await performAction("set-subscription", subDialog.userId, tr("Abo aktualisiert", "Subscription updated"), {
      plan: subPlan,
      premiumUntil: new Date(subDate).toISOString(),
    });
    setSubDialog({ open: false, userId: "", name: "", current: null });
  };

  const handleSendTestPush = async (targetUserId: string, name: string) => {
    setActionLoading(targetUserId + "-push");
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "send-test-push", targetUserId },
    });
    if (error || !data?.success) {
      toast.error(data?.error || tr("Push fehlgeschlagen", "Push failed"));
    } else {
      toast.success(tr(`Test-Push an ${name} gesendet`, `Test push sent to ${name}`));
    }
    setActionLoading(null);
  };

  const getSubBadge = (sub: UserSubscription | null) => {
    if (!sub) return <Badge variant="secondary" className="text-[0.6rem] px-1.5">Free</Badge>;
    const isPremium = sub.premium_until && new Date(sub.premium_until) > new Date();
    if (sub.is_founding_user) return <Badge className="text-[0.6rem] px-1.5 bg-amber-500/20 text-amber-600 border-amber-500/30">Founding</Badge>;
    if (isPremium) return <Badge className="text-[0.6rem] px-1.5 bg-primary/20 text-primary border-primary/30">Premium</Badge>;
    return <Badge variant="secondary" className="text-[0.6rem] px-1.5">Free</Badge>;
  };

  const voiceUsers = profiles.filter(p => p.voice_profile);

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
        {/* Tabs */}
        <div className="flex px-4 pt-2 gap-1 overflow-x-auto">
           {([
            { key: "users" as const, icon: Users, label: tr("Nutzer", "Users"), badge: 0 },
            { key: "reports" as const, icon: Flag, label: "Reports", badge: openReportsCount },
            { key: "analytics" as const, icon: Activity, label: "Analytics", badge: 0 },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
              {tab.badge > 0 && (
                <span className="ml-1 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[0.65rem] font-bold flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "reports" ? (
        <AdminReports
          onBlockUser={(userId) => performAction("block", userId, tr("Blockieren", "Block"))}
          onDeleteVoice={(userId) => performAction("delete-voice", userId, tr("Voice gelöscht", "Voice deleted"))}
        />
      ) : activeTab === "analytics" ? (
        /* ── ANALYTICS TAB (Step 9) ── */
        <div className="p-4 space-y-4">
          {stats && (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {tr("Übersicht", "Overview")}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Users, label: tr("Gesamt Nutzer", "Total Users"), value: stats.totalUsers, color: "text-primary" },
                  { icon: Activity, label: tr("Aktiv (7 Tage)", "Active (7 days)"), value: stats.activeUsers, color: "text-green-500" },
                  { icon: MessageSquare, label: tr("Nachrichten", "Messages"), value: stats.totalMessages, color: "text-blue-500" },
                  { icon: Mic, label: tr("Voice-Profile", "Voice Profiles"), value: stats.voiceProfiles, color: "text-primary" },
                  { icon: Crown, label: "Premium", value: stats.premiumUsers, color: "text-amber-500" },
                  { icon: ShieldAlert, label: tr("Blockiert", "Blocked"), value: stats.blockedUsers, color: "text-destructive" },
                  { icon: Headphones, label: tr("Anhören aktiv", "Autoplay active"), value: stats.autoplayUsers, color: "text-purple-500" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
                    <Icon className={`w-5 h-5 ${color} shrink-0`} />
                    <div>
                      <span className="text-xl font-bold block">{value}</span>
                      <span className="text-[0.65rem] text-muted-foreground">{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Voice Security Overview (Step 7) */}
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-6">
                {tr("Voice-Sicherheit", "Voice Security")}
              </h2>
              {voiceUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{tr("Keine Voice-Profile vorhanden", "No voice profiles exist")}</p>
              ) : (
                <div className="space-y-2">
                  {voiceUsers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setVoiceDialog({ open: true, user: p })}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{(p.display_name || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block truncate">{p.display_name || p.phone_number}</span>
                        <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3 text-green-500" />
                            {tr("Verifiziert", "Verified")}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {p.voice_profile?.created_at ? new Date(p.voice_profile.created_at).toLocaleDateString("de") : "—"}
                          </span>
                          <span>·</span>
                          <span>{p.voice_profile?.voice_name || tr("Standard", "Default")}</span>
                        </div>
                      </div>
                      <Mic className="w-4 h-4 text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {!stats && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 px-4 py-3">
          {[
            { icon: Users, label: tr("Gesamt", "Total"), value: stats.totalUsers, color: "text-primary" },
            { icon: Activity, label: tr("Aktiv 7T", "Active 7d"), value: stats.activeUsers, color: "text-green-500" },
            { icon: ShieldAlert, label: tr("Blockiert", "Blocked"), value: stats.blockedUsers, color: "text-destructive" },
            { icon: MessageSquare, label: tr("Nachr.", "Msgs"), value: stats.totalMessages, color: "text-blue-500" },
            { icon: Crown, label: "Premium", value: stats.premiumUsers, color: "text-amber-500" },
            { icon: Mic, label: "Voice", value: stats.voiceProfiles, color: "text-primary" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex flex-col items-center p-2 rounded-xl bg-muted/50 gap-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-lg font-bold">{value}</span>
              <span className="text-[0.6rem] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={tr("Name oder Nummer suchen…", "Search name or number…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {filtered.map((p) => {
            const isMe = p.id === user?.id;
            const initials = (p.display_name || "?").substring(0, 2).toUpperCase();
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {p.display_name || tr("Unbekannt", "Unknown")}
                    </span>
                    {getSubBadge(p.subscription)}
                    {p.is_blocked && (
                      <Badge variant="destructive" className="text-[0.6rem] px-1.5">
                        {tr("Blockiert", "Blocked")}
                      </Badge>
                    )}
                    {isMe && (
                      <Badge className="text-[0.6rem] px-1.5 bg-primary/20 text-primary border-primary/30">Du</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{p.phone_number}</span>
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="w-3 h-3" /> {p.message_count}
                    </span>
                    <span className="flex items-center gap-0.5">
                      {p.voice_profile ? (
                        <><Mic className="w-3 h-3 text-primary" /> {tr("Voice", "Voice")}</>
                      ) : (
                        <><MicOff className="w-3 h-3" /> {tr("Keine", "None")}</>
                      )}
                    </span>
                  </div>
                  {p.voice_profile && (
                    <div className="text-[0.6rem] text-muted-foreground mt-0.5">
                      Voice: {p.voice_profile.voice_name || "—"} · {p.voice_profile.created_at ? new Date(p.voice_profile.created_at).toLocaleDateString("de") : "—"}
                    </div>
                  )}
                </div>

                {!isMe && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Send Test Push (Step 8) */}
                    <Button
                      size="sm" variant="ghost" className="h-7 w-7 p-0"
                      title={tr("Test-Push senden", "Send test push")}
                      disabled={actionLoading === p.id + "-push"}
                      onClick={() => handleSendTestPush(p.id, p.display_name || p.phone_number)}
                    >
                      {actionLoading === p.id + "-push" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Bell className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </Button>

                    {/* Delete Voice */}
                    {p.voice_profile && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            title={tr("Voice-Profil löschen", "Delete voice profile")}
                            disabled={actionLoading === p.id}
                          >
                            <MicOff className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{tr("Voice-Profil löschen?", "Delete voice profile?")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {tr(
                                `Das Voice-Profil von "${p.display_name || p.phone_number}" wird gelöscht. Der User muss es neu erstellen.`,
                                `The voice profile of "${p.display_name || p.phone_number}" will be deleted. The user must re-create it.`
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{tr("Abbrechen", "Cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => performAction("delete-voice", p.id, tr("Voice gelöscht", "Voice deleted"))}
                            >
                              {tr("Voice löschen", "Delete voice")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {/* Subscription */}
                    <Button
                      size="sm" variant="ghost" className="h-7 w-7 p-0"
                      title={tr("Abo verwalten", "Manage subscription")}
                      onClick={() => {
                        setSubDialog({ open: true, userId: p.id, name: p.display_name || p.phone_number, current: p.subscription });
                        setSubPlan(p.subscription?.plan || "premium");
                        setSubDate(p.subscription?.premium_until ? p.subscription.premium_until.split("T")[0] : "");
                      }}
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                    </Button>

                    {/* Password reset */}
                    <Button
                      size="sm" variant="ghost" className="h-7 w-7 p-0"
                      title={tr("Passwort zurücksetzen", "Reset password")}
                      onClick={() => { setPwDialog({ open: true, userId: p.id, name: p.display_name || p.phone_number }); setNewPassword(""); }}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>

                    {/* Block/Unblock */}
                    {p.is_blocked ? (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                        disabled={actionLoading === p.id}
                        onClick={() => performAction("unblock", p.id, tr("Entblockieren", "Unblock"))}
                      >
                        <Unlock className="w-3.5 h-3.5 text-green-500" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                        disabled={actionLoading === p.id}
                        onClick={() => performAction("block", p.id, tr("Blockieren", "Block"))}
                      >
                        <Ban className="w-3.5 h-3.5 text-orange-500" />
                      </Button>
                    )}

                    {/* Delete */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={actionLoading === p.id}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{tr("Account löschen?", "Delete account?")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {tr(
                              `"${p.display_name || p.phone_number}" wird unwiderruflich gelöscht.`,
                              `"${p.display_name || p.phone_number}" will be permanently deleted.`
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
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              {tr("Keine Nutzer gefunden", "No users found")}
            </p>
          )}
        </div>
      )}
      </>
      )}

      {/* Password Reset Dialog */}
      <Dialog open={pwDialog.open} onOpenChange={(o) => setPwDialog((prev) => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("Passwort zurücksetzen", "Reset Password")}</DialogTitle>
            <DialogDescription>{pwDialog.name}</DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder={tr("Neues Passwort (mind. 8 Zeichen)", "New password (min 8 chars)")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwDialog({ open: false, userId: "", name: "" })}>
              {tr("Abbrechen", "Cancel")}
            </Button>
            <Button onClick={handlePasswordReset} disabled={actionLoading === pwDialog.userId}>
              {tr("Zurücksetzen", "Reset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
      <Dialog open={subDialog.open} onOpenChange={(o) => setSubDialog((prev) => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("Abo verwalten", "Manage Subscription")}</DialogTitle>
            <DialogDescription>{subDialog.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{tr("Plan", "Plan")}</label>
              <select
                className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={subPlan}
                onChange={(e) => setSubPlan(e.target.value)}
              >
                <option value="free">Free</option>
                <option value="trial">Trial</option>
                <option value="premium">Premium</option>
                <option value="founding">Founding</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Premium bis / until</label>
              <Input
                type="date"
                value={subDate}
                onChange={(e) => setSubDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialog({ open: false, userId: "", name: "", current: null })}>
              {tr("Abbrechen", "Cancel")}
            </Button>
            <Button onClick={handleSetSubscription} disabled={actionLoading === subDialog.userId}>
              {tr("Speichern", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voice Detail Dialog (Step 7) */}
      <Dialog open={voiceDialog.open} onOpenChange={(o) => setVoiceDialog((prev) => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" />
              {tr("Voice-Profil Details", "Voice Profile Details")}
            </DialogTitle>
            <DialogDescription>{voiceDialog.user?.display_name || voiceDialog.user?.phone_number}</DialogDescription>
          </DialogHeader>
          {voiceDialog.user?.voice_profile && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground block">{tr("Status", "Status")}</span>
                  <span className="text-sm font-medium flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    {tr("Verifiziert", "Verified")}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground block">{tr("Erstellt am", "Created")}</span>
                  <span className="text-sm font-medium mt-1 block">
                    {voiceDialog.user.voice_profile.created_at
                      ? new Date(voiceDialog.user.voice_profile.created_at).toLocaleDateString("de", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground block">{tr("Stimme", "Voice")}</span>
                  <span className="text-sm font-medium mt-1 block">{voiceDialog.user.voice_profile.voice_name || tr("Standard", "Default")}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground block">ElevenLabs ID</span>
                  <span className="text-[0.6rem] font-mono mt-1 block truncate">{voiceDialog.user.voice_profile.elevenlabs_voice_id}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoiceDialog({ open: false, user: null })}>
              {tr("Schließen", "Close")}
            </Button>
            {voiceDialog.user && voiceDialog.user.id !== user?.id && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (voiceDialog.user) {
                    performAction("delete-voice", voiceDialog.user.id, tr("Voice gelöscht", "Voice deleted"));
                    setVoiceDialog({ open: false, user: null });
                  }
                }}
              >
                <MicOff className="w-4 h-4 mr-1" />
                {tr("Voice löschen", "Delete voice")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomTabBar />
    </div>
  );
};

export default AdminPage;
