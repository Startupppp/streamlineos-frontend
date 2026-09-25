"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { SourceBadge } from "@/components/shared/source-badge";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCursorPager } from "@/components/ui/table-pagination";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useHrKbLinkConfig } from "@/hooks/api/kb/hr-link-config";
import { useLinkedDocuments, type LinkedDocumentItem, type LinkedDocumentStatus } from "@/hooks/api/kb/linked-documents";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import { companyDocumentHref } from "@/lib/knowledge-routes";
import { linkedDocumentTitle } from "@/features/wiki/lib/linked-document-title";
import { kbFormatDate, kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";

const PAGE_LIMIT = 30;
const STATUS_VALUES = ["active", "unpublished", "source_removed", "all"] as const;

const STATUS_LABELS: Record<LinkedDocumentStatus, string> = {
  active: "Live",
  unpublished: "Withdrawn",
  source_removed: "Source removed",
};

function NameCell(row: LinkedDocumentItem) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link href={companyDocumentHref(row.id)} className="truncate font-medium text-foreground hover:underline">
        {linkedDocumentTitle(row)}
      </Link>
      <SourceBadge kind="hr-document" />
      {row.status !== "active" ? <SemanticBadge tone="warning" size="xs" label={STATUS_LABELS[row.status]} /> : null}
    </div>
  );
}

const COLUMNS: DataTableColumn<LinkedDocumentItem>[] = [
  { key: "name", header: "Name", cell: NameCell },
  { key: "category", header: "Category", cell: (row) => row.category ?? "—" },
  {
    key: "effective",
    header: "Effective from",
    className: "tabular-nums text-sm text-muted-foreground",
    cell: (row) => (row.effectiveDate ? kbFormatDate(row.effectiveDate) : "—"),
  },
  {
    key: "version",
    header: "Version",
    className: "tabular-nums text-sm text-muted-foreground",
    cell: (row) => (row.version === null ? "—" : `v${row.version}`),
  },
  {
    key: "published",
    header: "Added",
    className: "tabular-nums text-sm text-muted-foreground",
    cell: (row) => kbTimeAgo(row.publishedAt),
  },
];

/**
 * The company documents HR has shared into the knowledge base, for the person reading. Each row is marked as an
 * HR document: it is a pointer at a file HR owns, not a wiki page. Publishers can also list the entries that are no
 * longer live (withdrawn, or whose source was removed); everyone else only ever sees what they may open, and the
 * server decides that, not this page.
 */
export default function CompanyDocumentsPage() {
  const searchParams = useSearchParams();
  const { update } = useUrlFilters();
  const canPublish = useCan("hr:documents:publish");
  const status = parseEnum(searchParams.get("status"), STATUS_VALUES, "active");
  const requestedStatus = canPublish ? status : "active";

  const pager = useCursorPager(requestedStatus);
  const { data: linkFlags, isLoading: configLoading, isError: configFailed, error: configError, refetch: refetchConfig } = useHrKbLinkConfig();
  const linkOn = linkFlags?.link === true;
  const linkOff = linkFlags?.link === false;
  const { data, isLoading, isError, error, refetch } = useLinkedDocuments(
    { cursor: pager.cursor, limit: PAGE_LIMIT, status: requestedStatus },
    { enabled: linkOn },
  );
  const rows = useMemo(() => data?.data ?? [], [data]);
  const isEmpty = linkOff || (data !== undefined && rows.length === 0);
  // A disabled query reports isLoading false, so the switch's own loading is added by hand.
  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading: isLoading || configLoading,
    isError: configFailed || (linkOn && isError),
    error: configFailed ? configError : error,
    isEmpty,
  });

  const handleNext = useCallback(() => pager.goNext(data?.pagination.nextCursor), [pager, data?.pagination.nextCursor]);
  const handlePrevious = useCallback(() => pager.goPrevious(), [pager]);
  const handleRetry = useCallback(() => {
    if (configFailed) void refetchConfig();
    else void refetch();
  }, [configFailed, refetchConfig, refetch]);
  const handleStatusChange = useCallback((value: string) => update({ status: value === "active" ? null : value }), [update]);
  const handleClearFilters = useCallback(() => update({ status: null }), [update]);
  const getRowKey = useCallback((row: LinkedDocumentItem) => row.id, []);

  const filters = canPublish && !linkOff ? (
    <Select value={status} onValueChange={handleStatusChange}>
      <SelectTrigger className="h-9 w-44 shrink-0" aria-label="Show entries">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Live</SelectItem>
        <SelectItem value="unpublished">Withdrawn</SelectItem>
        <SelectItem value="source_removed">Source removed</SelectItem>
        <SelectItem value="all">All</SelectItem>
      </SelectContent>
    </Select>
  ) : undefined;

  const filtered = requestedStatus !== "active";
  const empty = (
    <EmptyState
      illustrationPreset="default"
      title="No company documents yet"
      description={filtered ? "No entries have this status." : "Company documents that HR shares with you will appear here."}
      filtersActive={filtered}
      filteredTitle="Nothing here"
      onClearFilters={handleClearFilters}
    />
  );

  const notEnabled = (
    <EmptyState
      illustrationPreset="default"
      title="Company documents are not turned on"
      description="Your organisation has not turned on company documents, so there is nothing to show here."
    />
  );

  return (
    <PageWrapper title="Company documents" subtitle="Policies and documents HR has shared with you" filters={filters}>
      <PageState resolution={pageState} loading={<DataTableSkeleton columns={COLUMNS.length} />} empty={linkOff ? notEnabled : empty} onRetry={handleRetry}>
        <DataTable
          data={rows}
          columns={COLUMNS}
          getRowKey={getRowKey}
          emptyState={empty}
          pagination={{
            mode: "cursor",
            pageSize: PAGE_LIMIT,
            hasMore: data?.pagination.hasMore ?? false,
            hasPrevious: pager.hasPrevious,
            onNext: handleNext,
            onPrevious: handlePrevious,
          }}
        />
      </PageState>
    </PageWrapper>
  );
}
