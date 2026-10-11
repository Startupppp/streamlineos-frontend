"use client";

import { useCallback } from "react";
import Link from "next/link";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { Archive, ArrowRight, ArrowUpFromLine, Copy, Link2, Pencil, Trash2 } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { NamedUser } from "@/lib/person-display";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import type { ManagedProduct } from "@/types/projects";
import { ManagedProductStatusBadge } from "./managed-product-status-badge";
import {
  ProductFeedbackCell,
  ProductLifecycleCell,
  ProductNameCell,
  ProductOwnerCell,
  ProductProjectsCell,
  ProductReleaseCell,
  ProductUpdatedCell,
} from "./managed-product-list-cells";

export const MANAGED_PRODUCT_TABLE_HEADERS = [
  "Name",
  "Lifecycle",
  "Health",
  "Owner",
  "Projects",
  "Next release",
  "Feedback",
  "Updated",
  "Actions",
] as const;

type ManagedProductOwnerLookup = (ownerId: string | null) => NamedUser | null;

export interface ManagedProductRowHandlers {
  canUpdate: boolean;
  canDelete: boolean;
  ownerOf: ManagedProductOwnerLookup;
  onEdit: (row: ManagedProduct) => void;
  onDelete: (row: ManagedProduct) => void;
  onArchive?: (row: ManagedProduct) => void;
  onRestore?: (row: ManagedProduct) => void;
}

export function ProductRowActions({
  product,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
}: {
  product: ManagedProduct;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (row: ManagedProduct) => void;
  onDelete: (row: ManagedProduct) => void;
  onArchive?: (row: ManagedProduct) => void;
  onRestore?: (row: ManagedProduct) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(product), [product, onEdit]);
  const handleDelete = useCallback(() => onDelete(product), [product, onDelete]);
  const handleArchive = useCallback(() => onArchive?.(product), [product, onArchive]);
  const handleRestore = useCallback(() => onRestore?.(product), [product, onRestore]);
  const handleCopyKey = useCallback(() => {
    void navigator.clipboard.writeText(product.key).then(() => {
      toast.success(`Copied key ${product.key}`);
    });
  }, [product.key]);
  const handleCopyLink = useCallback(() => {
    const href = `${window.location.origin}/build/managed-products/${product.id}`;
    void navigator.clipboard.writeText(href).then(() => {
      toast.success("Link copied");
    });
  }, [product.id]);

  const isArchived = product.status === "archived";

  return (
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
          <Link href={`/build/managed-products/${product.id}`}>
            <ArrowRight aria-hidden="true" />
            Open
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          <Link2 aria-hidden="true" />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyKey}>
          <Copy aria-hidden="true" />
          Copy key
        </DropdownMenuItem>
        {(canUpdate || canDelete) ? <DropdownMenuSeparator /> : null}
        {canUpdate ? (
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil aria-hidden="true" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {canUpdate && !isArchived && onArchive ? (
          <DropdownMenuItem onClick={handleArchive}>
            <Archive aria-hidden="true" />
            Archive
          </DropdownMenuItem>
        ) : null}
        {canUpdate && isArchived && onRestore ? (
          <DropdownMenuItem onClick={handleRestore}>
            <ArrowUpFromLine aria-hidden="true" />
            Restore
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <>
            {canUpdate ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function buildManagedProductColumns({
  canUpdate,
  canDelete,
  ownerOf,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
}: ManagedProductRowHandlers): DataTableColumn<ManagedProduct>[] {
  function renderName(row: ManagedProduct) {
    return <ProductNameCell product={row} />;
  }
  function renderLifecycle(row: ManagedProduct) {
    return <ProductLifecycleCell product={row} />;
  }
  function renderHealth(row: ManagedProduct) {
    return <ManagedProductStatusBadge status={row.health ?? row.status} />;
  }
  function renderOwner(row: ManagedProduct) {
    return <ProductOwnerCell product={row} ownerOf={ownerOf} />;
  }
  function renderProjects(row: ManagedProduct) {
    return <ProductProjectsCell product={row} />;
  }
  function renderRelease(row: ManagedProduct) {
    return <ProductReleaseCell product={row} />;
  }
  function renderFeedback(row: ManagedProduct) {
    return <ProductFeedbackCell product={row} />;
  }
  function renderUpdated(row: ManagedProduct) {
    return <ProductUpdatedCell product={row} />;
  }
  function renderActions(row: ManagedProduct) {
    return canUpdate || canDelete ? (
      <ProductRowActions
        product={row}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEdit={onEdit}
        onDelete={onDelete}
        onArchive={onArchive}
        onRestore={onRestore}
      />
    ) : null;
  }

  return [
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: renderName,
    },
    {
      key: "lifecycle",
      header: "Lifecycle",
      cell: renderLifecycle,
    },
    {
      key: "health",
      header: "Health",
      cell: renderHealth,
    },
    {
      key: "ownerId",
      header: "Owner",
      cell: renderOwner,
    },
    {
      key: "linkedProjectCount",
      header: "Projects",
      className: "w-20",
      cell: renderProjects,
    },
    {
      key: "nextRelease",
      header: "Next release",
      cell: renderRelease,
    },
    {
      key: "feedbackTrend",
      header: "Feedback",
      className: "w-24",
      cell: renderFeedback,
    },
    {
      key: "updatedAt",
      header: "Updated",
      className: "w-28",
      cell: renderUpdated,
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-10",
      cell: renderActions,
    },
  ];
}
