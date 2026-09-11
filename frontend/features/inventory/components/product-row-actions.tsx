"use client";

import { useState } from "react";
import Link from "next/link";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useArchiveProduct,
  useRestoreProduct,
  useDeleteProduct,
} from "@/hooks/api/inventory";
import { useCan } from "@/hooks/api/access";
import type { TrackingMethod } from "@/types/inventory";

export function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <Badge
        variant="outline"
        className="h-4 text-micro px-1.5 py-0 border-status-success-rule text-status-success-ink bg-status-success-surface"
      >
        Active
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="h-4 text-micro px-1.5 py-0 border-border text-muted-foreground bg-muted"
    >
      Inactive
    </Badge>
  );
}

export function StockBadge({ qty }: { qty: number }) {
  if (qty <= 0) {
    return (
      <Badge
        variant="outline"
        className="h-4 text-micro px-1.5 py-0 tabular-nums border-status-danger-rule text-status-danger-ink bg-status-danger-surface"
      >
        Out
      </Badge>
    );
  }
  if (qty < 10) {
    return (
      <Badge
        variant="outline"
        className="h-4 text-micro px-1.5 py-0 tabular-nums border-status-warning-rule text-status-warning-ink bg-status-warning-surface"
      >
        {qty} low
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="h-4 text-micro px-1.5 py-0 tabular-nums border-status-success-rule text-status-success-ink bg-status-success-surface"
    >
      {qty}
    </Badge>
  );
}

export function TrackingBadge({
  method,
}: {
  method: TrackingMethod | null | undefined;
}) {
  if (!method || method === "NONE") {
    return <span className="text-muted-foreground text-micro">—</span>;
  }
  if (method === "LOT") {
    return (
      <Badge
        variant="outline"
        className="h-4 text-micro px-1.5 py-0 bg-status-warning-surface text-status-warning-ink border-status-warning-rule"
      >
        Lot
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="h-4 text-micro px-1.5 py-0 bg-status-info-surface text-status-info-ink border-status-info-rule"
    >
      Serial
    </Badge>
  );
}
