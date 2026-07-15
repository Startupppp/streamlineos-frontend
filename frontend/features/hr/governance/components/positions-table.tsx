"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { usePositions, useDeletePosition, type Position } from "../hooks/use-positions";
import { format } from "date-fns";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

const SENTINEL = "__ALL__";
type StatusFilter = Position["status"] | typeof SENTINEL;

export function PositionsTable() {
  const canManage = useCan("hr:positions:manage");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(SENTINEL);

  const { data, isLoading } = usePositions({
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
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => handleDelete(row.id)}
            disabled={deletePosition.isPending}
          >
            Delete
          </Button>
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

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Select value={statusFilter} onValueChange={(v) => handleStatusChange(v as StatusFilter)}>
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
        <p className="text-sm text-muted-foreground whitespace-nowrap">{data?.total ?? 0} positions</p>
      </div>
      <DataTable
        className="flex-1 min-h-0"
        columns={columns}
        data={data?.data ?? []}
        getRowKey={(row) => row.id}
        emptyState={
          <div className="flex flex-col items-center py-12">
            <Briefcase className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No positions found.</p>
          </div>
        }
        pagination={{ mode: "server", page, pageSize: 20, total: data?.total ?? 0, onPageChange: setPage }}
      />
    </>
  );
}
