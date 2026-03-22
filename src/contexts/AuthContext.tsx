import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// Normalize phone to a canonical format, then convert to fake email
const normalizePhone = (phone: string): string => {
  // Strip everything except digits
  let digits = phone.replace(/[^0-9]/g, "");
  // Convert 0049... → 49...
  if (digits.startsWith("0049")) {
    digits = digits.slice(2); // "0049176..." → "49176..."
  }
  // Convert 0176... → 49176... (German local format)
  else if (digits.startsWith("0") && !digits.startsWith("00")) {
    digits = "49" + digits.slice(1); // "0176..." → "49176..."
  }
  // +49 already becomes 49 after stripping non-digits
  return digits;
};

const phoneToEmail = (phone: string) => {
  const normalized = normalizePhone(phone);
  return `${normalized}@phone.hearo.app`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (phone: string, password: string, displayName: string) => {
    const email = phoneToEmail(phone);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          phone_number: phone,
          display_name: displayName,
        },
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signIn = async (phone: string, password: string) => {
    const email = phoneToEmail(phone);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (phone: string) => {
    const email = phoneToEmail(phone);
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
