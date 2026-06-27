"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StockLevelBadgeProps {
  onHand: number;
  reorderPoint: number;
  className?: string;
}

export function StockLevelBadge({ onHand, reorderPoint, className }: StockLevelBadgeProps) {
  if (onHand <= reorderPoint) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-xs font-medium border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
          className
        )}
      >
        Critical
      </Badge>
    );
  }

  if (onHand <= reorderPoint * 1.5) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-xs font-medium border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300",
          className
        )}
      >
        Low
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
        className
      )}
    >
      OK
    </Badge>
  );
}
