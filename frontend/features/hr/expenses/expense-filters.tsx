"use client";

import { Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ExpenseExportDialog } from "@/components/expenses/expense-export-dialog";
import { STATUS_LABELS, type StatusFilter } from "./expense-constants";
import type { ExpenseFilters, ExpenseCategory } from "@/server/actions/expense-query";
import type { DatePreset } from "@/hooks/use-expense-filters";

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
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { key: "ALL" as StatusFilter, label: "All Claims", count: null },
          { key: "PENDING" as StatusFilter, label: "Pending", count: pendingCount },
          { key: "APPROVED" as StatusFilter, label: "Approved", count: null },
          { key: "REJECTED" as StatusFilter, label: "Rejected", count: null },
        ]).map((item) => (
          <button
            key={item.key}
            onClick={() => onStatusChange(item.key)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-medium transition-all duration-200 border inline-flex items-center gap-1.5",
              statusFilter === item.key
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:border-foreground/20 hover:bg-muted/50",
            )}
          >
            {item.label}
            {item.count !== null && (
              <span
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  statusFilter === item.key
                    ? "bg-white/20 dark:bg-black/20"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {employees.length > 0 && onUserChange && (
        <Select
          value={selectedUserId || "all"}
          onValueChange={(v) => onUserChange(v === "all" ? "" : v)}
        >
          <SelectTrigger className="h-8 w-[180px] text-xs" aria-label="Filter by employee">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
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
  categories: ExpenseCategory[];
  onStatusChange: (status: StatusFilter) => void;
  onDatePresetChange: (preset: DatePreset) => void;
}

export function MemberExpenseFilters({
  statusFilter,
  datePreset,
  filters,
  categories,
  onStatusChange,
  onDatePresetChange,
}: MemberExpenseFiltersProps) {
  const statuses = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;

  return (
    <div className="flex flex-wrap gap-3 items-center justify-between">
      <div
        className="flex items-center gap-0.5 bg-muted p-1 rounded-xl"
        role="tablist"
        aria-label="Filter by status"
      >
        {statuses.map((s, i, arr) => (
          <button
            key={s}
            role="tab"
            aria-selected={statusFilter === s}
            tabIndex={statusFilter === s ? 0 : -1}
            onClick={() => onStatusChange(s)}
            onKeyDown={(e) => {
              let nextIdx = i;
              if (e.key === "ArrowRight") nextIdx = (i + 1) % arr.length;
              else if (e.key === "ArrowLeft") nextIdx = (i - 1 + arr.length) % arr.length;
              else return;
              e.preventDefault();
              onStatusChange(arr[nextIdx]);
              (e.currentTarget.parentElement?.children[nextIdx] as HTMLElement)?.focus();
            }}
            className={cn(
              "h-7 px-3 rounded-lg text-xs font-medium transition-all duration-200",
              statusFilter === s
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "ALL" ? "All Claims" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Select value={datePreset} onValueChange={(v) => onDatePresetChange(v as DatePreset)}>
          <SelectTrigger className="h-8 w-[150px] text-xs gap-1.5" aria-label="Filter expenses by date range">
            <Filter className="h-3 w-3 shrink-0" />
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>
        <ExpenseExportDialog
          filters={filters}
          categories={categories}
          trigger={
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Download report">
              <Download className="h-3.5 w-3.5" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
