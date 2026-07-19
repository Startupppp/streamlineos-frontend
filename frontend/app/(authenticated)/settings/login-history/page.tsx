"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useLoginHistory } from "@/hooks/api/auth";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

type LoginEntry = NonNullable<ReturnType<typeof useLoginHistory>["data"]>["data"][number];
type SuccessFilter = "all" | "success" | "failure";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const COLUMNS: DataTableColumn<LoginEntry>[] = [
  {
    key: "createdAt",
    header: "Time",
    cell: (e) => (
      <span className="text-muted-foreground whitespace-nowrap text-xs">
        {format(new Date(e.createdAt), "MMM d, yyyy HH:mm")}
      </span>
    ),
  },
  {
    key: "event",
    header: "Event",
    cell: (e) => <span className="font-medium">{e.event}</span>,
  },
  {
    key: "result",
    header: "Result",
    cell: (e) =>
      e.success ? (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200/60">
          Success
        </Badge>
      ) : (
        <Badge variant="destructive">Failed</Badge>
      ),
  },
  {
    key: "ipAddress",
    header: "IP Address",
    cell: (e) => (
      <span className="text-muted-foreground font-mono text-xs">
        {e.ipAddress ?? "—"}
      </span>
    ),
  },
  {
    key: "browser",
    header: "Browser",
    cell: (e) => <span className="font-medium">{e.browser}</span>,
  },
  {
    key: "os",
    header: "OS",
    cell: (e) => (
      <span className="text-muted-foreground">{e.os ?? "—"}</span>
    ),
  },
];

function FilterButton({
  value,
  current,
  onSelect,
}: {
  value: SuccessFilter;
  current: SuccessFilter;
  onSelect: (value: SuccessFilter) => void;
}) {
  function handleClick() {
    onSelect(value);
  }

  return (
    <Button
      variant={current === value ? "secondary" : "ghost"}
      size="sm"
      className="capitalize h-7 px-2.5 text-xs"
      onClick={handleClick}
    >
      {value}
    </Button>
  );
}

export default function LoginHistoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [filter, setFilter] = useState<SuccessFilter>("all");

  const successParam =
    filter === "success" ? true : filter === "failure" ? false : undefined;

  const { data, isLoading, isError, refetch } = useLoginHistory({
    page,
    limit: pageSize,
    success: successParam,
  });

  function handleSelectFilter(f: SuccessFilter) {
    setFilter(f);
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize as PageSize);
    setPage(1);
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Login History"
      subtitle="A record of all sign-in events for your account."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          {(["all", "success", "failure"] as SuccessFilter[]).map((f) => (
            <FilterButton
              key={f}
              value={f}
              current={filter}
              onSelect={handleSelectFilter}
            />
          ))}
        </div>
      }
    >
      {isError ? (
        <ErrorState
          title="Couldn't load login history"
          description="Something went wrong while fetching your login history."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : (
        <DataTable
          data={data?.data ?? []}
          columns={COLUMNS}
          getRowKey={(e) => e.id}
          isLoading={isLoading}
          className="flex-1 min-h-0"
          pagination={{
            mode: "server",
            page,
            pageSize,
            total: data?.total ?? 0,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
          }}
          emptyState={
            <EmptyState
              illustrationPreset="activity"
              title="No login history found"
              description="No sign-in events have been recorded for your account."
              compact
            />
          }
          minWidth="600px"
        />
      )}
    </PageWrapper>
  );
}
