"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SalesOrderStatus = "DRAFT" | "CONFIRMED" | "SHIPPED" | "INVOICED" | "CANCELLED";

const STATUS_CLASS: Record<SalesOrderStatus, string> = {
  DRAFT: "border-border bg-muted text-muted-foreground",
  CONFIRMED: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  SHIPPED: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300",
  INVOICED: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
  CANCELLED: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

const STATUS_LABEL: Record<SalesOrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  INVOICED: "Invoiced",
  CANCELLED: "Cancelled",
};

interface SoStatusBadgeProps {
  status: SalesOrderStatus;
  className?: string;
}

export function SoStatusBadge({ status, className }: SoStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", STATUS_CLASS[status], className)}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}
