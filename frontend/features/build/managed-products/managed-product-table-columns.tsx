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
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import type { ManagedProduct } from "@/types/projects";
import { ManagedProductStatusBadge } from "./managed-product-status-badge";

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

function ownerLabel(user: NamedUser | null): string {
  return user?.name ?? user?.email ?? "—";
}

function feedbackTrendLabel(last30d: number, previous30d: number): string {
  if (last30d > previous30d) return `${last30d} ↑`;
  if (last30d < previous30d) return `${last30d} ↓`;
  return String(last30d);
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
  return [
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <Link
          href={`/build/managed-products/${row.id}`}
          className={cn(
            "font-medium text-foreground hover:text-primary hover:underline",
            TEXT_ONE_LINE,
          )}
          title={row.name}
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "lifecycle",
      header: "Lifecycle",
      cell: (row) =>
        row.lifecycle ? (
          <span className="text-sm capitalize text-muted-foreground">{row.lifecycle.replace("_", " ")}</span>
        ) : null,
    },
    {
      key: "health",
      header: "Health",
      cell: (row) => <ManagedProductStatusBadge status={row.health ?? row.status} />,
    },
    {
      key: "ownerId",
      header: "Owner",
      cell: (row) => {
        const label = ownerLabel(ownerOf(row.ownerId));
        return label !== "—" ? (
          <span className={cn("max-w-[140px] text-sm text-muted-foreground", TEXT_ONE_LINE)}>
            {label}
          </span>
        ) : null;
      },
    },
    {
      key: "linkedProjectCount",
      header: "Projects",
      className: "w-20",
      cell: (row) =>
        row.linkedProjectCount !== undefined ? (
          <span className="font-mono tabular-nums text-sm text-muted-foreground">
            {row.linkedProjectCount}
          </span>
        ) : null,
    },
    {
      key: "nextRelease",
      header: "Next release",
      cell: (row) =>
        row.nextRelease ? (
          <span className={cn("max-w-[160px] text-sm text-muted-foreground", TEXT_ONE_LINE)}>
            {row.nextRelease.name}
          </span>
        ) : null,
    },
    {
      key: "feedbackTrend",
      header: "Feedback",
      className: "w-24",
      cell: (row) =>
        row.feedbackTrend !== undefined ? (
          <span
            className={cn(
              "font-mono tabular-nums text-sm",
              row.feedbackTrend.last30d > row.feedbackTrend.previous30d
                ? "text-status-success-ink-strong"
                : row.feedbackTrend.last30d < row.feedbackTrend.previous30d
                  ? "text-status-danger-ink-strong"
                  : "text-muted-foreground",
            )}
          >
            {feedbackTrendLabel(row.feedbackTrend.last30d, row.feedbackTrend.previous30d)}
          </span>
        ) : null,
    },
    {
      key: "updatedAt",
      header: "Updated",
      className: "w-28",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
            new Date(row.updatedAt),
          )}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-10",
      cell: (row) =>
        canUpdate || canDelete ? (
          <ProductRowActions
            product={row}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={onEdit}
            onDelete={onDelete}
            onArchive={onArchive}
            onRestore={onRestore}
          />
        ) : null,
    },
  ];
}
