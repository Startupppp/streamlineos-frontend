"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { DataTableSortState } from "@/components/ui/data-table.types";
import type { TicketOrderBy } from "@/hooks/api/build/ticket-queries-read-options";
import { useBuildListUrlState } from "@/features/build/shared/use-build-list-url-state";

const BACKLOG_SORT_FIELDS = ["id", "title", "created", "priority"] as const;

const BACKLOG_ORDER_BY: Readonly<Record<(typeof BACKLOG_SORT_FIELDS)[number], TicketOrderBy>> = {
  id: "number",
  title: "title",
  created: "created",
  priority: "priority",
};

export function useBacklogListUrlState() {
  const searchParams = useSearchParams();
  const { setListParams, sortDirection } = useBuildListUrlState({
    defaultSortDirection: "asc",
  });
  const requestedSort = searchParams.get("sort");
  const sortField = BACKLOG_SORT_FIELDS.find((field) => field === requestedSort) ?? null;
  const orderBy: TicketOrderBy = sortField ? BACKLOG_ORDER_BY[sortField] : "rank";
  const handleSortChange = useCallback(
    (field: string, direction: "asc" | "desc") => setListParams({ sort: field, dir: direction }),
    [setListParams],
  );
  const sortState = useMemo<DataTableSortState>(
    () => ({
      fields: BACKLOG_SORT_FIELDS,
      field: sortField,
      direction: sortDirection,
      onChange: handleSortChange,
    }),
    [sortField, sortDirection, handleSortChange],
  );
  return { setListParams, orderBy, sortDirection, sortState };
}
