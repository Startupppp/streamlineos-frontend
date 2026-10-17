"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { ReportingRequestStatusBadge, REPORTING_REQUEST_STATUS_MAP } from "@/components/hr/reporting-lines/reporting-status-badge";
import { useReportingManagerRequests } from "@/hooks/api/hr/reporting-manager-requests";
import {
  reportingManagerRequestStatusContract,
  type HrReportingManagerRequest,
} from "@/hooks/api/hr/reporting-manager-requests-schema";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import { formatShortDate } from "@/lib/date-utils";
import { ReportingRequestReviewSheet } from "./reporting-request-review-sheet";

export const REPORTING_REQUESTS_TITLE = "Reporting requests";
export const REPORTING_REQUESTS_SUBTITLE = "Employees asking HR to correct who they report to";
export const REPORTING_REQUESTS_HEADERS = ["Employee", "Current manager", "Suggested manager", "Status", "Submitted"];

const PAGE_SIZE = 25;
const ALL = "ALL";
const STATUS_OPTIONS = reportingManagerRequestStatusContract.options;

const COLUMNS: DataTableColumn<HrReportingManagerRequest>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{row.employee.name}</span>
        {row.employee.designation ? (
          <span className="truncate text-dense text-muted-foreground">{row.employee.designation}</span>
        ) : null}
      </span>
    ),
  },
  { key: "current", header: "Current manager", cell: (row) => <span className="truncate">{row.currentManager?.name ?? "—"}</span> },
  {
    key: "suggested",
    header: "Suggested manager",
    cell: (row) => <span className="truncate">{row.suggestedManager?.name ?? "None suggested"}</span>,
  },
  { key: "status", header: "Status", cell: (row) => <ReportingRequestStatusBadge status={row.status} /> },
  { key: "created", header: "Submitted", cell: (row) => <span className="font-mono text-dense">{formatShortDate(row.createdAt)}</span> },
];

function LoadingBody() {
  return <DataTableSkeleton rows={8} headers={REPORTING_REQUESTS_HEADERS} />;
}

export function ReportingRequestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsedStatus = reportingManagerRequestStatusContract.safeParse(searchParams.get("status"));
  const status = parsedStatus.success ? parsedStatus.data : undefined;
  const openRequestId = searchParams.get("request");
  const pager = useCursorPagination();

  const { data, isLoading, isError, error, refetch } = useReportingManagerRequests({
    status,
    cursor: pager.cursor,
    limit: PAGE_SIZE,
  });
  const pageState = usePageState({ permission: "hr:reporting-lines:review", module: "hr", isLoading, isError, error });

  function replaceParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleStatusChange(value: string) {
    pager.reset();
    replaceParam("status", value === ALL ? null : value);
  }

  function handleRowClick(row: HrReportingManagerRequest) {
    replaceParam("request", row.requestId);
  }

  function handleSheetOpenChange(open: boolean) {
    if (!open) replaceParam("request", null);
  }

  function handleNext() {
    pager.goNext(data?.nextCursor);
  }

  function handleRetry() {
    void refetch();
  }

  function getRowKey(row: HrReportingManagerRequest) {
    return row.requestId;
  }

  const filters = (
    <Select value={status ?? ALL} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-full sm:w-56" aria-label="Filter by status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
        <SelectItem value={ALL}>All statuses</SelectItem>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {REPORTING_REQUEST_STATUS_MAP[option]?.label ?? option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <PageWrapper
      title={REPORTING_REQUESTS_TITLE}
      subtitle={REPORTING_REQUESTS_SUBTITLE}
      filters={pageState.kind === "ready" ? filters : undefined}
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <PageState resolution={pageState} loading={<LoadingBody />} onRetry={handleRetry} className="flex-1">
        <DataTable
          className="min-h-0 flex-1"
          data={data?.items ?? []}
          columns={COLUMNS}
          getRowKey={getRowKey}
          onRowClick={handleRowClick}
          emptyState={
            <EmptyState
              className="border-0 bg-transparent"
              title={status ? "No requests with this status" : "No reporting-manager requests"}
              description="When an employee reports an incorrect manager, their request appears here."
            />
          }
          pagination={{
            mode: "cursor",
            pageSize: PAGE_SIZE,
            pageNumber: pager.pageNumber,
            hasMore: Boolean(data?.nextCursor),
            hasPrevious: pager.hasPrevious,
            onNext: handleNext,
            onPrevious: pager.goPrevious,
          }}
        />
      </PageState>
      <ReportingRequestReviewSheet requestId={openRequestId} onOpenChange={handleSheetOpenChange} />
    </PageWrapper>
  );
}
