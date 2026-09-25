"use client";

import { Filter } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DownloadIcon } from "@animateicons/react/lucide";
import { FilterPill, FilterPillGroup } from "@/components/ui/filter-pill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { ExpenseExportDialog } from "@/components/expenses/expense-export-dialog";
import { STATUS_LABELS, type StatusFilter } from "@/lib/expense-constants";
import type { ExpenseFilters } from "@/types/hr/expenses";
import type { DatePreset } from "@/hooks/common/use-expense-filters";

const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const satisfies readonly StatusFilter[];

const DATE_PRESETS = [
  "today",
  "this_week",
  "this_month",
  "last_month",
  "last_3_months",
  "last_6_months",
  "this_year",
  "custom",
  "all",
] as const satisfies readonly DatePreset[];

interface EmployeeOption {
  id: string;
  name: string;
}

interface AdminExpenseFiltersProps {
  statusFilter: StatusFilter;
  pendingCount: number;
  onStatusChange: (status: StatusFilter) => void;
  employees?: EmployeeOption[];
  selectedUserId?: string;
  onUserChange?: (userId: string) => void;
}

export function AdminExpenseFilters({
  statusFilter,
  pendingCount,
  onStatusChange,
  employees = [],
  selectedUserId,
  onUserChange,
}: AdminExpenseFiltersProps) {
  function handleUserChange(v: string) {
    if (onUserChange) onUserChange(v === "all" ? "" : v);
  }

  const statusPills: { key: StatusFilter; label: string; count: number | null }[] = [
    { key: "ALL", label: "All Claims", count: null },
    { key: "PENDING", label: "Pending", count: pendingCount },
    { key: "APPROVED", label: "Approved", count: null },
    { key: "REJECTED", label: "Rejected", count: null },
  ];

  return (
    <div className={cn(FILTER_TOOLBAR_ROW, "justify-between")}>
      <FilterPillGroup>
        {statusPills.map((item) => (
          <FilterPill
            key={item.key}
            active={statusFilter === item.key}
            count={item.count}
            onClick={() => onStatusChange(item.key)}
          >
            {item.label}
          </FilterPill>
        ))}
      </FilterPillGroup>
      {employees.length > 0 && onUserChange && (
        <Select
          value={selectedUserId || "all"}
          onValueChange={handleUserChange}
        >
          <SelectTrigger
            className={cn("w-[180px]", FILTER_SELECT_TRIGGER)}
            aria-label="Filter by employee"
          >
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

interface MemberExpenseFiltersProps {
  statusFilter: StatusFilter;
  datePreset: string;
  filters: ExpenseFilters;
  onStatusChange: (status: StatusFilter) => void;
  onDatePresetChange: (preset: DatePreset) => void;
  /** `POST /hr/expenses/export/jobs` needs `hr:expenses:read`. */
  canExport: boolean;
}

export function MemberExpenseFilters({
  statusFilter,
  datePreset,
  filters,
  onStatusChange,
  onDatePresetChange,
  canExport,
}: MemberExpenseFiltersProps) {
  function handleDatePresetChange(v: string) {
    const next = DATE_PRESETS.find((candidate) => candidate === v);
    if (next) onDatePresetChange(next);
  }

  return (
    <div className={cn(FILTER_TOOLBAR_ROW, "justify-between")}>
      <FilterPillGroup aria-label="Filter by status">
        {STATUS_FILTERS.map((status) => (
          <FilterPill
            key={status}
            active={statusFilter === status}
            onClick={() => onStatusChange(status)}
          >
            {status === "ALL" ? "All Claims" : STATUS_LABELS[status]}
          </FilterPill>
        ))}
      </FilterPillGroup>
      <div className="flex items-center gap-2">
        <Select value={datePreset} onValueChange={handleDatePresetChange}>
          <SelectTrigger
            className={cn("w-[150px] gap-1.5", FILTER_SELECT_TRIGGER)}
            aria-label="Filter expenses by date range"
          >
            <Filter className="h-3 w-3 shrink-0" />
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>
        {canExport && (
        <ExpenseExportDialog
          filters={filters}
          trigger={
            <AnimatedIconButton
              icon={DownloadIcon}
              iconSize={14}
              variant="outline"
              size="icon"
              className="w-8"
              aria-label="Download report"
            />
          }
        />
        )}
      </div>
    </div>
  );
}
