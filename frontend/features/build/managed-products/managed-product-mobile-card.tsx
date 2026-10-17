"use client";

import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import type { ManagedProduct } from "@/types/projects";
import {
  ProductMobileSignals,
  productOwnerForDisplay,
} from "./managed-product-list-cells";
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
  const owner = productOwnerForDisplay(product, ownerOf);

  return (
    <BuildMobileCard
      eyebrow={product.key}
      title={product.name}
      status={
        <ManagedProductStatusBadge
          status={product.status === "archived" ? "archived" : (product.health ?? product.status)}
        />
      }
      person={{ user: owner.user, avatarUrl: owner.avatarUrl, role: "Owner" }}
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
      footer={<ProductMobileSignals product={product} />}
    />
  );
}
