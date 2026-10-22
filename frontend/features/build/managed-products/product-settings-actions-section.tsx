"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useManagedProductMembers } from "@/hooks/api/build/managed-product-members";
import { useManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import {
  useArchiveManagedProduct,
  useRestoreManagedProduct,
} from "@/hooks/api/build/managed-product-mutations";
import { isApiError } from "@/lib/api-envelope";
import { isRecord } from "@/lib/is-record";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { ProductSettingsDangerSection } from "./product-settings-danger-section";
import type { ManagedProduct } from "@/types/projects";

interface ProductSettingsActionsSectionProps {
  managedProductId: number;
  product: ManagedProduct;
  canUpdate: boolean;
}

export function ProductSettingsActionsSection({
  managedProductId,
  product,
  canUpdate,
}: ProductSettingsActionsSectionProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [publicationImpact, setPublicationImpact] = useState<{
    activeShareTokens: number;
    publishedRoadmapItems: number;
  } | null>(null);

  const archiveProduct = useArchiveManagedProduct();
  const restoreProduct = useRestoreManagedProduct();

  const members = useManagedProductMembers(managedProductId, {
    enabled: archiveOpen,
  });
  const summary = useManagedProductSummary(managedProductId);
  const memberCount = members.data?.data.length ?? 0;
  const linkedProjectCount = summary.data?.delivery.linkedProjects ?? 0;

  function handleArchiveConfirm() {
    archiveProduct.mutate(
      {
        managedProductId,
        version: product.version,
        confirmPublicationImpact: publicationImpact !== null ? true : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Product archived.");
          setArchiveOpen(false);
          setPublicationImpact(null);
        },
        onError: (e) => {
          if (
            isApiError(e) &&
            e.status === 409 &&
            e.code === "MANAGED_PRODUCT_HAS_PUBLICATION" &&
            isRecord(e.details)
          ) {
            const { activeShareTokens, publishedRoadmapItems } = e.details;
            if (
              typeof activeShareTokens === "number" &&
              typeof publishedRoadmapItems === "number"
            ) {
              setPublicationImpact({ activeShareTokens, publishedRoadmapItems });
              return;
            }
          }
          toast.error(getErrorMessage(e));
        },
      },
    );
  }

  function handleRestoreConfirm() {
    restoreProduct.mutate(
      { managedProductId, version: product.version },
      {
        onSuccess: () => {
          toast.success("Product restored.");
          setRestoreOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <>
      <ProductSettingsDangerSection
        archived={product.status === "archived"}
        canUpdate={canUpdate}
        archivePending={archiveProduct.isPending}
        restorePending={restoreProduct.isPending}
        onArchive={() => setArchiveOpen(true)}
        onRestore={() => setRestoreOpen(true)}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={(open) => {
          setArchiveOpen(open);
          if (!open) setPublicationImpact(null);
        }}
        title="Archive this product?"
        description={
          <span>
            The product will be hidden from active views. You can restore it
            later.
            {archiveOpen ? (
              <span className="block mt-1 text-muted-foreground">
                {memberCount} member{memberCount !== 1 ? "s" : ""} and{" "}
                {linkedProjectCount} linked project
                {linkedProjectCount !== 1 ? "s" : ""} will remain unchanged.
              </span>
            ) : null}
            {publicationImpact !== null ? (
              <span className="block mt-2 text-destructive">
                This product has {publicationImpact.activeShareTokens} active share
                link{publicationImpact.activeShareTokens !== 1 ? "s" : ""} and{" "}
                {publicationImpact.publishedRoadmapItems} published roadmap item
                {publicationImpact.publishedRoadmapItems !== 1 ? "s" : ""}. Archiving
                will revoke all active share links. Confirm to proceed.
              </span>
            ) : null}
          </span>
        }
        confirmLabel="Archive"
        destructive
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        title="Restore this product?"
        description="The product will become active again."
        confirmLabel="Restore"
        onConfirm={handleRestoreConfirm}
      />
    </>
  );
}
