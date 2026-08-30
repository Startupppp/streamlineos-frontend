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
import type { InventoryProduct, TrackingMethod } from "@/types/inventory";

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

export function ProductRowActions({ product }: { product: InventoryProduct }) {
  const [alertOpen, setAlertOpen] = useState<boolean>(false);
  const { iconRef: ellipsisRef, hoverHandlers: ellipsisHover } =
    useAnimatedIcon();
  const archiveMutation = useArchiveProduct();
  const restoreMutation = useRestoreProduct();
  const deleteMutation = useDeleteProduct();
  const canUpdate = useCan("inventory:products:update");
  const canDelete = useCan("inventory:products:delete");

  function handleArchive(): void {
    archiveMutation.mutate(product.id, {
      onSuccess: () => toast.success("Product archived"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleRestore(): void {
    restoreMutation.mutate(product.id, {
      onSuccess: () => toast.success("Product restored"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleDeleteConfirm(): void {
    deleteMutation.mutate(product.id, {
      onSuccess: () => {
        setAlertOpen(false);
        toast.success("Product deleted");
      },
      onError: (err) => {
        setAlertOpen(false);
        toast.error(getErrorMessage(err), {
          description: "Consider archiving this product instead.",
        });
      },
    });
  }

  function handleAlertOpenChange(open: boolean): void {
    setAlertOpen(open);
  }

  return (
    <AlertDialog open={alertOpen} onOpenChange={handleAlertOpenChange}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-7"
            {...ellipsisHover}
          >
            <EllipsisIcon ref={ellipsisRef} size={14} />
            <span className="sr-only">Product actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/inventory/products/${product.id}`}>View</Link>
          </DropdownMenuItem>
          {canUpdate && (
            <DropdownMenuItem asChild>
              <Link href={`/inventory/products/${product.id}`}>Edit</Link>
            </DropdownMenuItem>
          )}
          {(canUpdate || canDelete) && <DropdownMenuSeparator />}
          {canUpdate && !product.isArchived && product.status === "ACTIVE" && (
            <DropdownMenuItem onClick={handleArchive}>Archive</DropdownMenuItem>
          )}
          {canUpdate && product.isArchived && (
            <DropdownMenuItem onClick={handleRestore}>Restore</DropdownMenuItem>
          )}
          {canDelete && (
            <AlertDialogTrigger asChild>
              <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
            </AlertDialogTrigger>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete product?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Archiving preserves history without
            removing the product.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            disabled={deleteMutation.isPending}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
