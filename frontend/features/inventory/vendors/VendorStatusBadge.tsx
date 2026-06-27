"use client";

import { Badge } from "@/components/ui/badge";

interface VendorStatusBadgeProps {
  isActive: boolean;
}

export function VendorStatusBadge({ isActive }: VendorStatusBadgeProps) {
  if (isActive) {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
      >
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
      Inactive
    </Badge>
  );
}
