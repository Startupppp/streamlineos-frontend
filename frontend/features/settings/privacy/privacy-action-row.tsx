import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PrivacyActionRowProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
  showBorder?: boolean;
}

export function PrivacyActionRow({
  title,
  description,
  children,
  showBorder = true,
}: PrivacyActionRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        showBorder && "border-b border-border last:border-b-0",
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="max-w-prose text-xs leading-snug text-muted-foreground">{description}</div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:[&_button]:w-auto [&_button]:w-full">
        {children}
      </div>
    </div>
  );
}
