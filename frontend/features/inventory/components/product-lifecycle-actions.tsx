"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useCan } from "@/hooks/api/access";
import {
  useArchiveProduct,
  useDeleteProduct,
  useRestoreProduct,
} from "@/hooks/api/inventory";
import { getErrorMessage } from "@/lib/get-error-message";
import type { InventoryProduct } from "@/types/inventory";
import { isRestorableStatus } from "./product-status-badge";

/**
 * The product lifecycle, as controls.
 *
 * Restore existed here only as a menu item behind `product.isArchived`, a field
 * no product endpoint returns — so the one action that undoes archiving never
 * rendered. What archiving actually produces is `status: "INACTIVE"`, and the
 * restore endpoint also clears a soft delete, so the control keys off the
 * status the API really sends.
 *
 * Every confirm keeps its dialog open on failure. Restore answers 409 when the
 * SKU has been taken by a live product since, and delete answers 409 while the
 * product still holds stock; both messages name what to fix, which is no use in
 * a toast that outlives the dialog by three seconds.
 */

type LifecycleAction = "archive" | "restore" | "delete";

interface LifecycleCopy {
  title: string;
  description: string;
  confirmLabel: string;
  successMessage: string;
  destructive: boolean;
  icon: ReactNode;
}

function lifecycleCopy(
  action: LifecycleAction,
  productName: string,
): LifecycleCopy {
  if (action === "archive") {
    return {
      title: `Archive ${productName}?`,
      description:
        "The product stays in the catalogue with its history intact, but its SKU can no longer be put on a new order, transfer or reservation. You can restore it at any time.",
      confirmLabel: "Archive",
      successMessage: "Product archived",
      destructive: false,
      icon: <Archive className="size-4" aria-hidden="true" />,
    };
  }
  if (action === "restore") {
    return {
      title: `Restore ${productName}?`,
      description:
        "The product returns to Active and its SKU can be ordered again. Documents that already reference it are unchanged.",
      confirmLabel: "Restore",
      successMessage: "Product restored",
      destructive: false,
      icon: <RotateCcw className="size-4" aria-hidden="true" />,
    };
  }
  return {
    title: `Delete ${productName}?`,
    description:
      "The product is removed from the catalogue. Deletion is refused while it holds stock or sits on an open document — archive it instead to keep the history and still block new demand.",
    confirmLabel: "Delete",
    successMessage: "Product deleted",
    destructive: true,
    icon: <Trash2 className="size-4" aria-hidden="true" />,
  };
}

interface ProductLifecycle {
  action: LifecycleAction | null;
  failure: unknown;
  isPending: boolean;
  openArchive: () => void;
  openRestore: () => void;
  openDelete: () => void;
  confirm: () => void;
  handleOpenChange: (open: boolean) => void;
}

function useProductLifecycle(product: InventoryProduct): ProductLifecycle {
  const [action, setAction] = useState<LifecycleAction | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const archiveMutation = useArchiveProduct();
  const restoreMutation = useRestoreProduct();
  const deleteMutation = useDeleteProduct();

  function open(next: LifecycleAction): void {
    setFailure(null);
    setAction(next);
  }

  function openArchive(): void {
    open("archive");
  }

  function openRestore(): void {
    open("restore");
  }

  function openDelete(): void {
    open("delete");
  }

  function handleOpenChange(next: boolean): void {
    if (next) return;
    setAction(null);
    setFailure(null);
  }

  function confirm(): void {
    if (action === null) return;
    const successMessage = lifecycleCopy(action, product.name).successMessage;
    setFailure(null);
    const handlers = {
      onSuccess: (): void => {
        setAction(null);
        toast.success(successMessage);
      },
      onError: (error: Error): void => {
        setFailure(error);
      },
    };
    if (action === "archive") archiveMutation.mutate(product.id, handlers);
    else if (action === "restore") restoreMutation.mutate(product.id, handlers);
    else deleteMutation.mutate(product.id, handlers);
  }

  return {
    action,
    failure,
    isPending:
      archiveMutation.isPending ||
      restoreMutation.isPending ||
      deleteMutation.isPending,
    openArchive,
    openRestore,
    openDelete,
    confirm,
    handleOpenChange,
  };
}

interface ProductLifecycleConfirmProps {
  productName: string;
  lifecycle: ProductLifecycle;
}

function ProductLifecycleConfirm({
  productName,
  lifecycle,
}: ProductLifecycleConfirmProps) {
  const copy =
    lifecycle.action === null
      ? null
      : lifecycleCopy(lifecycle.action, productName);

  return (
    <ConfirmDialog
      open={lifecycle.action !== null}
      onOpenChange={lifecycle.handleOpenChange}
      title={copy?.title ?? ""}
      description={copy?.description ?? ""}
      icon={copy?.icon}
      content={
        lifecycle.failure != null ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {getErrorMessage(lifecycle.failure)}
          </div>
        ) : null
      }
      confirmLabel={
        lifecycle.failure != null ? "Try again" : (copy?.confirmLabel ?? "")
      }
      destructive={copy?.destructive}
      confirmIcon={copy?.icon}
      keepOpenOnConfirm
      isPending={lifecycle.isPending}
      onConfirm={lifecycle.confirm}
    />
  );
}

interface ProductActionsProps {
  product: InventoryProduct;
}

/** Row menu for the products table. */
export function ProductRowActions({ product }: ProductActionsProps) {
  const canUpdate = useCan("inventory:products:update");
  const canDelete = useCan("inventory:products:delete");
  const lifecycle = useProductLifecycle(product);
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const href = `/inventory/products/${product.id}`;
  const restorable = isRestorableStatus(product.status);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-7"
            aria-label={`Actions for ${product.name}`}
            {...hoverHandlers}
          >
            <EllipsisIcon ref={iconRef} size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={href}>View</Link>
          </DropdownMenuItem>
          {canUpdate ? (
            <DropdownMenuItem asChild>
              <Link href={href}>Edit</Link>
            </DropdownMenuItem>
          ) : null}
          {canUpdate || canDelete ? <DropdownMenuSeparator /> : null}
          {canUpdate && !restorable ? (
            <DropdownMenuItem onClick={lifecycle.openArchive}>
              Archive
            </DropdownMenuItem>
          ) : null}
          {canUpdate && restorable ? (
            <DropdownMenuItem onClick={lifecycle.openRestore}>
              Restore
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={lifecycle.openDelete}>
              Delete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ProductLifecycleConfirm
        productName={product.name}
        lifecycle={lifecycle}
      />
    </>
  );
}

/** Header control for the product detail page. */
export function ProductLifecycleButton({ product }: ProductActionsProps) {
  const canUpdate = useCan("inventory:products:update");
  const lifecycle = useProductLifecycle(product);
  const restorable = isRestorableStatus(product.status);

  if (!canUpdate) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={restorable ? lifecycle.openRestore : lifecycle.openArchive}
      >
        {restorable ? "Restore" : "Archive"}
      </Button>
      <ProductLifecycleConfirm
        productName={product.name}
        lifecycle={lifecycle}
      />
    </>
  );
}
