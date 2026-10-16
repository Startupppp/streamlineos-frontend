"use client";

import { useCallback, useMemo } from "react";
import type { DataTableSortState } from "@/components/ui/data-table.types";
import { useBuildListUrlState } from "@/features/build/shared/use-build-list-url-state";

const BACKLOG_SORT_FIELDS = ["created", "priority"] as const;

export function useBacklogListUrlState() {
  const { setListParams, sortField, sortDirection } = useBuildListUrlState({
    defaultSortDirection: "asc",
  });
  const handleSortChange = useCallback(
    (field: string, direction: "asc" | "desc") => setListParams({ sort: field, dir: direction }),
    [setListParams],
  );
  const sortState = useMemo<DataTableSortState>(
    () => ({
      fields: BACKLOG_SORT_FIELDS,
      field: BACKLOG_SORT_FIELDS.some((field) => field === sortField) ? sortField : null,
      direction: sortDirection,
      onChange: handleSortChange,
    }),
    [sortField, sortDirection, handleSortChange],
  );
  return { setListParams, sortField, sortDirection, sortState };
}
