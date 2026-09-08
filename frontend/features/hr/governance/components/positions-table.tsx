"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { usePositions, useDeletePosition, type Position } from "../hooks/use-positions";
import { format } from "date-fns";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

const SENTINEL = "__ALL__";
const STATUS_FILTERS = [
  SENTINEL,
  "open",
  "filled",
  "frozen",
  "future",
] as const satisfies readonly (Position["status"] | typeof SENTINEL)[];
type StatusFilter = (typeof STATUS_FILTERS)[number];

export function PositionsTable() {
  const canManage = useCan("hr:positions:manage");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(SENTINEL);

  const { data, isLoading, isError, error, refetch } = usePositions({
    status: statusFilter === SENTINEL ? undefined : statusFilter,
    page,
    limit: 20,
  });
  const deletePosition = useDeletePosition();

  function handleDelete(id: number) {
    deletePosition.mutate(id);
  }

  function handleStatusChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleStatusFilterSelect(v: string) {
    const next = STATUS_FILTERS.find((candidate) => candidate === v);
    if (next) handleStatusChange(next);
  }

  function handleClearFilters() {
    setStatusFilter(SENTINEL);
    setPage(1);
  }

  function handleRetry() {
    void refetch();
  }

  const filtersActive = statusFilter !== SENTINEL;

  const STATUS_COLORS: Record<Position["status"], string> = {
    open: "default",
    filled: "secondary",
    frozen: "outline",
    future: "secondary",
  } as const;

  const columns: DataTableColumn<Position>[] = [
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <span className={cn("font-medium text-sm", TEXT_ONE_LINE)} title={row.title}>
          {row.title}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={STATUS_COLORS[row.status] as "default" | "secondary" | "outline" | "destructive"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "departmentId",
      header: "Department",
      cell: (row) => <span className="text-sm text-muted-foreground">{row.departmentId ?? "—"}</span>,
    },
    {
      key: "incumbentUserId",
      header: "Incumbent",
      cell: (row) => <span className="text-sm">{row.incumbentUserId ?? "—"}</span>,
    },
    {
      key: "effectiveFrom",
      header: "Effective",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.effectiveFrom), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "budgetedCostCents",
      header: "Budget",
      cell: (row) =>
        row.budgetedCostCents
          ? <span className="text-sm">${(row.budgetedCostCents / 100).toLocaleString()}</span>
          : <span className="text-sm text-muted-foreground">—</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        canManage ? (
          <LoadingButton
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => handleDelete(row.id)}
            isPending={deletePosition.isPending}
          >
            Delete
          </LoadingButton>
        ) : null,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load positions"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Select
          value={statusFilter}
          onValueChange={handleStatusFilterSelect}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SENTINEL}>All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="filled">Filled</SelectItem>
            <SelectItem value="frozen">Frozen</SelectItem>
            <SelectItem value="future">Future</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground whitespace-nowrap">{data?.data?.length ?? 0} positions</p>
      </div>
      <DataTable
        className="flex-1 min-h-0"
        columns={columns}
        data={data?.data ?? []}
        getRowKey={(row) => row.id}
        emptyState={
          <EmptyState
            illustrationPreset="person"
            illustrationSize="md"
            title="No positions yet"
            description={filtersActive ? undefined : "Create positions to track roles, incumbents, and org structure."}
            filtersActive={filtersActive}
            onClearFilters={handleClearFilters}
            compact
          />
        }
        pagination={{ mode: "server", page, pageSize: 20, total: data?.data?.length ?? 0, onPageChange: setPage }}
      />
    </>
  );
}
