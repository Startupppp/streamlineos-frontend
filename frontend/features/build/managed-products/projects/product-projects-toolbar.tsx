"use client";

import { useMemo } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildMultiFilterSelect } from "@/features/build/shared/build-multi-filter-select";
import {
  ALL_SENTINEL,
  CONTRIB_OPTIONS,
  HEALTH_OPTIONS,
  STATUS_OPTIONS,
} from "./product-projects-table";
import type { useProductProjectsPage } from "./use-product-projects-page";

const DATE_PICKER_CLASS = "w-full min-w-0 max-w-none bg-card text-foreground";

export type ProductProjectsToolbarModel = Pick<
  ReturnType<typeof useProductProjectsPage>,
  | "searchValue"
  | "statusValue"
  | "healthValue"
  | "teamValue"
  | "ownerValue"
  | "clientValue"
  | "contribValue"
  | "dateFromValue"
  | "dateToValue"
  | "teamOptions"
  | "clientOptions"
  | "isFiltered"
  | "searchInputRef"
  | "handleSearchChange"
  | "handleStatusChange"
  | "handleHealthChange"
  | "handleTeamChange"
  | "handleOwnerChange"
  | "handleClientChange"
  | "handleContribChange"
  | "handleDateFromChange"
  | "handleDateToChange"
  | "handleClearFilters"
>;

interface ProductProjectsToolbarProps {
  page: ProductProjectsToolbarModel;
}

export function ProductProjectsToolbar({ page }: ProductProjectsToolbarProps) {
  const { handleTeamChange, handleClientChange, handleContribChange } = page;
  const { data: membersData } = useBuildMembers({ limit: 100 });
  const ownerOptions = useMemo(
    () =>
      (membersData?.data ?? []).map((m) => ({
        value: String(m.membershipId),
        label:
          m.name ??
          ([m.firstName, m.lastName].filter(Boolean).join(" ") || m.email),
      })),
    [membersData],
  );

  const handleTeamSelect = useMemo(
    () => (v: string) => handleTeamChange(v === ALL_SENTINEL ? "" : v),
    [handleTeamChange],
  );
  const handleClientSelect = useMemo(
    () => (v: string) => handleClientChange(v === ALL_SENTINEL ? "" : v),
    [handleClientChange],
  );
  const handleContribSelect = useMemo(
    () => (v: string) => handleContribChange(v === ALL_SENTINEL ? "" : v),
    [handleContribChange],
  );

  const search = useMemo(
    () => ({
      value: page.searchValue,
      onValueChange: page.handleSearchChange,
      placeholder: "Search projects…",
      label: "Search projects",
      inputRef: page.searchInputRef,
    }),
    [page.searchValue, page.handleSearchChange, page.searchInputRef],
  );

  const filters = useMemo(
    () => [
      {
        id: "status",
        label: "Status",
        active: page.statusValue.length > 0,
        control: (
          <BuildMultiFilterSelect
            label="Status"
            values={page.statusValue}
            onValuesChange={page.handleStatusChange}
            options={STATUS_OPTIONS}
          />
        ),
      },
      {
        id: "health",
        label: "Health",
        active: page.healthValue.length > 0,
        control: (
          <BuildMultiFilterSelect
            label="Health"
            values={page.healthValue}
            onValuesChange={page.handleHealthChange}
            options={HEALTH_OPTIONS}
          />
        ),
      },
      {
        id: "team",
        label: "Team",
        active: Boolean(page.teamValue),
        control: (
          <BuildFilterSelect
            label="Team"
            value={page.teamValue || ALL_SENTINEL}
            onValueChange={handleTeamSelect}
            options={[
              { value: ALL_SENTINEL, label: "All teams" },
              ...page.teamOptions,
            ]}
          />
        ),
      },
      {
        id: "owner",
        label: "Owner",
        active: page.ownerValue.length > 0,
        control: (
          <BuildMultiFilterSelect
            label="Owner"
            values={page.ownerValue}
            onValuesChange={page.handleOwnerChange}
            options={ownerOptions}
          />
        ),
      },
      {
        id: "customer",
        label: "Customer",
        active: Boolean(page.clientValue),
        control: (
          <BuildFilterSelect
            label="Customer"
            value={page.clientValue || ALL_SENTINEL}
            onValueChange={handleClientSelect}
            options={[
              { value: ALL_SENTINEL, label: "All customers" },
              ...page.clientOptions,
            ]}
          />
        ),
      },
      {
        id: "contribution",
        label: "Contribution",
        active: Boolean(page.contribValue),
        control: (
          <BuildFilterSelect
            label="Contribution"
            value={page.contribValue || ALL_SENTINEL}
            onValueChange={handleContribSelect}
            options={[
              { value: ALL_SENTINEL, label: "Any contribution" },
              ...CONTRIB_OPTIONS,
            ]}
          />
        ),
      },
      {
        id: "dateFrom",
        label: "Starts from",
        active: Boolean(page.dateFromValue),
        control: (
          <DatePicker
            ariaLabel="Starts from"
            clearable
            value={page.dateFromValue}
            onChange={page.handleDateFromChange}
            placeholder="Starts from"
            className={DATE_PICKER_CLASS}
          />
        ),
      },
      {
        id: "dateTo",
        label: "Ends by",
        active: Boolean(page.dateToValue),
        control: (
          <DatePicker
            ariaLabel="Ends by"
            clearable
            value={page.dateToValue}
            onChange={page.handleDateToChange}
            placeholder="Ends by"
            className={DATE_PICKER_CLASS}
          />
        ),
      },
    ],
    [
      page.statusValue,
      page.healthValue,
      page.teamValue,
      page.ownerValue,
      page.clientValue,
      page.contribValue,
      page.dateFromValue,
      page.dateToValue,
      page.teamOptions,
      page.clientOptions,
      page.handleDateFromChange,
      page.handleDateToChange,
      page.handleStatusChange,
      page.handleHealthChange,
      page.handleOwnerChange,
      ownerOptions,
      handleTeamSelect,
      handleClientSelect,
      handleContribSelect,
    ],
  );

  return (
    <BuildListToolbar
      search={search}
      filters={filters}
      row={{ mobile: 2, tablet: 2, desktop: 0 }}
      onClearAll={page.isFiltered ? page.handleClearFilters : undefined}
    />
  );
}
