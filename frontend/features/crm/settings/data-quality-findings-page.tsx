"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageState } from "@/components/shared/page-state";
import { RecordList } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { DATA_QUALITY_FINDING_LAYOUT } from "@/lib/renderer/crm/settings/data-quality-finding-layout";
import { useCursorPager } from "@/components/ui/table-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import {
  useDataQualityFindings,
  useResolveDataQualityFindings,
  type DataQualityFindingFilters,
} from "@/hooks/api/crm/data-quality-findings";
import type { DataQualityFinding } from "@/hooks/api/crm/data-quality-findings-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  FindingPartyName,
  FindingRowActions,
  humanizeFindingKind,
  type FindingDecision,
} from "./data-quality-finding-cells";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
] as const;

const PRODUCER_OPTIONS = [
  { value: "duplicate", label: "Duplicates" },
  { value: "contradiction", label: "Contradictions" },
  { value: "reachability", label: "Unreachable" },
  { value: "staleness", label: "Stale records" },
] as const;

const SEVERITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

type Status = (typeof STATUS_OPTIONS)[number]["value"];
type Producer = (typeof PRODUCER_OPTIONS)[number]["value"];
type Severity = (typeof SEVERITY_OPTIONS)[number]["value"];

function findingRowKey(row: DataQualityFinding) {
  return row.findingId;
}

const DECISION_COPY: Record<FindingDecision["action"], { title: string; description: string; confirm: string; done: string }> = {
  apply: {
    title: "Mark this finding resolved?",
    description: "Use this when the record has been fixed. Nothing on the record is changed by this action.",
    confirm: "Mark resolved",
    done: "Finding marked resolved",
  },
  dismiss: {
    title: "Dismiss this finding?",
    description: "Dismissing says the finding was wrong. It leaves the open queue and counts against the detector's accuracy.",
    confirm: "Dismiss",
    done: "Finding dismissed",
  },
};

export function DataQualityFindingsPage() {
  const layout = useTenantLayout(DATA_QUALITY_FINDING_LAYOUT);
  const canResolve = useCan("crm:data-quality:resolve");
  const [status, setStatus] = useState<Status>("open");
  const [producer, setProducer] = useState<Producer | "all">("all");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const pager = useCursorPager(`${status}-${producer}-${severity}`);
  const [decision, setDecision] = useState<FindingDecision | null>(null);

  const filters: DataQualityFindingFilters = {
    status,
    limit: PAGE_SIZE,
    ...(producer === "all" ? {} : { producer }),
    ...(severity === "all" ? {} : { severity }),
    ...(pager.cursor ? { cursor: pager.cursor } : {}),
  };
  const query = useDataQualityFindings(filters);
  const resolve = useResolveDataQualityFindings();
  const rows = useMemo(() => query.data?.data ?? [], [query.data]);
  const isFiltered = producer !== "all" || severity !== "all";

  const pageState = usePageState({
    permission: "crm:data-quality:view",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty: rows.length === 0,
    hasActiveFilters: isFiltered,
  });

  function handleStatusChange(value: string) {
    const next = STATUS_OPTIONS.find((o) => o.value === value);
    if (next) setStatus(next.value);
  }
  function handleProducerChange(value: string) {
    setProducer(PRODUCER_OPTIONS.find((o) => o.value === value)?.value ?? "all");
  }
  function handleSeverityChange(value: string) {
    setSeverity(SEVERITY_OPTIONS.find((o) => o.value === value)?.value ?? "all");
  }
  function handleClearFilters() {
    setProducer("all");
    setSeverity("all");
  }
  function handleNext() {
    pager.goNext(query.data?.pagination.nextCursor);
  }
  function handleRetry() {
    void query.refetch();
  }
  function handleDecisionOpenChange(open: boolean) {
    if (!open) setDecision(null);
  }
  function handleConfirmDecision() {
    if (!decision) return;
    const copy = DECISION_COPY[decision.action];
    resolve.mutate(
      { findingIds: [decision.finding.findingId], action: decision.action },
      {
        onSuccess: (result) => {
          if (result.failedCount > 0) toast.error(result.failures[0]?.error ?? "The finding could not be closed.");
          else toast.success(copy.done);
          setDecision(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  const cells = useMemo(
    () => ({
      findingKind: (row: DataQualityFinding) => humanizeFindingKind(row.findingKind),
      partyId: (row: DataQualityFinding) => <FindingPartyName partyId={row.partyId} />,
    }),
    [],
  );
  const renderActions = useCallback(
    (row: DataQualityFinding) => (
      <FindingRowActions finding={row} canResolve={canResolve} onDecide={setDecision} />
    ),
    [canResolve],
  );

  const emptyState = (
    <EmptyState
      access={query.access}
      className="flex-1"
      title={status === "open" ? "No open findings" : "Nothing here yet"}
      description={
        isFiltered
          ? "No results match your filters."
          : "Findings appear here when a data-quality scan spots duplicates, contradictions, unreachable or stale records."
      }
      filtersActive={isFiltered}
      onClearFilters={handleClearFilters}
    />
  );

  const filterBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className={cn("w-fit min-w-36", FILTER_SELECT_TRIGGER)} aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={producer} onValueChange={handleProducerChange}>
        <SelectTrigger className={cn("w-fit min-w-36", FILTER_SELECT_TRIGGER)} aria-label="Finding type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="all">All finding types</SelectItem>
          {PRODUCER_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={severity} onValueChange={handleSeverityChange}>
        <SelectTrigger className={cn("w-fit min-w-36", FILTER_SELECT_TRIGGER)} aria-label="Severity">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="all">All severities</SelectItem>
          {SEVERITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const copy = decision ? DECISION_COPY[decision.action] : null;

  return (
    <PageWrapper
      title="Data quality findings"
      subtitle="Problems the data-quality scans found, oldest first."
      backHref="/crm/settings/data-quality"
      filters={filterBar}
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton rows={12} headers={["Finding", "Severity", "Record", "Age (days)", "First detected"]} className="flex-1" />}
        empty={emptyState}
        onRetry={handleRetry}
        className="flex-1"
      >
        <RecordList
          layout={layout}
          rows={rows}
          getRowKey={findingRowKey}
          cells={cells}
          actions={renderActions}
          isLoading={query.isLoading}
          emptyState={emptyState}
          minWidth="720px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "cursor",
            pageSize: PAGE_SIZE,
            hasMore: query.data?.pagination.hasMore ?? false,
            hasPrevious: pager.hasPrevious,
            onNext: handleNext,
            onPrevious: pager.goPrevious,
          }}
        />
      </PageState>

      {copy ? (
        <ConfirmDialog
          open={!!decision}
          onOpenChange={handleDecisionOpenChange}
          title={copy.title}
          description={copy.description}
          confirmLabel={copy.confirm}
          destructive={decision?.action === "dismiss"}
          isPending={resolve.isPending}
          keepOpenOnConfirm
          onConfirm={handleConfirmDecision}
        />
      ) : null}
    </PageWrapper>
  );
}
