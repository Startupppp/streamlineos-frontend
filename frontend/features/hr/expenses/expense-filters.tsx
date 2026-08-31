"use client";

import React from "react";
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
import { STATUS_LABELS, type StatusFilter } from "./expense-constants";
import type { ExpenseFilters } from "@/types/hr/expenses";
import type { DatePreset } from "@/hooks/common/use-expense-filters";

function MemberStatusTab({
  status,
  index,
  totalCount,
  isActive,
  onStatusChange,
}: {
  status: StatusFilter;
  index: number;
  totalCount: number;
  isActive: boolean;
  onStatusChange: (status: StatusFilter) => void;
}) {
  function handleClick() {
    onStatusChange(status);
  }
  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    let nextIdx = index;
    if (e.key === "ArrowRight") nextIdx = (index + 1) % totalCount;
    else if (e.key === "ArrowLeft")
      nextIdx = (index - 1 + totalCount) % totalCount;
    else return;
    e.preventDefault();
    onStatusChange(
      ["ALL", "PENDING", "APPROVED", "REJECTED"][nextIdx] as StatusFilter,
    );
    (e.currentTarget.parentElement?.children[nextIdx] as HTMLElement)?.focus();
  }
  return (
    <button
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "h-7 px-3 rounded-lg text-xs font-medium transition-all duration-200",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {status === "ALL" ? "All Claims" : STATUS_LABELS[status]}
    </button>
  );
}

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

  return (
    <div className={cn(FILTER_TOOLBAR_ROW, "justify-between")}>
      <FilterPillGroup>
        {[
          { key: "ALL" as StatusFilter, label: "All Claims", count: null },
          {
            key: "PENDING" as StatusFilter,
            label: "Pending",
            count: pendingCount,
          },
          { key: "APPROVED" as StatusFilter, label: "Approved", count: null },
          { key: "REJECTED" as StatusFilter, label: "Rejected", count: null },
        ].map((item) => (
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
}

export function MemberExpenseFilters({
  statusFilter,
  datePreset,
  filters,
  onStatusChange,
  onDatePresetChange,
}: MemberExpenseFiltersProps) {
  const statuses = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;

  function handleDatePresetChange(v: string) {
    onDatePresetChange(v as DatePreset);
  }

  return (
    <div className={cn(FILTER_TOOLBAR_ROW, "justify-between")}>
      <div
        className="flex items-center gap-0.5 bg-muted p-1 rounded-xl"
        role="tablist"
        aria-label="Filter by status"
      >
        {statuses.map((s, i, arr) => (
          <MemberStatusTab
            key={s}
            status={s}
            index={i}
            totalCount={arr.length}
            isActive={statusFilter === s}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
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
      </div>
    </div>
  );
}
