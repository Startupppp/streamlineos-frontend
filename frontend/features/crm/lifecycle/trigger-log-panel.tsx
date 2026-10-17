"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useLifecycleTriggers, type LifecycleTriggerParams } from "@/hooks/api/crm/lifecycle";
import type { LifecycleTrigger } from "@/hooks/api/crm/lifecycle-schema";
import { cn } from "@/lib/utils";
import { formatDate } from "./lifecycle-format";

const PAGE_SIZE = 25;

const OUTCOME_OPTIONS = [
  { value: "held", label: "Draft held" },
  { value: "skipped", label: "Declined" },
] as const;
type Outcome = (typeof OUTCOME_OPTIONS)[number]["value"];

const HEADERS = ["Customer", "Kind", "Renewal", "Outcome", "Why", "Fired", ""];

function triggerKey(row: LifecycleTrigger) {
  return row.customerLifecycleTriggerId;
}

function OutcomeBadge({ row }: { row: LifecycleTrigger }) {
  if (row.outcome === "held")
    return <Badge variant="secondary" className="bg-status-success-surface text-status-success-ink">Draft held</Badge>;
  if (row.outcome === "skipped")
    return <Badge variant="secondary" className="bg-status-warning-surface text-status-warning-ink">Declined</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

interface TriggerLogPanelProps {
  locale: string;
}

/**
 * GET /crm/lifecycle-triggers: what each renewal sweep fired and what the
 * outbound loop answered. The declined rows are the ones somebody must act on,
 * so the outcome filter is the one this log carries.
 */
export function TriggerLogPanel({ locale }: TriggerLogPanelProps) {
  const [outcome, setOutcome] = useState<Outcome | "all">("all");
  const [offset, setOffset] = useState(0);
  const params = useMemo<LifecycleTriggerParams>(
    () => ({ limit: PAGE_SIZE, offset, ...(outcome === "all" ? {} : { outcome }) }),
    [offset, outcome],
  );
  const query = useLifecycleTriggers(params);
  const rows = useMemo(() => query.data?.triggers ?? [], [query.data]);
  const isFiltered = outcome !== "all";
  const pageState = usePageState({
    permission: "crm:lifecycle-triggers:view",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty: rows.length === 0,
    hasActiveFilters: isFiltered,
  });

  function handleOutcomeChange(value: string) {
    setOutcome(OUTCOME_OPTIONS.find((option) => option.value === value)?.value ?? "all");
    setOffset(0);
  }
  function handleClearFilters() {
    setOutcome("all");
    setOffset(0);
  }
  function handleNext() {
    setOffset((current) => current + PAGE_SIZE);
  }
  function handlePrevious() {
    setOffset((current) => Math.max(0, current - PAGE_SIZE));
  }
  function handleRetry() {
    void query.refetch();
  }

  const columns = useMemo<DataTableColumn<LifecycleTrigger>[]>(
    () => [
      {
        key: "party",
        header: "Customer",
        cell: (row) => <span className="font-medium">{row.partyName ?? "Removed customer"}</span>,
      },
      { key: "kind", header: "Kind", cell: (row) => row.kind.replace(/-/g, " ") },
      { key: "renewalOn", header: "Renewal", cell: (row) => formatDate(row.renewalOn, locale) },
      { key: "outcome", header: "Outcome", cell: (row) => <OutcomeBadge row={row} /> },
      {
        key: "reason",
        header: "Why",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.refusalReason ?? (row.attempts > 1 ? `${row.attempts} attempts` : "—")}
          </span>
        ),
      },
      {
        key: "firedAt",
        header: "Fired",
        cell: (row) => <span className="tabular-nums">{formatDate(row.firedAt, locale)}</span>,
      },
      {
        key: "deal",
        header: "",
        cell: (row) =>
          row.opportunityDealId === null ? null : (
            <Link className="text-sm underline-offset-4 hover:underline" href={`/crm/deals/${row.opportunityDealId}`}>
              Opportunity
            </Link>
          ),
      },
    ],
    [locale],
  );

  const emptyState = (
    <EmptyState
      access={query.access}
      className="flex-1"
      illustrationPreset="report"
      title="No triggers yet"
      description={
        isFiltered
          ? "No results match your filters."
          : "Each renewal sweep logs here which contracts it acted on and what the outbound loop answered."
      }
      filtersActive={isFiltered}
      onClearFilters={handleClearFilters}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className={FILTER_TOOLBAR_ROW}>
        <Select value={outcome} onValueChange={handleOutcomeChange}>
          <SelectTrigger className={cn("w-fit min-w-36", FILTER_SELECT_TRIGGER)} aria-label="Outcome">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            <SelectItem value="all">All outcomes</SelectItem>
            {OUTCOME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton rows={10} headers={HEADERS} className="flex-1" />}
        empty={emptyState}
        onClearFilters={handleClearFilters}
        onRetry={handleRetry}
        className="flex-1"
      >
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={triggerKey}
          emptyState={emptyState}
          minWidth="860px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "cursor",
            pageSize: PAGE_SIZE,
            hasMore: query.data?.hasMore ?? false,
            hasPrevious: offset > 0,
            onNext: handleNext,
            onPrevious: handlePrevious,
          }}
        />
      </PageState>
    </div>
  );
}
