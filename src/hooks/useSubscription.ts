import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Subscription {
  plan: string;
  is_founding_user: boolean;
  trial_start: string | null;
  trial_end: string | null;
  premium_until: string | null;
}

interface StripeStatus {
  subscribed: boolean;
  subscription_end: string | null;
}

interface RefreshSubscriptionResult {
  ok: boolean;
  subscribed: boolean;
  error?: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [stripeActive, setStripeActive] = useState(false);
  const [stripeEnd, setStripeEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Load local subscription (founding/trial)
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("subscriptions" as any)
        .select("plan, is_founding_user, trial_start, trial_end, premium_until")
        .eq("user_id", user.id)
        .maybeSingle();

      setSubscription(data as any);
    };

    load();
  }, [user]);

  // Check Stripe subscription (with client-side cache to avoid rate limits)
  const checkStripe = useCallback(async (force = false): Promise<RefreshSubscriptionResult> => {
    if (!user) {
      setLoading(false);
      return { ok: false, subscribed: false, error: "Keine aktive Sitzung" };
    }

    // Client-side cache: skip if last successful check was < 5 minutes ago
    const CACHE_KEY = "clemio_stripe_cache";
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { ts, subscribed, subscription_end } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL) {
            setStripeActive(subscribed);
            setStripeEnd(subscription_end ?? null);
            setLoading(false);
            return { ok: true, subscribed };
          }
        }
      } catch { /* ignore */ }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setLoading(false);
      return { ok: false, subscribed: false, error: "Keine aktive Sitzung" };
    }

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/check-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      
      if (!res.ok) {
        console.warn("check-subscription returned", res.status);
        return {
          ok: false,
          subscribed: false,
          error: `Statusprüfung fehlgeschlagen (${res.status})`,
        };
      }
      
      const data: StripeStatus = await res.json();
      if (data) {
        setStripeActive(data.subscribed);
        setStripeEnd(data.subscription_end ?? null);
        // Cache successful result
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            ts: Date.now(),
            subscribed: data.subscribed,
            subscription_end: data.subscription_end,
          }));
        } catch { /* ignore */ }
        return {
          ok: true,
          subscribed: data.subscribed,
        };
      }

      return { ok: true, subscribed: false };
    } catch (err) {
      console.error("check-subscription failed:", err);
      return {
        ok: false,
        subscribed: false,
        error: err instanceof Error ? err.message : "Unbekannter Fehler",
      };
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    checkStripe();
    const interval = setInterval(checkStripe, 5 * 60_000); // every 5 min instead of 1 min
    return () => clearInterval(interval);
  }, [user, checkStripe]);

  // Handle checkout success URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      // Remove param and refresh
      params.delete("checkout");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState({}, "", newUrl);
      setTimeout(() => checkStripe(true), 2000);
    }
  }, [checkStripe]);

  const isPremium = (): boolean => {
    // Stripe subscription takes priority
    if (stripeActive) return true;
    // Fallback to local DB (founding/trial)
    if (!subscription) return false;
    if (subscription.plan === "founding") {
      if (subscription.premium_until) {
        return new Date(subscription.premium_until) > new Date();
      }
      return true;
    }
    if (subscription.plan === "premium") return true;
    if (subscription.plan === "trial" && subscription.premium_until) {
      return new Date(subscription.premium_until) > new Date();
    }
    return false;
  };

  const isFoundingUser = (): boolean => {
    return subscription?.is_founding_user ?? false;
  };

  const daysRemaining = (): number => {
    if (stripeActive && stripeEnd) {
      const diff = new Date(stripeEnd).getTime() - Date.now();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
    if (!subscription?.premium_until) return 0;
    // Whitelist users have premium_until far in the future - don't show countdown
    if (new Date(subscription.premium_until).getFullYear() >= 2099) return -1;
    const diff = new Date(subscription.premium_until).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const planLabel = (): string => {
    if (stripeActive) return "Premium";
    if (!subscription) return "Kostenlos";
    if (subscription.plan === "founding") return "Founding User";
    if (subscription.plan === "premium") return "Premium";
    if (subscription.plan === "trial") {
      if (isPremium()) return "Testphase";
      return "Kostenlos";
    }
    return "Kostenlos";
  };

  const startCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Keine Session");
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();
      if (data?.url) {
        window.open(data.url, "_blank");
      } else if (data?.error) {
        console.error("Checkout error:", data.error);
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Keine Session");
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/customer-portal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();
      if (data?.url) {
        window.open(data.url, "_blank");
      } else if (data?.error) {
        console.error("Portal error:", data.error);
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setPortalLoading(false);
    }
  };

  return {
    subscription,
    loading,
    isPremium: isPremium(),
    isFoundingUser: isFoundingUser(),
    daysRemaining: daysRemaining(),
    planLabel: planLabel(),
    stripeActive,
    startCheckout,
    openPortal,
    checkoutLoading,
    portalLoading,
    refreshSubscription: checkStripe,
  };
};
