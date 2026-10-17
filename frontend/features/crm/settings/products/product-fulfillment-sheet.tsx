"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageState } from "@/components/shared/page-state";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useProductVariants } from "@/hooks/api/inventory/products";
import {
  useDeleteOfferFulfillmentMapping,
  useOfferFulfillmentMappings,
} from "@/hooks/api/crm/offer-fulfillment";
import type { OfferFulfillmentComponent } from "@/hooks/api/crm/offer-fulfillment-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Product } from "@/types/crm/products";
import { FulfillmentMappingDialog } from "./fulfillment-mapping-dialog";
import { FulfillmentMappingRow } from "./fulfillment-mapping-row";

interface ProductFulfillmentSheetProps {
  /** The product whose mappings are open; `null` closes the sheet. */
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}

/** Which inventory variants a CRM product ships as, read and edited from the catalogue. */
export function ProductFulfillmentSheet({ product, onOpenChange }: ProductFulfillmentSheetProps) {
  return (
    <Sheet open={product !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{product ? `Fulfillment · ${product.name}` : "Fulfillment"}</SheetTitle>
          <SheetDescription>
            When a deal closes, Inventory drafts a sales order with a line for each active mapping — that
            variant, at its quantity per unit — for someone to review before it is confirmed.
          </SheetDescription>
        </SheetHeader>
        {product ? <FulfillmentMappings product={product} /> : null}
      </SheetContent>
    </Sheet>
  );
}

/** `undefined` = closed, `null` = adding, a row = editing it. */
type DialogTarget = OfferFulfillmentComponent | null | undefined;

function FulfillmentMappings({ product }: { product: Product }) {
  const query = useOfferFulfillmentMappings({ crmOfferId: product.id });
  const variants = useProductVariants();
  const remove = useDeleteOfferFulfillmentMapping();
  const canCreate = useCan("crm:offer-fulfillment:create");
  const canUpdate = useCan("crm:offer-fulfillment:update");
  const canDelete = useCan("crm:offer-fulfillment:delete");
  const [dialogTarget, setDialogTarget] = useState<DialogTarget>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<OfferFulfillmentComponent | null>(null);

  const rows = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  // ponytail: the variant read caps at its largest page (100); a variant past it shows its id until the read pages.
  const variantById = useMemo(
    () => new Map((variants.data ?? []).map((v) => [v.id, v])),
    [variants.data],
  );

  const pageState = usePageState({
    permission: "crm:offer-fulfillment:view",
    module: "inventory",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty: rows.length === 0,
  });

  const handleAdd = useCallback(() => setDialogTarget(null), []);
  const handleEdit = useCallback((mapping: OfferFulfillmentComponent) => setDialogTarget(mapping), []);
  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setDialogTarget(undefined);
  }, []);
  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);
  const handleRetry = useCallback(() => {
    void query.refetch();
  }, [query]);
  const handleLoadMore = useCallback(() => {
    void query.fetchNextPage();
  }, [query]);

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.offerFulfillmentComponentId, {
      onSuccess: () => {
        toast.success("Mapping deleted");
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const deleteVariant = deleteTarget ? variantById.get(deleteTarget.invSkuId) : undefined;

  return (
    <>
      <SheetBody className="flex flex-col gap-4 px-6 py-5">
        {canCreate && pageState.kind === "ready" ? (
          <div className="flex justify-end">
            <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-1.5" size="sm" onClick={handleAdd}>
              Add mapping
            </AnimatedIconButton>
          </div>
        ) : null}
        <PageState
          resolution={pageState}
          compact
          loading={
            <div className="flex flex-col gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          }
          empty={
            <EmptyState
              compact
              title="Not mapped to inventory yet"
              description="Map this product to the variant it ships as, and closed deals will draft a sales order for it."
              action={canCreate ? { label: "Add mapping", onClick: handleAdd } : undefined}
            />
          }
          onRetry={handleRetry}
          className="flex-1"
        >
          <ul className="divide-y">
            {rows.map((mapping) => {
              const variant = variantById.get(mapping.invSkuId);
              return (
                <FulfillmentMappingRow
                  key={mapping.offerFulfillmentComponentId}
                  mapping={mapping}
                  variantLabel={variant ? `${variant.productName} — ${variant.name}` : `Variant #${mapping.invSkuId}`}
                  variantSku={variant?.sku ?? null}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                />
              );
            })}
          </ul>
          <InfiniteScrollSentinel
            hasNextPage={query.hasNextPage}
            isFetchingNextPage={query.isFetchingNextPage}
            onLoadMore={handleLoadMore}
            label="Load more mappings"
          />
        </PageState>
      </SheetBody>

      {dialogTarget !== undefined ? (
        <FulfillmentMappingDialog
          crmOfferId={product.id}
          mapping={dialogTarget}
          onOpenChange={handleDialogOpenChange}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this mapping?"
        description={
          deleteTarget
            ? `${deleteVariant ? deleteVariant.name : "This variant"} will no longer be added to the sales order drafted when a deal closes. To pause it instead, switch it off.`
            : ""
        }
        confirmLabel="Delete mapping"
        destructive
        isPending={remove.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
