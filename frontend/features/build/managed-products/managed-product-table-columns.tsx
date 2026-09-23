"use client";

import { useCallback } from "react";
import Link from "next/link";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import type { NamedUser } from "@/lib/person-display";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import type { ManagedProduct } from "@/types/projects";
import { ManagedProductStatusBadge } from "./managed-product-status-badge";

export const MANAGED_PRODUCT_TABLE_HEADERS = [
  "Name",
  "Key",
  "Status",
  "Owner",
  "Description",
  "Actions",
] as const;

export type ManagedProductOwnerLookup = (ownerId: string | null) => NamedUser | null;

interface ManagedProductRowHandlers {
  canManage: boolean;
  ownerOf: ManagedProductOwnerLookup;
  onEdit: (row: ManagedProduct) => void;
  onDelete: (row: ManagedProduct) => void;
}

function ownerLabel(user: NamedUser | null): string {
  return user?.name ?? user?.email ?? "Unassigned";
}

export function ProductRowActions({
  product,
  onEdit,
  onDelete,
}: {
  product: ManagedProduct;
  onEdit: (row: ManagedProduct) => void;
  onDelete: (row: ManagedProduct) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(product), [product, onEdit]);
  const handleDelete = useCallback(() => onDelete(product), [product, onDelete]);
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
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function buildManagedProductColumns({
  canManage,
  ownerOf,
  onEdit,
  onDelete,
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
      key: "key",
      header: "Key",
      className: "w-28",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.key}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ManagedProductStatusBadge status={row.status} />,
    },
    {
      key: "ownerId",
      header: "Owner",
      cell: (row) => (
        <span
          className={cn("max-w-[140px] text-sm text-muted-foreground", TEXT_ONE_LINE)}
        >
          {ownerLabel(ownerOf(row.ownerId))}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => (
        <span
          className={cn("max-w-[240px] text-sm text-muted-foreground", TEXT_ONE_LINE)}
          title={row.description ?? undefined}
        >
          {row.description ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-10",
      cell: (row) =>
        canManage ? (
          <ProductRowActions product={row} onEdit={onEdit} onDelete={onDelete} />
        ) : null,
    },
  ];
}

export function ManagedProductMobileCard({
  product,
  canManage,
  ownerOf,
  onEdit,
  onDelete,
}: { product: ManagedProduct } & ManagedProductRowHandlers) {
  return (
    <BuildMobileCard
      title={product.name}
      status={<ManagedProductStatusBadge status={product.status} />}
      person={{ user: ownerOf(product.ownerId), role: "Owner" }}
      meta={[
        { label: "Key", value: product.key },
        { label: "Description", value: product.description ?? "—" },
      ]}
      actions={
        canManage ? (
          <ProductRowActions
            product={product}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null
      }
    />
  );
}
