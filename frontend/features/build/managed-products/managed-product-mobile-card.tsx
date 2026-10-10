"use client";

import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import type { ManagedProduct } from "@/types/projects";
import { ManagedProductStatusBadge } from "./managed-product-status-badge";
import {
  ProductRowActions,
  type ManagedProductRowHandlers,
} from "./managed-product-table-columns";

export function ManagedProductMobileCard({
  product,
  canUpdate,
  canDelete,
  ownerOf,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
}: { product: ManagedProduct } & ManagedProductRowHandlers) {
  return (
    <BuildMobileCard
      title={product.name}
      status={<ManagedProductStatusBadge status={product.health ?? product.status} />}
      person={{ user: ownerOf(product.ownerId), role: "Owner" }}
      meta={[
        { label: "Key", value: product.key },
        { label: "Lifecycle", value: product.lifecycle ?? "" },
        ...(product.linkedProjectCount !== undefined
          ? [{ label: "Projects", value: String(product.linkedProjectCount) }]
          : []),
      ]}
      actions={
        canUpdate || canDelete ? (
          <ProductRowActions
            product={product}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={onEdit}
            onDelete={onDelete}
            onArchive={onArchive}
            onRestore={onRestore}
          />
        ) : null
      }
    />
  );
}
