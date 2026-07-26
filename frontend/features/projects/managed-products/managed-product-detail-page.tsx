"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useManagedProduct, useUpdateManagedProduct } from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ManagedProductStatusBadge } from "./managed-product-status-badge";
import { ManagedProductFormSheet } from "./managed-product-form-sheet";
import type { ManagedProduct, UpdateManagedProductInput } from "@/types/projects";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell, PmSection, PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

interface Props {
  managedProductId: number;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function ManagedProductDetailPage({ managedProductId }: Props) {
  const canUpdate = useCan("projects:managed-products:update");
  const { data: product, isLoading, isError, refetch } = useManagedProduct(managedProductId);
  const { data: membersRes } = useOrgMembers(1, 100);
  const updateProduct = useUpdateManagedProduct();
  const [editOpen, setEditOpen] = useState(false);

  const ownerName = useMemo(() => {
    if (!product?.ownerId) return "—";
    const m = (membersRes?.data ?? []).find((x) => x.userId === product.ownerId);
    return m ? getUserDisplayName(m) : "Unknown";
  }, [product, membersRes]);

  function handleEdit(input: UpdateManagedProductInput & { managedProductId: number }) {
    updateProduct.mutate(input, {
      onSuccess: () => {
        toast.success("Managed product updated");
        setEditOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleRetry() {
    void refetch();
  }

  function handleOpenEdit() {
    setEditOpen(true);
  }

  function handleSheetChange(open: boolean) {
    setEditOpen(open);
  }

  const title = product?.name ?? "Managed Product";

  return (
    <PageWrapper
      title={title}
      subtitle={product ? `Product key: ${product.key}` : undefined}
      backHref="/projects/managed-products"
      actions={
        canUpdate && product ? (
          <Button size="sm" className="text-xs" onClick={handleOpenEdit}>
            Edit
          </Button>
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={handleRetry} />
          ) : !product ? (
            <EmptyState
              illustrationPreset="projects"
              title="Managed product not found"
              description="It may have been deleted or you don't have access."
            />
          ) : (
            <div className={cn(PM_PANEL, "max-w-2xl p-4")}>
              <DetailRow label="Name" value={<span className="font-medium">{product.name}</span>} />
              <DetailRow
                label="Key"
                value={<span className="font-mono text-xs text-muted-foreground">{product.key}</span>}
              />
              <DetailRow label="Status" value={<ManagedProductStatusBadge status={product.status} />} />
              <DetailRow label="Owner" value={ownerName} />
              <DetailRow label="Description" value={product.description ?? "—"} />
              <DetailRow
                label="Created"
                value={new Date(product.createdAt).toLocaleDateString()}
              />
            </div>
          )}
        </PmSection>
      </PmPageShell>

      {editOpen && product && (
        <ManagedProductFormSheet
          open={editOpen}
          onOpenChange={handleSheetChange}
          mode="edit"
          defaultValues={product as ManagedProduct}
          onSubmitEdit={handleEdit}
          isPending={updateProduct.isPending}
        />
      )}
    </PageWrapper>
  );
}
