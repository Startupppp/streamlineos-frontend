"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { SourceBadge } from "@/components/shared/source-badge";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { CompanyDocumentsSkeleton } from "./company-documents-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function CompanyDocumentsPage() {
  const searchParams = useSearchParams();
  const { update } = useUrlFilters({ pageParam: "cursor" });
  const canPublish = useCan("hr:documents:publish");
  const status = parseEnum(searchParams.get("status"), STATUS_VALUES, "active");
  const requestedStatus = canPublish ? status : "active";
  const cursor = canPublish || status === "active" ? searchParams.get("cursor") || undefined : undefined;
  const trailValue = searchParams.get("cursorTrail");
  const cursorTrail = useMemo<(string | null)[]>(() => {
    if (!cursor) return [];
    if (!trailValue) return [null];
    try {
      const parsed: unknown = JSON.parse(trailValue);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.length <= 100 &&
        parsed[0] === null &&
        parsed.every((entry: unknown, index: number) => index === 0 || typeof entry === "string")
      ) {
        return parsed;
      }
    } catch {
      return [null];
    }
    return [null];
  }, [cursor, trailValue]);
  const { data: linkFlags, isLoading: configLoading, isError: configFailed, error: configError, refetch: refetchConfig } = useHrKbLinkConfig();
  const linkOn = linkFlags?.link === true;
  const linkOff = linkFlags?.link === false;
  const { data, isLoading, isError, error, refetch } = useLinkedDocuments(
    { cursor, limit: PAGE_LIMIT, status: requestedStatus },
    { enabled: linkOn },
  );
  const rows = useMemo(() => data?.data ?? [], [data]);
  const isEmpty = linkOff || (data !== undefined && rows.length === 0);
  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading: isLoading || configLoading,
    isError: configFailed || (linkOn && isError),
    error: configFailed ? configError : error,
    isEmpty,
  });

  const handleNext = useCallback(() => {
    if (!data?.pagination.nextCursor) return;
    update({
      cursor: data.pagination.nextCursor,
      cursorTrail: JSON.stringify([...cursorTrail, cursor ?? null]),
    });
  }, [data?.pagination.nextCursor, update, cursorTrail, cursor]);
  const handlePrevious = useCallback(() => {
    if (!cursor) return;
    update({
      cursor: cursorTrail[cursorTrail.length - 1] ?? null,
      cursorTrail: cursorTrail.length > 1 ? JSON.stringify(cursorTrail.slice(0, -1)) : null,
    });
  }, [cursor, cursorTrail, update]);
  const handleRetry = useCallback(() => {
    if (configFailed) void refetchConfig();
    else void refetch();
  }, [configFailed, refetchConfig, refetch]);
  const handleStatusChange = useCallback((value: string) => update({ status: value === "active" ? null : value, cursorTrail: null }), [update]);
  const handleClearFilters = useCallback(() => update({ status: null, cursorTrail: null }), [update]);
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
      <PageState resolution={pageState} loading={<CompanyDocumentsSkeleton />} empty={linkOff ? notEnabled : empty} onRetry={handleRetry}>
        <DataTable
          data={rows}
          columns={COLUMNS}
          getRowKey={getRowKey}
          emptyState={empty}
          pagination={{
            mode: "cursor",
            pageSize: PAGE_LIMIT,
            hasMore: data?.pagination.hasMore ?? false,
            hasPrevious: Boolean(cursor),
            onNext: handleNext,
            onPrevious: handlePrevious,
          }}
        />
      </PageState>
    </PageWrapper>
  );
}
