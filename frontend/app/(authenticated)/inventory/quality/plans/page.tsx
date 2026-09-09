"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { InspectionPlanCreateSheet } from "@/features/inventory/components/quality/inspection-plan-create-sheet";
import { InspectionPlanDetailSheet } from "@/features/inventory/components/quality/inspection-plan-detail-sheet";
import { buildInspectionPlanColumns } from "@/features/inventory/components/quality/inspection-plan-columns";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useInspectionPlans } from "@/hooks/api/inventory/inspection-plans";
import type { InspectionPlan } from "@/hooks/api/inventory/inspection-plans";

const PAGE_LIMIT = 20;

function InspectionPlansPageInner() {
  const canView = useCan("inventory:quality:read");
  const canManage = useCan("inventory:quality:plans:manage");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailPlanId, setDetailPlanId] = useState<number | null>(null);
  const [searchDraft, setSearchDraft] = useState(searchParams.get("search") ?? "");
  const search = useDebouncedValue(searchDraft, 300);

  const appliesOnParam = searchParams.get("appliesOn") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const plansQuery = useInspectionPlans({
    ...(search ? { search } : {}),
    ...(appliesOnParam === "RECEIPT" || appliesOnParam === "RETURN"
      ? { appliesOn: appliesOnParam }
      : {}),
    page,
    limit: PAGE_LIMIT,
  });

  function handleAppliesOnChange(value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("appliesOn");
    else params.set("appliesOn", value);
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleSearchChange(value: string): void {
    setSearchDraft(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("search", value);
    else params.delete("search");
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handlePageChange(nextPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleOpenCreate(): void {
    setCreateOpen(true);
  }

  function handleCreateOpenChange(next: boolean): void {
    setCreateOpen(next);
  }

  function handleRowClick(row: InspectionPlan): void {
    setDetailPlanId(row.id);
  }

  function handleDetailOpenChange(next: boolean): void {
    if (!next) setDetailPlanId(null);
  }

  function handleClearFilters(): void {
    setSearchDraft("");
    router.replace("?", { scroll: false });
  }

  function handleRetry(): void {
    void plansQuery.refetch();
  }

  const items = plansQuery.data?.items ?? [];
  const total = plansQuery.data?.total ?? 0;
  const hasFilters = !!search || !!appliesOnParam;

  const columns = buildInspectionPlanColumns(canManage);

  if (!canView)
    return (
      <PageWrapper title="Inspection plans" subtitle="Which arrivals must be inspected">
        <NoPermissionState permission="inventory:quality:read" className="flex-1" />
      </PageWrapper>
    );

  return (
    <>
      <PageWrapper
        title="Inspection plans"
        subtitle="Arrivals a plan covers are held out of available stock until a verdict."
        backHref="/inventory/quality"
        backLabel="Back to Quality"
        actions={
          canManage ? (
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={16}
              iconClassName="mr-1.5"
              size="sm"
              onClick={handleOpenCreate}
            >
              New plan
            </AnimatedIconButton>
          ) : undefined
        }
        filters={
          <div className={FILTER_TOOLBAR_ROW}>
            <SearchInput
              placeholder="Search plans…"
              value={searchDraft}
              onValueChange={handleSearchChange}
              className="min-w-0 flex-1 lg:max-w-md"
            />
            <Select value={appliesOnParam || "all"} onValueChange={handleAppliesOnChange}>
              <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-44")}>
                <SelectValue placeholder="All triggers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All triggers</SelectItem>
                <SelectItem value="RECEIPT">On receipt</SelectItem>
                <SelectItem value="RETURN">On return</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {plansQuery.isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load inspection plans"
            description={getErrorMessage(plansQuery.error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={items}
            columns={columns}
            className="flex-1 min-h-0"
            getRowKey={(row) => row.id}
            onRowClick={handleRowClick}
            isLoading={plansQuery.isLoading}
            minWidth="900px"
            emptyState={
              <InventoryEmptyState
                illustration={<EmptyWarehouseIllustration />}
                title={hasFilters ? "No plans match your filters" : "No inspection plans yet"}
                description={
                  hasFilters
                    ? "Try adjusting your search or trigger filter."
                    : "A plan decides which arrivals are quarantined until somebody checks them."
                }
                action={
                  hasFilters
                    ? { label: "Clear filters", onClick: handleClearFilters }
                    : canManage
                      ? { label: "New plan", onClick: handleOpenCreate }
                      : undefined
                }
                className="border-0 bg-transparent"
              />
            }
            pagination={{
              mode: "server",
              page,
              pageSize: PAGE_LIMIT,
              total,
              onPageChange: handlePageChange,
            }}
          />
        )}
      </PageWrapper>

      <InspectionPlanCreateSheet open={createOpen} onOpenChange={handleCreateOpenChange} />
      <InspectionPlanDetailSheet
        open={detailPlanId !== null}
        onOpenChange={handleDetailOpenChange}
        planId={detailPlanId}
        canManage={canManage}
      />
    </>
  );
}

export default function InspectionPlansPage() {
  return (
    <Suspense fallback={null}>
      <InspectionPlansPageInner />
    </Suspense>
  );
}
