"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { statusToneClasses } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatCalendarDate, formatDateTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import {
  ALLOCATION_OVERRIDE_READ,
  useAllocationOverrides,
  type AllocationOverride,
  type AllocationOverrideVerdict,
} from "@/hooks/api/inventory/allocation-overrides";

const PAGE_SIZE = 50;
const ALL_VERDICTS = "all";

const VERDICT_LABEL: Readonly<Record<AllocationOverrideVerdict, string>> = {
  NEAR_EXPIRY: "Near expiry",
  SHELF_LIFE: "Below shelf life",
};

/**
 * The register of expiry rules somebody set aside, and why.
 *
 * `GET /inventory/traceability/allocation-overrides` is the only record that a
 * near-expiry or minimum-shelf-life policy was overruled on a specific lot, for
 * a named client, by a named person, with a stated reason. It had no caller, so
 * the overrides were being written and read by nobody — a control that runs and
 * is never reviewed is a control in name only.
 *
 * Cursor-paginated because the register only grows: there is no page count
 * because the server is never asked to count a table that is being appended to
 * while it is read.
 */
export function AllocationOverridesClient() {
  const canView = useCan(ALLOCATION_OVERRIDE_READ);
  const [verdict, setVerdict] = useState<string>(ALL_VERDICTS);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { cursor, pageNumber, hasPrevious, goNext, goPrevious, reset } = useCursorPagination();

  const query = useAllocationOverrides({
    ...(verdict === ALL_VERDICTS ? {} : { verdict: verdict as AllocationOverrideVerdict }),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
    limit: PAGE_SIZE,
  });

  const rows = query.data?.items ?? [];
  const hasFilters = verdict !== ALL_VERDICTS || !!fromDate || !!toDate;

  function handleVerdictChange(next: string): void {
    setVerdict(next);
    reset();
  }

  function handleFromChange(next: string): void {
    setFromDate(next);
    reset();
  }

  function handleToChange(next: string): void {
    setToDate(next);
    reset();
  }

  function handleClearFilters(): void {
    setVerdict(ALL_VERDICTS);
    setFromDate("");
    setToDate("");
    reset();
  }

  function handleNextPage(): void {
    goNext(query.data?.nextCursor);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const columns: DataTableColumn<AllocationOverride>[] = [
    {
      key: "createdAt",
      header: "When",
      className: "font-mono tabular-nums whitespace-nowrap",
      cell: (row) => formatDateTime(row.createdAt),
    },
    {
      key: "actor",
      header: "Who",
      cell: (row) => <TruncatedText text={row.actorName ?? row.actorUserId} className="text-sm" />,
    },
    {
      key: "verdict",
      header: "Rule set aside",
      cell: (row) => <VerdictBadge verdict={row.verdict} />,
    },
    {
      key: "lot",
      header: "Lot",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-sm">{row.lotNumber}</p>
          <p className="truncate text-dense text-muted-foreground">
            {describeMargin(row)}
          </p>
        </div>
      ),
    },
    {
      key: "client",
      header: "Allocated to",
      cell: (row) => (
        <TruncatedText
          text={row.clientName ?? describeSource(row)}
          className="text-sm text-muted-foreground"
        />
      ),
    },
    {
      key: "reason",
      header: "Reason given",
      cell: (row) => <TruncatedText text={row.reason} className="text-sm" />,
    },
  ];

  if (!canView)
    return (
      <PageWrapper title="Allocation overrides">
        <NoPermissionState permission={ALLOCATION_OVERRIDE_READ} className="flex-1" />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Allocation overrides"
      subtitle="Every time an expiry rule was set aside for a lot, and the reason given."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={verdict} onValueChange={handleVerdictChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-52")} aria-label="Rule set aside">
              <SelectValue placeholder="All rules" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value={ALL_VERDICTS}>All rules</SelectItem>
              <SelectItem value="NEAR_EXPIRY">{VERDICT_LABEL.NEAR_EXPIRY}</SelectItem>
              <SelectItem value="SHELF_LIFE">{VERDICT_LABEL.SHELF_LIFE}</SelectItem>
            </SelectContent>
          </Select>
          <DatePicker
            value={fromDate}
            onChange={handleFromChange}
            placeholder="From"
            className="w-full sm:max-w-[160px]"
          />
          <DatePicker
            value={toDate}
            onChange={handleToChange}
            placeholder="To"
            className="w-full sm:max-w-[160px]"
          />
        </div>
      }
    >
      {query.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load the override register"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      ) : !query.isLoading && rows.length === 0 ? (
        <InventoryEmptyState
          className="flex-1"
          illustration={<EmptyActivityIllustration />}
          title={hasFilters ? "No overrides match your filters" : "No overrides recorded"}
          description={
            hasFilters
              ? "Try widening the window or clearing the rule filter."
              : "Nobody has allocated a lot the expiry policy would have refused. An override is recorded here the moment somebody does."
          }
          {...(hasFilters ? { action: { label: "Clear filters", onClick: handleClearFilters } } : {})}
        />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={query.isLoading}
          minWidth="1000px"
          pagination={{
            mode: "cursor",
            pageSize: PAGE_SIZE,
            pageNumber,
            hasMore: query.data?.hasMore ?? false,
            hasPrevious,
            onNext: handleNextPage,
            onPrevious: goPrevious,
          }}
        />
      )}
    </PageWrapper>
  );
}

function VerdictBadge({ verdict }: { verdict: AllocationOverrideVerdict }) {
  const tone = statusToneClasses(verdict === "NEAR_EXPIRY" ? "warning" : "danger");
  return (
    <Badge
      variant="outline"
      className={cn("h-5 px-2 py-0.5 text-micro", tone.surface, tone.ink, tone.rule)}
    >
      {VERDICT_LABEL[verdict]}
    </Badge>
  );
}

/**
 * How far outside the rule the lot actually was, in the rule's own terms — the
 * difference between "an override happened" and "an override of eleven days
 * against a thirty-day window happened".
 */
function describeMargin(row: AllocationOverride): string {
  const expiry = row.lotExpiryDate ? `expires ${formatCalendarDate(row.lotExpiryDate)}` : null;
  const remaining =
    row.daysRemaining === null ? null : `${String(row.daysRemaining)} days left`;
  const threshold =
    row.verdict === "NEAR_EXPIRY"
      ? row.nearExpiryWindowDays === null
        ? null
        : `window ${String(row.nearExpiryWindowDays)} days`
      : row.minShelfLifeDays === null
        ? null
        : `minimum ${String(row.minShelfLifeDays)} days`;
  const parts = [expiry, remaining, threshold].filter((part) => part !== null);
  return parts.length === 0 ? "—" : parts.join(" · ");
}

/** With no client on the row, the document the allocation belonged to. */
function describeSource(row: AllocationOverride): string {
  if (!row.sourceType) return "—";
  return `${row.sourceType} ${row.sourceId ?? ""}`.trim();
}
