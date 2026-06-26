"use client";

import { Badge } from "@/components/ui/badge";
import type { ProductStatus } from "@/types/inventory";

interface ProductStatusBadgeProps {
  status: ProductStatus;
}

const STATUS_CONFIG: Record<
  ProductStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  INACTIVE: {
    label: "Inactive",
    className:
      "bg-muted text-muted-foreground border-border",
  },
  DISCONTINUED: {
    label: "Discontinued",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
  },
};

export function ProductStatusBadge({ status }: ProductStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
