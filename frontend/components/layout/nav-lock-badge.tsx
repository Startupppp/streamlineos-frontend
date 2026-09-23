import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLockBadgeProps {
  label: string;
  className?: string;
}

export function NavLockBadge({ label, className }: NavLockBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 h-4 px-1 rounded bg-muted border border-border",
        className,
      )}
    >
      <Lock className="h-2.5 w-2.5 text-muted-foreground" />
      <span className="text-micro font-medium text-muted-foreground">
        {label}
      </span>
    </span>
  );
}
