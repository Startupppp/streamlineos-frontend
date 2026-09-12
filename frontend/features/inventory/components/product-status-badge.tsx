"use client";

import { Badge } from "@/components/ui/badge";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ProductStatus } from "@/types/inventory";

/**
 * One badge for the product lifecycle, read by the list row and the detail
 * header.
 *
 * Both surfaces used to roll their own, and both collapsed the three-value
 * enum into two: DISCONTINUED rendered as "Inactive" on the list, so the one
 * status that stops a SKU being ordered was the one the catalogue would not
 * show. The tones come from `statusToneClasses` rather than a literal, which is
 * what carries the dark pairing.
 */

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

/**
 * Archiving is what Restore undoes.
 *
 * DISCONTINUED used to be listed here too, because the restore endpoint wrote
 * ACTIVE over whatever status it found. It no longer does: retiring a SKU is a
 * decision with a demand gate behind it, and its inverse is the deliberate edit
 * that set it, not a one-click Restore. Offering the control on a discontinued
 * product now would offer a button that does nothing.
 */
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
