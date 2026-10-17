"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { AllWorkFilters } from "@/types/projects";
import {
  useBuildListUrlState,
  parsePriorityParam,
  parseTicketTypeParam,
  BUILD_LIST_FILTER_PARAMS,
  type BuildListGrouping,
  type BuildListSortField,
  type BuildListSortDirection,
} from "@/features/build/shared/use-build-list-url-state";
import { parseView, type AllWorkView } from "./all-work-view-switcher";

export { parsePriorityParam, parseTicketTypeParam };
export type { BuildListGrouping };

interface UseAllWorkFiltersReturn {
  view: AllWorkView;
  scopeMine: boolean;
  filters: AllWorkFilters;
  productIdFilter: string | null;
  teamIdFilter: string | null;
  grouping: BuildListGrouping;
  sortField: BuildListSortField;
  sortDirection: BuildListSortDirection;
  cursor: string | null;
  hasActiveFilters: boolean;
  isPending: boolean;
  handleViewChange: (v: AllWorkView, onClearSelection?: () => void) => void;
  handleScopeToggle: () => void;
  handleClearFilters: () => void;
  setListParams: (updates: Record<string, string | null>) => void;
  setCursor: (cursor: string | null) => void;
}

export function useAllWorkFilters(): UseAllWorkFiltersReturn {
  const searchParams = useSearchParams();
  const scopeMine = searchParams.get("scope") === "mine";
  const view = parseView(searchParams.get("view"));
  const productIdParam = searchParams.get("productId");
  const teamIdParam = searchParams.get("teamId");

  const {
    filters: baseFilters,
    grouping,
    sortField,
    sortDirection,
    cursor,
    hasActiveFilters,
    isPending,
    setListParams,
    setCursor,
  } = useBuildListUrlState({
    defaultGrouping: "project",
    defaultSortField: "rank",
    defaultSortDirection: "desc",
  });

  const filters: AllWorkFilters = {
    ...baseFilters,
    ...(scopeMine ? { scope: "mine" as const } : {}),
    ...(productIdParam ? { managedProductId: Number(productIdParam) } : {}),
    ...(teamIdParam ? { teamId: Number(teamIdParam) } : {}),
  };

  const handleViewChange = useCallback(
    (v: AllWorkView, onClearSelection?: () => void) => {
      onClearSelection?.();
      setListParams({ view: v, cursor: null });
    },
    [setListParams],
  );

  const handleScopeToggle = useCallback(() => {
    setListParams({ scope: scopeMine ? null : "mine", cursor: null });
  }, [scopeMine, setListParams]);

  const handleClearFilters = useCallback(() => {
    const cleared: Record<string, string | null> = { scope: null, cursor: null, productId: null, teamId: null };
    for (const param of BUILD_LIST_FILTER_PARAMS) cleared[param] = null;
    setListParams(cleared);
  }, [setListParams]);

  return {
    view,
    scopeMine,
    filters,
    productIdFilter: productIdParam,
    teamIdFilter: teamIdParam,
    grouping,
    sortField,
    sortDirection,
    cursor,
    hasActiveFilters: hasActiveFilters || scopeMine || !!productIdParam || !!teamIdParam,
    isPending,
    handleViewChange,
    handleScopeToggle,
    handleClearFilters,
    setListParams,
    setCursor,
  };
}
