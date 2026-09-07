"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ErrorState } from "@/components/shared";
import {
  RecordForm,
  RecordList,
  type RecordFieldControl,
  type RecordFormValues,
} from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useProducts } from "@/hooks/api/crm/products";
import {
  useDeletePricebookEntry,
  usePricebookEntries,
  useUpsertPricebookEntry,
} from "@/hooks/api/crm/pricebooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { PRICEBOOK_ENTRY_LAYOUT } from "@/lib/renderer/crm/settings/pricebook-layout";
import type { Pricebook } from "@/types/crm/pricebooks";
import { numberOr, numberOrOmit } from "../shared/record-payload";
import { RecordRowActions } from "../shared/record-row-actions";

/**
 * The prices inside one pricebook.
 *
 * A pricebook entry is a record type, not a nested blob, so it gets a
 * description of its own and the sheet renders a list and a form from it rather
 * than hand-drawing both. The product picker is supplied through `controls`
 * because who may be priced depends on the tenant's catalogue, which is a screen
 * concern — the description names the domain and stops there.
 *
 * Prices are typed and shown as money. The API stores minor units; converting on
 * the boundary is what stops one screen showing "1000" beside "₹10.00".
 */

interface PricebookEntriesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricebook: Pricebook | null;
}

export function PricebookEntriesSheet({
  open,
  onOpenChange,
  pricebook,
}: PricebookEntriesSheetProps) {
  const layout = useTenantLayout(PRICEBOOK_ENTRY_LAYOUT);
  const money = useOrgDisplay();
  const pricebookId = pricebook?.id ?? "";

  const { data: entries, isLoading, isError, refetch } = usePricebookEntries(pricebookId);
  const { data: productsData } = useProducts();
  const upsertEntry = useUpsertPricebookEntry();
  const deleteEntry = useDeletePricebookEntry();
  const [formGeneration, setFormGeneration] = useState(0);

  const productOptions = useMemo(
    () =>
      (productsData?.products ?? []).map((product) => ({
        value: String(product.id),
        label: product.name,
        sublabel: product.sku ?? undefined,
      })),
    [productsData],
  );

  const rows = useMemo(
    () =>
      (entries ?? []).map((entry) => ({
        id: entry.id,
        productId: entry.productId,
        productName: entry.productName ?? `Product ${entry.productId}`,
        productSku: entry.productSku ?? "",
        productCurrency: entry.productCurrency ?? pricebook?.currency ?? "",
        unitPrice: entry.unitPriceCents / 100,
        minQuantity: entry.minQuantity,
      })),
    [entries, pricebook],
  );

  const handleDelete = useCallback(
    (entryId: string) => {
      if (!pricebookId) return;
      deleteEntry.mutate(
        { pricebookId, entryId },
        {
          onSuccess: () => toast.success("Price removed"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [deleteEntry, pricebookId],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const rowActions = useCallback(
    (row: Record<string, unknown>) => (
      <RecordRowActions
        deleteLabel={`Remove ${String(row.productName)}`}
        onDelete={() => handleDelete(String(row.id))}
      />
    ),
    [handleDelete],
  );

  const controls = useMemo(
    () => ({
      productId: (control: RecordFieldControl) => (
        <Combobox
          options={productOptions}
          value={control.value}
          onChange={control.onChange}
          placeholder="Choose a product…"
          searchPlaceholder="Search by name or SKU"
          emptyText="No products found"
        />
      ),
    }),
    [productOptions],
  );

  function handleSubmit(values: RecordFormValues) {
    if (!pricebookId) return;
    const productId = numberOrOmit(values, "productId");
    const unitPrice = numberOrOmit(values, "unitPrice");
    if (productId === undefined || productId <= 0 || unitPrice === undefined) return;

    upsertEntry.mutate(
      {
        pricebookId,
        productId,
        unitPriceCents: Math.round(unitPrice * 100),
        minQuantity: numberOr(values, "minQuantity", 1),
      },
      {
        onSuccess: () => {
          toast.success("Price saved");
          setFormGeneration((generation) => generation + 1);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{pricebook ? `Prices — ${pricebook.name}` : "Prices"}</SheetTitle>
          <SheetDescription>
            What each product costs in this book, and the smallest order that earns the price.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-gap-section px-6 py-5">
          {isLoading ? (
            <DataTableSkeleton rows={6} columns={layout.list.columns.length} />
          ) : isError ? (
            <ErrorState
              title="Couldn't load these prices"
              description="The pricebook's entries didn't load. Check your connection and try again."
              onRetry={handleRetry}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              compact
              illustrationPreset="documents"
              title="No prices in this book yet"
              description="Add the first product below and it becomes available to quotes using this book."
            />
          ) : (
            <RecordList
              layout={layout}
              rows={rows}
              getRowKey={(row) => String(row.id)}
              actions={rowActions}
              density="compact"
              money={money}
              minWidth="480px"
              pagination={{ pageSize: 10 }}
            />
          )}

          <div className="rounded-xl border border-border bg-card p-card-pad">
            <RecordForm
              key={formGeneration}
              layout={layout}
              mode="create"
              initial={{ minQuantity: "1" }}
              controls={controls}
              onSubmit={handleSubmit}
              isSubmitting={upsertEntry.isPending}
              submitLabel="Add price"
            />
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
