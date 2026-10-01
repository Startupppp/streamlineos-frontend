"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  applyEmployeeUrlUpdates,
  employeeFiltersToUrlUpdates,
  parseEmployeeListFilters,
  type EmployeeListFilters,
  type EmployeeStatusFilter,
} from "@/features/hr/employees/employee-list-filters";

export interface EmployeeListUrlState {
  filters: EmployeeListFilters;
  search: string;
  updateSearch: (value: string) => void;
  updateParams: (updates: Record<string, string | null>) => void;
  statusHref: (status: Exclude<EmployeeStatusFilter, "all">) => string;
  clearFilters: () => void;
}

export function useEmployeeListUrlState(pageSize: number): EmployeeListUrlState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const defaults = useMemo(
    () => ({ size: pageSize, status: "all" as EmployeeStatusFilter }),
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

  const statusHref = useCallback(
    (status: Exclude<EmployeeStatusFilter, "all">) => {
      const params = applyEmployeeUrlUpdates(
        searchParams,
        employeeFiltersToUrlUpdates({ status }, defaults),
      );
      return `${pathname}?${params.toString()}`;
    },
    [searchParams, pathname, defaults],
  );

  const clearFilters = useCallback(() => {
    updateSearch("");
    updateParams({ q: null, dept: null, status: null, role: null, page: null });
  }, [updateParams, updateSearch]);

  return { filters, search, updateSearch, updateParams, statusHref, clearFilters };
}
