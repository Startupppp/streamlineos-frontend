"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProductsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { RecordList, asRecordValues } from "@/components/renderer";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { RecordRowActions } from "@/features/crm/settings/shared/record-row-actions";
import { PricebookSheet } from "@/features/crm/settings/pricebooks/pricebook-sheet";
import { PricebookEntriesSheet } from "@/features/crm/settings/pricebooks/pricebook-entries-sheet";
import { useCan } from "@/hooks/api/access";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useDeletePricebook, usePricebooks } from "@/hooks/api/crm/pricebooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { PRICEBOOK_LAYOUT } from "@/lib/renderer/crm/settings/pricebook-layout";
import type { Pricebook } from "@/types/crm/pricebooks";

/**
 * Pricebooks.
 *
 * Opening a row opens its prices, which is the reason anyone comes here — the
 * old table carried a "Manage Entries" button in its own column, which is a
 * destination dressed as a cell. Editing the book itself and deleting it stay in
 * the row's action column, where the rest of the product puts them.
 */
export default function PricebooksPage() {
  const layout = useTenantLayout(PRICEBOOK_LAYOUT);
  const money = useOrgDisplay();
  const [density, setDensity] = useDensity();
  const canManage = useCan("crm:pricebooks:manage");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Pricebook | null>(null);
  const [entriesTarget, setEntriesTarget] = useState<Pricebook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pricebook | null>(null);

  const { data, isLoading, isError, refetch } = usePricebooks();
  const deletePricebook = useDeletePricebook();

  const query = debouncedSearch.trim().toLowerCase();
  const pricebooks = useMemo(() => {
    const all = data ?? [];
    return query ? all.filter((book) => book.name.toLowerCase().includes(query)) : all;
  }, [data, query]);

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleEntriesOpenChange = useCallback((open: boolean) => {
    if (!open) setEntriesTarget(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleClearSearch = useCallback(() => setSearch(""), []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deletePricebook.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Pricebook deleted");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteTarget(null);
      },
    });
  }, [deletePricebook, deleteTarget]);

  const handleRowClick = useCallback(
    (row: Record<string, unknown>) => {
      const book = pricebooks.find((candidate) => candidate.id === row.id);
      if (book) setEntriesTarget(book);
    },
    [pricebooks],
  );

  const rowActions = useCallback(
    (row: Record<string, unknown>) => {
      const book = pricebooks.find((candidate) => candidate.id === row.id);
      if (!book) return null;
      return (
        <RecordRowActions
          editLabel={`Edit ${book.name}`}
          deleteLabel={`Delete ${book.name}`}
          onEdit={() => {
            setEditTarget(book);
            setSheetOpen(true);
          }}
          onDelete={() => setDeleteTarget(book)}
        />
      );
    },
    [pricebooks],
  );

  return (
    <PageWrapper
      title="Pricebooks"
      subtitle="One set of prices per segment, region or reseller tier."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            placeholder={layout.list.searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenCreate}
          >
            New pricebook
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!canManage ? (
          <NoPermissionState
            permission="crm:pricebooks:manage"
            className={CONTENT_FILL_PANEL}
            description="Pricebooks are managed by whoever sets your pricing."
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={10} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load pricebooks"
            description="The pricebook list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : pricebooks.length === 0 ? (
          <EmptyState
            illustration={<EmptyProductsIllustration />}
            title={query ? "No pricebooks match that search" : "No pricebooks yet"}
            description={
              query
                ? `Nothing matches "${debouncedSearch.trim()}". Clear the search to see every book.`
                : "A pricebook holds one set of prices, so a reseller and a direct customer can be quoted different figures for the same product."
            }
            action={
              query
                ? { label: "Clear search", onClick: handleClearSearch }
                : { label: "New pricebook", onClick: handleOpenCreate }
            }
            actionVariant={query ? "outline" : undefined}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={asRecordValues(pricebooks)}
            getRowKey={(row) => String(row.id)}
            onRowClick={handleRowClick}
            actions={rowActions}
            density={density}
            money={money}
            minWidth="760px"
            className={CONTENT_FILL_PANEL}
          />
        )}
      </div>

      <PricebookSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        pricebook={editTarget}
      />

      <PricebookEntriesSheet
        open={entriesTarget !== null}
        onOpenChange={handleEntriesOpenChange}
        pricebook={entriesTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this pricebook?"
        description={
          deleteTarget
            ? `${deleteTarget.name} and every price in it will be permanently deleted. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete pricebook"
        destructive
        isPending={deletePricebook.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
