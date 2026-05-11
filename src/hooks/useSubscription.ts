import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PremiumStatusPayload {
  status: "free" | "trial" | "premium" | "expired" | "canceled";
  isPremium: boolean;
  isTrialActive: boolean;
  hasUsedTrial: boolean;
  canStartTrial: boolean;
  trialEndsAt: string | null;
  periodEnd: string | null;
  plan: string | null;
  isFoundingUser: boolean;
  isWhitelisted: boolean;
}

const DEFAULT_STATUS: PremiumStatusPayload = {
  status: "free",
  isPremium: false,
  isTrialActive: false,
  hasUsedTrial: false,
  canStartTrial: false,
  trialEndsAt: null,
  periodEnd: null,
  plan: null,
  isFoundingUser: false,
  isWhitelisted: false,
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PremiumStatusPayload>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);
  const [trialStarting, setTrialStarting] = useState(false);

  const refreshStatus = useCallback(async (): Promise<PremiumStatusPayload> => {
    if (!user) {
      setStatus(DEFAULT_STATUS);
      setLoading(false);
      return DEFAULT_STATUS;
    }
    try {
      const { data, error } = await supabase.rpc("get_premium_status" as any);
      if (error) {
        console.warn("get_premium_status error:", error.message);
        setLoading(false);
        return status;
      }
      const next = { ...DEFAULT_STATUS, ...(data as any) };
      setStatus(next);
      setLoading(false);
      return next;
    } catch (err) {
      console.error("get_premium_status failed:", err);
      setLoading(false);
      return status;
    }
  }, [user]);

  useEffect(() => {
    refreshStatus();
    if (!user) return;
    const interval = setInterval(refreshStatus, 5 * 60_000);
    return () => clearInterval(interval);
  }, [user, refreshStatus]);

  const startTrial = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: "not_authenticated" };
    setTrialStarting(true);
    try {
      const { data, error } = await supabase.rpc("start_premium_trial" as any);
      if (error) {
        const code = error.message?.includes("phone_required_for_trial")
          ? "phone_required_for_trial"
          : error.message?.includes("trial_already_used")
          ? "trial_already_used"
          : "unknown";
        return { ok: false, error: code };
      }
      await refreshStatus();
      return { ok: true };
    } finally {
      setTrialStarting(false);
    }
  }, [user, refreshStatus]);

  const daysRemaining = (): number => {
    const target = status.isTrialActive ? status.trialEndsAt : status.periodEnd;
    if (!target) return 0;
    if (new Date(target).getFullYear() >= 2099) return -1;
    const diff = new Date(target).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const planLabel = (): string => {
    if (status.isFoundingUser) return "Founding User";
    if (status.status === "premium") return "Premium";
    if (status.status === "trial") return "Testphase";
    return "Kostenlos";
  };

  return {
    loading,
    isPremium: status.isPremium,
    isTrialActive: status.isTrialActive,
    isFoundingUser: status.isFoundingUser,
    hasUsedTrial: status.hasUsedTrial,
    canStartTrial: status.canStartTrial,
    premiumStatus: status.status,
    trialEndsAt: status.trialEndsAt,
    periodEnd: status.periodEnd,
    daysRemaining: daysRemaining(),
    planLabel: planLabel(),
    refreshSubscription: refreshStatus,
    startTrial,
    trialStarting,
    // Legacy compat (PaywallDialog/usePremiumGate compatibility)
    subscription: null,
    stripeActive: status.status === "premium" && !status.isFoundingUser && !status.isWhitelisted,
    startCheckout: async () => {
      console.warn("Stripe checkout disabled — IAP integration pending");
    },
    openPortal: async () => {
      console.warn("Customer portal disabled — IAP integration pending");
    },
    checkoutLoading: false,
    portalLoading: false,
  };
};
