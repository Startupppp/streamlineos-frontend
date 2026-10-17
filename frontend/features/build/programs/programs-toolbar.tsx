"use client";

import { useCallback } from "react";
import type { RefObject } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import type { BuildFilterOption } from "@/features/build/shared/build-filter-select";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import {
  BUILD_FILTER_ALL,
  type BuildListFiltersState,
} from "@/features/build/shared/use-build-list-filters";
import type { PortfolioHealth, PortfolioStatus } from "@/types/projects";

export const PROGRAM_STATUS_VALUES = [
  "active",
  "on_hold",
  "completed",
  "archived",
] as const satisfies readonly PortfolioStatus[];

export const PROGRAM_HEALTH_VALUES = [
  "on_track",
  "at_risk",
  "off_track",
] as const satisfies readonly PortfolioHealth[];

export const PROGRAM_SORT_VALUES = ["createdAt", "updatedAt", "name"] as const;
export const PROGRAM_ORDER_VALUES = ["asc", "desc"] as const;

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
] as const;

const HEALTH_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All health" },
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "off_track", label: "Off track" },
] as const;

const SORT_OPTIONS = [
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Updated" },
  { value: "name", label: "Name" },
] as const;

export const PROGRAM_FILTER_DEFINITIONS = [
  {
    param: "status",
    options: STATUS_OPTIONS.map((option) => option.value),
  },
  {
    param: "health",
    options: HEALTH_OPTIONS.map((option) => option.value),
  },
  { param: "ownerId" },
  { param: "portfolioId" },
  { param: "projectId" },
  {
    param: "sort",
    all: "createdAt",
    options: PROGRAM_SORT_VALUES,
  },
  {
    param: "order",
    all: "desc",
    options: PROGRAM_ORDER_VALUES,
  },
] as const;

interface ProgramsToolbarProps {
  filters: BuildListFiltersState;
  ownerOptions: readonly BuildFilterOption[];
  portfolioOptions: readonly BuildFilterOption[];
  projectOptions: readonly BuildFilterOption[];
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

export function ProgramsToolbar({
  filters,
  ownerOptions,
  portfolioOptions,
  projectOptions,
  searchInputRef,
}: ProgramsToolbarProps) {
  const status = filters.value("status");
  const health = filters.value("health");
  const ownerId = filters.value("ownerId");
  const portfolioId = filters.value("portfolioId");
  const projectId = filters.value("projectId");
  const sort = filters.value("sort");
  const orderValue = filters.value("order");
  const order = PROGRAM_ORDER_VALUES.find((value) => value === orderValue) ?? "desc";

  const handleStatusChange = useCallback(
    (value: string) => filters.setValue("status", value),
    [filters],
  );
  const handleHealthChange = useCallback(
    (value: string) => filters.setValue("health", value),
    [filters],
  );
  const handleOwnerChange = useCallback(
    (value: string) => filters.setValue("ownerId", value),
    [filters],
  );
  const handlePortfolioChange = useCallback(
    (value: string) => filters.setValue("portfolioId", value),
    [filters],
  );
  const handleProjectChange = useCallback(
    (value: string) => filters.setValue("projectId", value),
    [filters],
  );
  const handleSortChange = useCallback(
    (value: string) => filters.setValue("sort", value),
    [filters],
  );
  const handleOrderToggle = useCallback(() => {
    filters.setValue("order", order === "asc" ? "desc" : "asc");
  }, [filters, order]);

  return (
    <BuildListToolbar
      search={{
        value: filters.search,
        onValueChange: filters.setSearch,
        placeholder: "Search programs…",
        label: "Search programs",
        inputRef: searchInputRef,
      }}
      filters={[
        {
          id: "status",
          label: "Status",
          active: filters.isActive("status"),
          control: (
            <BuildFilterSelect
              label="Status"
              value={status}
              onValueChange={handleStatusChange}
              options={STATUS_OPTIONS}
            />
          ),
        },
        {
          id: "health",
          label: "Health",
          active: filters.isActive("health"),
          control: (
            <BuildFilterSelect
              label="Health"
              value={health}
              onValueChange={handleHealthChange}
              options={HEALTH_OPTIONS}
            />
          ),
        },
        {
          id: "owner",
          label: "Owner",
          active: filters.isActive("ownerId"),
          control: (
            <BuildFilterSelect
              label="Owner"
              value={ownerId}
              onValueChange={handleOwnerChange}
              options={ownerOptions}
            />
          ),
        },
        {
          id: "portfolio",
          label: "Portfolio",
          active: filters.isActive("portfolioId"),
          control: (
            <BuildFilterSelect
              label="Portfolio"
              value={portfolioId}
              onValueChange={handlePortfolioChange}
              options={portfolioOptions}
            />
          ),
        },
        {
          id: "project",
          label: "Project",
          active: filters.isActive("projectId"),
          control: (
            <BuildFilterSelect
              label="Project"
              value={projectId}
              onValueChange={handleProjectChange}
              options={projectOptions}
            />
          ),
        },
        {
          id: "sort",
          label: "Sort",
          active: filters.isActive("sort") || filters.isActive("order"),
          control: (
            <div className="flex min-w-0 items-center gap-1">
              <BuildFilterSelect
                label="Sort programs"
                value={sort}
                onValueChange={handleSortChange}
                options={SORT_OPTIONS}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                aria-label={order === "asc" ? "Sort ascending" : "Sort descending"}
                onClick={handleOrderToggle}
              >
                {order === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          ),
        },
      ]}
      onClearAll={filters.clearAll}
    />
  );
}
