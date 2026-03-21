import { useState, useCallback } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import PaywallDialog from "@/components/PaywallDialog";

/**
 * Hook that gates premium features.
 * Returns a `requirePremium` function that either runs the callback or shows the paywall.
 */
export const usePremiumGate = () => {
  const { isPremium, isFoundingUser, planLabel, daysRemaining } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const requirePremium = useCallback(
    (callback: () => void) => {
      if (isPremium) {
        callback();
      } else {
        setShowPaywall(true);
      }
    },
    [isPremium]
  );

  const PaywallGate = () => (
    <PaywallDialog open={showPaywall} onClose={() => setShowPaywall(false)} />
  );

  return {
    isPremium,
    isFoundingUser,
    planLabel,
    daysRemaining,
    requirePremium,
    PaywallGate,
    showPaywall,
    setShowPaywall,
  };
};
