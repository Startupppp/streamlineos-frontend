"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, FileSpreadsheet, Users } from "lucide-react";
import { EmptyLeadsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import {
  CONTENT_FILL_PANEL,
  FILTER_SELECT_TRIGGER,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { ImportLinkButton } from "@/features/crm/import/import-link-button";
import { LeadDistributionDialog } from "@/features/crm/leads/lead-distribution-dialog";
import { toLeadRecords } from "@/features/crm/leads/lead-record";
import { useLeadLayout } from "@/features/crm/leads/use-lead-layout";
import { RecordList } from "@/components/renderer";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useCan } from "@/hooks/api/access";
import { useLeads } from "@/hooks/api/leads";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { queryKeys } from "@/lib/query-keys";
import { withColumns } from "@/lib/renderer/layout-adjustment";
import { fieldByName } from "@/lib/renderer/layout";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { PipelineStatus } from "@/types/leads";


const TERMINAL_STATUSES = new Set(["CONVERTED", "LOST"]);

const COLUMNS = ["name", "email", "phone", "source", "status", "assignedToName"] as const;

const PAGE_SIZE = 50;

export default function LeadDistributionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const canCreateLead = useCan("crm:leads:create");

  const leadLayout = useLeadLayout();
  const layout = useMemo(() => withColumns(leadLayout, COLUMNS), [leadLayout]);
  const statusOptions = useMemo(
    () => (fieldByName(leadLayout, "status")?.options ?? []).filter(
      (option) => !TERMINAL_STATUSES.has(option.value),
    ),
    [leadLayout],
  );
  const money = useOrgDisplay();
  const [density, setDensity] = useDensity();

  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDistribute, setShowDistribute] = useState(false);

  const debouncedInput = useDebouncedValue(inputValue, 300);

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedInput === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedInput) params.set("q", debouncedInput);
    else params.delete("q");
    router.replace(`?${params.toString()}`);
  }, [debouncedInput, searchParams, router]);

  const { data, isLoading, isError, error } = useLeads({
    status: statusFilter !== "all" ? (statusFilter as PipelineStatus) : undefined,
    search: debouncedInput.trim() || undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
    limit: 100,
  });

  const refetch = useCallback(() => {
    void qc.invalidateQueries({ queryKey: queryKeys.leads.all });
  }, [qc]);

  const leads = useMemo(() => data?.leads ?? [], [data]);
  const rows = useMemo(() => toLeadRecords(leads), [leads]);

  const unassignedCount = useMemo(
    () => leads.filter((lead) => !lead.assignedTo?.id).length,
    [leads],
  );

  const selection = useMemo(
    () => ({
      selected: new Set<string | number>([...selectedIds].map(String)),
      onChange: (next: Set<string | number>) => setSelectedIds(new Set([...next].map(Number))),
    }),
    [selectedIds],
  );

  const handleSearchChange = useCallback((value: string) => setInputValue(value), []);

  const handleStatusChange = useCallback(
    (value: string) => {
      setStatusFilter(value);
      setSelectedIds(new Set());
      const params = new URLSearchParams(searchParams.toString());
      if (value !== "all") params.set("status", value);
      else params.delete("status");
      router.replace(`?${params.toString()}`);
    },
    [searchParams, router],
  );

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleClearFilters = useCallback(() => {
    setStatusFilter("all");
    setInputValue("");
    router.replace(window.location.pathname);
  }, [router]);

  const handleShowDistribute = useCallback(() => setShowDistribute(true), []);

  const handleDistributeSuccess = useCallback(() => {
    setSelectedIds(new Set());
    refetch();
  }, [refetch]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (debouncedInput.trim()) labels.push(`search "${debouncedInput.trim()}"`);
    if (statusFilter !== "all") {
      const label = statusOptions.find((option) => option.value === statusFilter)?.label;
      labels.push(`status ${(label ?? statusFilter).toLowerCase()}`);
    }
    return labels;
  }, [debouncedInput, statusFilter, statusOptions]);

  const isFiltered = activeFilterLabels.length > 0;

  return (
    <PageWrapper
      title="Lead distribution"
      subtitle={isLoading ? undefined : `${data?.totalCount ?? 0} leads`}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            placeholder={layout.list.searchPlaceholder}
            value={inputValue}
            onValueChange={handleSearchChange}
          />
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-36")} aria-label="Status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedIds.size > 0 ? (
            <Button variant="ghost" size="sm" onClick={handleClearSelection}>
              Clear selection
            </Button>
          ) : null}
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
      actions={
        <>
          {canCreateLead ? <ImportLinkButton entity="leads" label="Import leads" /> : null}
          <Button disabled={selectedIds.size === 0} onClick={handleShowDistribute}>
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Distribute ({selectedIds.size})
          </Button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatCardGrid cols={3}>
          <StatCard
            label="Total leads"
            value={data?.totalCount ?? 0}
            icon={FileSpreadsheet}
            tone="blue"
            isLoading={isLoading}
          />
          <StatCard
            label="Unassigned"
            value={unassignedCount}
            icon={Users}
            tone="amber"
            isLoading={isLoading}
          />
          <StatCard label="Selected" value={selectedIds.size} icon={ArrowRight} tone="default" />
        </StatCardGrid>

        {isLoading ? (
          <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load leads"
            description={getErrorMessage(error)}
            onRetry={refetch}
            className={CONTENT_FILL_PANEL}
          />
        ) : leads.length === 0 ? (
          <EmptyState
            illustration={<EmptyLeadsIllustration />}
            title="No leads to distribute"
            filtersActive={isFiltered}
            filteredTitle="No leads match these filters"
            onClearFilters={handleClearFilters}
            description={
              isFiltered
                ? `Filtering by ${activeFilterLabels.join(", ")}. Clear the filters to see every lead.`
                : "Distribution hands unassigned leads out to your reps. Import a list, or add leads, and they show up here."
            }
            action={canCreateLead ? { label: "Import leads", href: "/crm/import?entity=leads" } : undefined}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={rows}
            getRowKey={(row) => String(row.id)}
            selection={selection}
            density={density}
            money={money}
            minWidth="900px"
            className={CONTENT_FILL_PANEL}
            pagination={{ pageSize: PAGE_SIZE }}
          />
        )}
      </div>

      <LeadDistributionDialog
        open={showDistribute}
        onOpenChange={setShowDistribute}
        leadIds={[...selectedIds]}
        onSuccess={handleDistributeSuccess}
      />
    </PageWrapper>
  );
}
