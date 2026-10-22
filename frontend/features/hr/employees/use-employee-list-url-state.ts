"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  applyEmployeeUrlUpdates,
  parseEmployeeListFilters,
  type EmployeeListFilters,
  type EmployeeStatusFilter,
} from "@/features/hr/employees/employee-list-filters";

export interface EmployeeListUrlState {
  filters: EmployeeListFilters;
  search: string;
  updateSearch: (value: string) => void;
  updateParams: (updates: Record<string, string | null>) => void;
  clearFilters: () => void;
}

export function useEmployeeListUrlState(pageSize: number): EmployeeListUrlState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const defaults = useMemo<{ size: number; status: EmployeeStatusFilter }>(
    () => ({ size: pageSize, status: "all" }),
    [pageSize],
  );

  const filters = useMemo(
    () => parseEmployeeListFilters(searchParams, defaults),
    [searchParams, defaults],
  );

  const [searchDraft, setSearchDraft] = useState({
    sourceQuery: filters.q,
    value: filters.q,
  });
  const search = searchDraft.sourceQuery === filters.q ? searchDraft.value : filters.q;

  const updateSearch = useCallback(
    (value: string) => setSearchDraft({ sourceQuery: filters.q, value }),
    [filters.q],
  );

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = applyEmployeeUrlUpdates(searchParams, updates);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const clearFilters = useCallback(() => {
    updateSearch("");
    updateParams({ q: null, dept: null, status: null, role: null, page: null });
  }, [updateParams, updateSearch]);

  return { filters, search, updateSearch, updateParams, clearFilters };
}
