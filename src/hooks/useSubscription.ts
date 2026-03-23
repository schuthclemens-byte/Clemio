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

  // Check Stripe subscription
  const checkStripe = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke<StripeStatus>("check-subscription");
      if (error) {
        console.error("check-subscription error:", error);
        return;
      }
      if (data) {
        setStripeActive(data.subscribed);
        setStripeEnd(data.subscription_end ?? null);
      }
    } catch (err) {
      console.error("check-subscription failed:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    checkStripe();
    const interval = setInterval(checkStripe, 60_000);
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
      setTimeout(checkStripe, 2000);
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
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
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
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
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
