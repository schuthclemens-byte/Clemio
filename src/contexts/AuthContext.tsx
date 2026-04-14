import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { phoneToEmail, sanitizePhoneInput, normalizePhone } from "@/lib/authPhone";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (phone: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (phone: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

interface SyncProfileOptions {
  phone?: string | null;
  displayName?: string | null;
  force?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const syncedProfileUserIdRef = useRef<string | null>(null);

  const applySession = (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  };

  const syncProfile = async (nextSession: Session | null, options: SyncProfileOptions = {}) => {
    if (!nextSession?.user) {
      syncedProfileUserIdRef.current = null;
      return;
    }

    const { force = false, phone, displayName } = options;
    if (!force && syncedProfileUserIdRef.current === nextSession.user.id) return;

    const metadata = nextSession.user.user_metadata ?? {};
    const profilePhoneNumber =
      typeof phone === "string" && phone.trim()
        ? sanitizePhoneInput(phone)
        : typeof metadata.phone_number === "string" && metadata.phone_number.trim()
          ? sanitizePhoneInput(metadata.phone_number)
          : null;
    const profileDisplayName =
      typeof displayName === "string" && displayName.trim()
        ? displayName.trim()
        : typeof metadata.display_name === "string" && metadata.display_name.trim()
          ? metadata.display_name.trim()
          : typeof metadata.full_name === "string" && metadata.full_name.trim()
            ? metadata.full_name.trim()
            : null;

    const { error } = await supabase.rpc("ensure_current_profile" as any, {
      profile_phone_number: profilePhoneNumber,
      profile_display_name: profileDisplayName,
    } as any);

    if (error) {
      console.error("[Auth] ensure_current_profile error:", error);
      return;
    }

    syncedProfileUserIdRef.current = nextSession.user.id;
  };

  useEffect(() => {
    let sessionResolved = false;

    // Try to restore session – if the stored refresh token is still valid
    // Supabase will auto-refresh the access token.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        // Fallback: try to recover from a potentially stale session
        // by explicitly refreshing the token
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData?.session) {
          applySession(refreshData.session);
          void syncProfile(refreshData.session);
        } else {
          applySession(null);
        }
      } else {
        applySession(session);
        void syncProfile(session);
      }
      sessionResolved = true;
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
      void syncProfile(session);
      if (sessionResolved) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (phone: string, password: string, displayName: string) => {
    const cleanPhone = sanitizePhoneInput(phone);
    const email = phoneToEmail(cleanPhone);
    console.log("[Auth] signUp attempt:", { email, phone: cleanPhone.substring(0, 4) + "***" });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          phone_number: cleanPhone,
          display_name: displayName,
        },
      },
    });

    if (error) {
      console.error("[Auth] signUp error:", error.message, error);
      return { error: error.message };
    }

    let activeSession = data?.session ?? null;

    if (!activeSession) {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        console.error("[Auth] post-signUp signIn error:", loginError.message, loginError);
        const friendlyError = /Invalid login credentials/i.test(loginError.message)
          ? "Diese Nummer ist bereits registriert. Bitte melde dich an oder nutze Passwort vergessen."
          : loginError.message;
        return { error: friendlyError.trim() };
      }
      activeSession = loginData.session;
    }

    applySession(activeSession);
    await syncProfile(activeSession, { force: true, phone: cleanPhone, displayName });

    // Check if newly registered user is somehow blocked
    const { data: blocked } = await supabase
      .from("blocked_users" as any)
      .select("id")
      .eq("user_id", data?.user?.id)
      .maybeSingle();
    if (blocked) {
      await supabase.auth.signOut();
      applySession(null);
      return { error: "Dein Account wurde gesperrt." };
    }

    console.log("[Auth] signUp success:", { userId: data?.user?.id, confirmed: data?.user?.confirmed_at });
    return { error: null };
  };

  const signIn = async (phone: string, password: string) => {
    const cleanPhone = sanitizePhoneInput(phone);
    const email = phoneToEmail(cleanPhone);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Try legacy clevara.app domain for existing users
      const legacyClevaraEmail = `${normalizePhone(cleanPhone)}@phone.clevara.app`;
      if (legacyClevaraEmail !== email) {
        const { data: lcData, error: lcError } = await supabase.auth.signInWithPassword({ email: legacyClevaraEmail, password });
        if (!lcError) {
          applySession(lcData.session);
          await syncProfile(lcData.session, { force: true, phone: cleanPhone });
          return { error: null };
        }
      }
      // Try legacy voicara.app domain
      const legacyEmail = `${normalizePhone(cleanPhone)}@phone.voicara.app`;
      if (legacyEmail !== email) {
        const { data: legacyData, error: legacyError } = await supabase.auth.signInWithPassword({ email: legacyEmail, password });
        if (!legacyError) {
          applySession(legacyData.session);
          await syncProfile(legacyData.session, { force: true, phone: cleanPhone });
          return { error: null };
        }
      }
      // Try old format fallback (voicara.app)
      const legacyClean = cleanPhone.replace(/[^0-9+]/g, "").replace("+", "p");
      const legacyEmail2 = `${legacyClean}@phone.voicara.app`;
      if (legacyEmail2 !== email && legacyEmail2 !== legacyEmail) {
        const { data: legacyData2, error: legacyError2 } = await supabase.auth.signInWithPassword({ email: legacyEmail2, password });
        if (!legacyError2) {
          applySession(legacyData2.session);
          await syncProfile(legacyData2.session, { force: true, phone: cleanPhone });
          return { error: null };
        }
      }
      // Try hearo.app legacy domain
      const rawDigits = cleanPhone.replace(/[^0-9]/g, "");
      const heароFormats = [
        `${rawDigits}@phone.hearo.app`,
        rawDigits.startsWith("0") ? `${rawDigits}@phone.hearo.app` : `0${rawDigits.replace(/^49/, "")}@phone.hearo.app`,
      ];
      for (const hearoEmail of heароFormats) {
        if (hearoEmail !== email && hearoEmail !== legacyEmail && hearoEmail !== legacyEmail2) {
          const { data: hearoData, error: hearoError } = await supabase.auth.signInWithPassword({ email: hearoEmail, password });
          if (!hearoError) {
            applySession(hearoData.session);
            await syncProfile(hearoData.session, { force: true, phone: cleanPhone });
            return { error: null };
          }
        }
      }
      return { error: error.message };
    }

    applySession(data.session);
    await syncProfile(data.session, { force: true, phone: cleanPhone });

    // Check if user is blocked
    const { data: blocked } = await supabase
      .from("blocked_users" as any)
      .select("id")
      .eq("user_id", data.session?.user?.id)
      .maybeSingle();
    if (blocked) {
      await supabase.auth.signOut();
      applySession(null);
      return { error: "Dein Account wurde gesperrt." };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    syncedProfileUserIdRef.current = null;
    applySession(null);
  };

  const resetPassword = async (phone: string) => {
    const email = phoneToEmail(sanitizePhoneInput(phone));
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};
