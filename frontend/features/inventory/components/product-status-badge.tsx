"use client";

import { Badge } from "@/components/ui/badge";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ProductStatus } from "@/types/inventory";


const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  DISCONTINUED: "Discontinued",
};

const PRODUCT_STATUS_TONE: Record<ProductStatus, StatusTone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  DISCONTINUED: "warning",
};

const SIZE_CLASS = {
  row: "h-4 px-1.5 py-0 text-micro",
  header: "h-5 px-2 py-0.5 text-xs",
} as const;

export function isRestorableStatus(status: ProductStatus): boolean {
  return status === "INACTIVE";
}

interface ProductStatusBadgeProps {
  status: ProductStatus;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

export function ProductStatusBadge({
  status,
  size = "row",
  className,
}: ProductStatusBadgeProps) {
  const tone = statusToneClasses(PRODUCT_STATUS_TONE[status]);
  return (
    <Badge
      variant="outline"
      className={cn(
        SIZE_CLASS[size],
        tone.surface,
        tone.ink,
        tone.rule,
        className,
      )}
    >
      {PRODUCT_STATUS_LABEL[status]}
    </Badge>
  );
}
