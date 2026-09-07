"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { ErrorState } from "@/components/shared";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { EmptyCompaniesIllustration } from "@/components/illustrations";
import { RecordList, asRecordValues, type RecordValue } from "@/components/renderer";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { COMPANY_LAYOUT } from "@/lib/renderer/crm/company-layout";
import { useCan } from "@/hooks/api/access";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useCrmOrganizations, useDeleteCrmOrganization } from "@/hooks/api/crm";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { getErrorMessage } from "@/lib/get-error-message";
import { CompanyRowActions, CompanySelectionBar } from "./company-list-controls";
import { CompanySheet } from "./company-sheet";
import { CompanyMergeDialog } from "./detail/company-merge-dialog";
import type { DuplicateOrgPair } from "@/types/crm";

const PAGE_SIZE = 20;

export function CompanyListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const layout = useTenantLayout(COMPANY_LAYOUT);
  const money = useOrgDisplay();
  const [density, setDensity] = useDensity();

  const canManage = useCan("crm:organizations:manage");
  const canMerge = useCan("crm:organizations:merge");

  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } = useQueryParamOpen("create");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mergeOpen, setMergeOpen] = useState(false);

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [cursorIndex, setCursorIndex] = useState(0);

  const filterKey = debouncedSearch.trim();

  useEffect(() => {
    setCursors([undefined]);
    setCursorIndex(0);
  }, [filterKey]);

  const deleteCompany = useDeleteCrmOrganization();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearch === current) return;
    updateParams({ q: debouncedSearch || null });
  }, [debouncedSearch, searchParams, updateParams]);

  const currentCursor = cursors[cursorIndex];

  const { data, isLoading, isError, error, refetch, access } = useCrmOrganizations({
    search: debouncedSearch.trim() || undefined,
    pageSize: PAGE_SIZE,
    cursor: currentCursor,
  });

  const companies = useMemo(() => data?.organizations ?? [], [data?.organizations]);
  const hasMore = data?.hasMore ?? false;
  const isFiltered = !!debouncedSearch.trim();

  const mergePair = useMemo<DuplicateOrgPair | null>(() => {
    if (selectedIds.size !== 2) return null;
    const [firstId, secondId] = [...selectedIds];
    const first = companies.find((company) => company.id === firstId);
    const second = companies.find((company) => company.id === secondId);
    if (!first || !second) return null;
    return {
      org1: { id: first.id, name: first.name, domain: first.domain },
      org2: { id: second.id, name: second.name, domain: second.domain },
      matchReason: "name",
    };
  }, [selectedIds, companies]);

  const handleSearchChange = useCallback((value: string) => setSearch(value), []);
  const handleOpenCreate = useCallback(() => openCreate(), [openCreate]);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleClearSearch = useCallback(() => {
    setSearch("");
    updateParams({ q: null });
  }, [updateParams]);

  const handleNextPage = useCallback(() => {
    const next = data?.nextCursor ?? undefined;
    setCursors((prev) => [...prev.slice(0, cursorIndex + 1), next]);
    setCursorIndex((i) => i + 1);
  }, [data?.nextCursor, cursorIndex]);

  const handlePreviousPage = useCallback(() => {
    setCursorIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleRowClick = useCallback(
    (row: RecordValue) => router.push(`/crm/companies/${String(row.id)}`),
    [router],
  );

  const handleSelect = useCallback((companyId: number, selected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(companyId);
      else next.delete(companyId);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const handleOpenMerge = useCallback(() => setMergeOpen(true), []);

  const handleMergeOpenChange = useCallback((open: boolean) => {
    setMergeOpen(open);
    if (!open) setSelectedIds(new Set());
  }, []);

  const handleRequestDelete = useCallback((companyId: number) => setDeleteId(companyId), []);
  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deleteCompany.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Company deleted");
        setDeleteId(null);
      },
      onError: (deleteError) => {
        toast.error(getErrorMessage(deleteError));
        setDeleteId(null);
      },
    });
  }, [deleteId, deleteCompany]);

  const renderRowActions = useCallback(
    (row: RecordValue) => (
      <CompanyRowActions
        companyId={Number(row.id)}
        companyName={String(row.name ?? "this company")}
        selected={selectedIds.has(Number(row.id))}
        canSelect={canMerge}
        canDelete={canManage}
        onSelect={handleSelect}
        onDelete={handleRequestDelete}
      />
    ),
    [selectedIds, canMerge, canManage, handleSelect, handleRequestDelete],
  );

  return (
    <PageWrapper
      title="Companies"
      subtitle="Your company directory"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            placeholder={layout.list.searchPlaceholder}
            value={search}
            onValueChange={handleSearchChange}
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
            New company
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {selectedIds.size > 0 ? (
          <CompanySelectionBar
            count={selectedIds.size}
            canMerge={!!mergePair}
            onMerge={handleOpenMerge}
            onClear={handleClearSelection}
          />
        ) : null}

        {isLoading ? (
          <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load companies"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : companies.length === 0 ? (
          <EmptyState
            access={access}
            illustration={<EmptyCompaniesIllustration />}
            title="No companies yet"
            description={
              isFiltered
                ? "No results match your filters."
                : "A company groups the contacts, leads and deals belonging to one account. Add the first one to start linking records to it."
            }
            filtersActive={isFiltered}
            onClearFilters={handleClearSearch}
            action={!isFiltered && canManage ? { label: "Add company", onClick: handleOpenCreate } : undefined}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <>
            <RecordList
              layout={layout}
              rows={asRecordValues(companies)}
              getRowKey={(row) => String(row.id)}
              onRowClick={handleRowClick}
              actions={canManage || canMerge ? renderRowActions : undefined}
              density={density}
              money={money}
              minWidth="900px"
              className={CONTENT_FILL_PANEL}
            />
            {(cursorIndex > 0 || hasMore) ? (
              <CursorPageControls
                page={cursorIndex + 1}
                hasNext={hasMore}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
              />
            ) : null}
          </>
        )}
      </div>

      <CompanySheet open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete company"
        description="The company leaves your directory. Its contacts, leads and deals are not deleted, and there is no way to bring the company back from here."
        confirmLabel="Delete"
        destructive
        isPending={deleteCompany.isPending}
        onConfirm={handleConfirmDelete}
      />

      {mergePair ? (
        <CompanyMergeDialog
          pair={mergePair}
          currentOrgId={mergePair.org1.id}
          open={mergeOpen}
          onOpenChange={handleMergeOpenChange}
          onMergeComplete={handleClearSelection}
        />
      ) : null}
    </PageWrapper>
  );
}
