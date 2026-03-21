import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Subscription {
  plan: string;
  is_founding_user: boolean;
  trial_start: string | null;
  trial_end: string | null;
  premium_until: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    };

    load();
  }, [user]);

  const isPremium = (): boolean => {
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
    if (!subscription?.premium_until) return 0;
    const diff = new Date(subscription.premium_until).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const planLabel = (): string => {
    if (!subscription) return "Kostenlos";
    if (subscription.plan === "founding") return "Founding User";
    if (subscription.plan === "premium") return "Premium";
    if (subscription.plan === "trial") {
      if (isPremium()) return "Testphase";
      return "Kostenlos";
    }
    return "Kostenlos";
  };

  return {
    subscription,
    loading,
    isPremium: isPremium(),
    isFoundingUser: isFoundingUser(),
    daysRemaining: daysRemaining(),
    planLabel: planLabel(),
  };
};
