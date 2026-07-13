"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeadsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CsvUploadDialog } from "@/features/crm/leads/csv-upload-dialog";
import { LeadDistributionDialog } from "@/features/crm/leads/lead-distribution-dialog";
import { Search, Users, ArrowRight, FileSpreadsheet } from "lucide-react";
import { useLeads } from "@/hooks/api/leads";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Lead, PipelineStatus } from "@/types/leads";

const STATUS_BADGE: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  CONTACTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  INTERESTED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  QUALIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  CONVERTED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  LOST: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

const LEAD_COLUMNS: DataTableColumn<Lead>[] = [
  {
    key: "name",
    header: "Name",
    cell: (lead) => <span className="font-medium">{lead.name}</span>,
    sortable: true,
    sortValue: (lead) => lead.name,
  },
  {
    key: "email",
    header: "Email",
    cell: (lead) => (
      <span className="text-muted-foreground">{lead.email ?? "—"}</span>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    className: "font-mono",
    cell: (lead) => (
      <span className="text-muted-foreground">{lead.phone ?? "—"}</span>
    ),
  },
  {
    key: "source",
    header: "Source",
    cell: (lead) => (
      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
        {lead.source ?? "—"}
      </Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (lead) => (
      <Badge
        variant="outline"
        className={cn("text-[9px] px-1.5 py-0 h-4", STATUS_BADGE[lead.status] ?? "")}
      >
        {lead.status}
      </Badge>
    ),
  },
  {
    key: "assignedTo",
    header: "Assigned To",
    cell: (lead) => (
      <span className={lead.assignedTo?.name ? "" : "text-muted-foreground"}>
        {lead.assignedTo?.name ?? "Unassigned"}
      </span>
    ),
  },
];

export default function LeadDistributionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

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

  const filteredLeads = useMemo(() => data?.leads ?? [], [data]);

  const unassignedCount = useMemo(
    () => filteredLeads.filter((l) => !l.assignedTo?.id).length,
    [filteredLeads],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    [],
  );

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

  const handleSelectionChange = useCallback(
    (sel: Set<string | number>) => {
      setSelectedIds(new Set([...sel].map(Number)));
    },
    [],
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

  const emptyAction = useMemo(
    () =>
      statusFilter !== "all" || debouncedInput
        ? { label: "Clear filters", onClick: handleClearFilters }
        : undefined,
    [statusFilter, debouncedInput, handleClearFilters],
  );

  return (
    <PageWrapper
      title="Lead Distribution"
      subtitle={isLoading ? undefined : `${data?.totalCount ?? 0} leads`}
      filters={
        <>
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={inputValue}
              onChange={handleSearchChange}
              className="pl-8 h-8 text-xs w-full"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All statuses</SelectItem>
              <SelectItem value="NEW" className="text-xs">New</SelectItem>
              <SelectItem value="CONTACTED" className="text-xs">Contacted</SelectItem>
              <SelectItem value="INTERESTED" className="text-xs">Interested</SelectItem>
              <SelectItem value="QUALIFIED" className="text-xs">Qualified</SelectItem>
            </SelectContent>
          </Select>
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleClearSelection}
            >
              Clear selection
            </Button>
          )}
        </>
      }
      actions={
        <>
          <CsvUploadDialog onSuccess={refetch} />
          <Button disabled={selectedIds.size === 0} onClick={handleShowDistribute}>
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Distribute ({selectedIds.size})
          </Button>
        </>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <StatCardGrid cols={3}>
          <StatCard
            label="Total Leads"
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
          <StatCard
            label="Selected"
            value={selectedIds.size}
            icon={ArrowRight}
            tone="default"
          />
        </StatCardGrid>

        {isError ? (
          <ErrorState
            description={getErrorMessage(error)}
            onRetry={refetch}
            className="flex-1"
          />
        ) : (
          <DataTable
            data={filteredLeads}
            columns={LEAD_COLUMNS}
            getRowKey={(lead) => lead.id}
            isLoading={isLoading}
            className="flex-1 min-h-0"
            selection={{
              selected: new Set<string | number>([...selectedIds]),
              onChange: handleSelectionChange,
            }}
            pagination={{ pageSize: 50 }}
            minWidth="640px"
            emptyState={
              <EmptyState
                illustration={<EmptyLeadsIllustration />}
                title="No leads found"
                description={
                  statusFilter !== "all" || debouncedInput
                    ? "No leads match your filters."
                    : "Upload leads or adjust your search to get started."
                }
                action={emptyAction}
                className="border-0 bg-transparent"
              />
            }
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
