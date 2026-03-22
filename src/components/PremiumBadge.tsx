import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const PremiumBadge = ({ className, size = "sm", showLabel = true }: PremiumBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold text-accent bg-accent/10 rounded-full",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        className
      )}
    >
      <Crown className={cn(size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />
      {showLabel && "Premium"}
    </span>
  );
};

export default PremiumBadge;