"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

import type {
  WorkLogFilters,
  WorkLogFilterEmployee,
  WorkLogFilterDepartment,
} from "./work-log-filter-actions";

interface WorkLogFiltersPanelProps {
  filters: WorkLogFilters;
  setFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  setDraftFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  activeFilterCount: number;
  currentYear: number;
  currentQuarter: number;
  employees: WorkLogFilterEmployee[] | undefined;
  departments: WorkLogFilterDepartment[] | undefined;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
}

export function WorkLogFiltersPanel({
  filters,
  setFilters,
  setDraftFilters,
  activeFilterCount,
  currentYear,
  currentQuarter,
  employees,
  departments,
  searchTerm,
  setSearchTerm,
}: WorkLogFiltersPanelProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
    },
    [setSearchTerm],
  );

  const handleClearDepartment = useCallback(() => {
    setFilters((p) => ({ ...p, departmentId: undefined }));
    setDraftFilters((p) => ({ ...p, departmentId: undefined }));
  }, [setFilters, setDraftFilters]);

  const handleClearEmployee = useCallback(() => {
    setFilters((p) => ({ ...p, selectedUserId: undefined }));
    setDraftFilters((p) => ({ ...p, selectedUserId: undefined }));
  }, [setFilters, setDraftFilters]);

  const handleClearMonth = useCallback(() => {
    setFilters((p) => ({ ...p, month: undefined }));
    setDraftFilters((p) => ({ ...p, month: undefined }));
  }, [setFilters, setDraftFilters]);

  const handleClearDateRange = useCallback(() => {
    setFilters((p) => ({ ...p, dateFrom: undefined, dateTo: undefined }));
    setDraftFilters((p) => ({ ...p, dateFrom: undefined, dateTo: undefined }));
  }, [setFilters, setDraftFilters]);

  const handleClearAll = useCallback(() => {
    const reset: WorkLogFilters = {
      year: currentYear,
      quarter: currentQuarter,
    };
    setFilters(reset);
    setDraftFilters(reset);
  }, [currentYear, currentQuarter, setFilters, setDraftFilters]);

  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        className="w-[220px] max-w-[min(220px,70vw)]"
        placeholder="Search by date or keyword..."
        value={searchTerm}
        onValueChange={handleSearchChange}
        aria-label="Search work logs"
      />

      {activeFilterCount > 0 && (
        <div className={cn(FILTER_TOOLBAR_ROW, "w-auto gap-1.5")}>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Filters:
          </span>
          {filters.departmentId && departments && (
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/30 pr-1"
            >
              {departments.find((d) => d.id.toString() === filters.departmentId)
                ?.name ?? "Dept"}
              <button
                onClick={handleClearDepartment}
                className="ml-0.5 hover:text-foreground rounded-full"
                aria-label="Remove department filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {filters.selectedUserId && employees && (
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-800 pr-1"
            >
              {(() => {
                const e = employees.find(
                  (emp) => emp.id === filters.selectedUserId,
                );
                return e
                  ? [e.firstName, e.lastName].filter(Boolean).join(" ") ||
                      "Selected"
                  : "Selected";
              })()}
              <button
                onClick={handleClearEmployee}
                className="ml-0.5 hover:text-foreground rounded-full"
                aria-label="Remove employee filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {filters.month !== undefined && (
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 pr-1"
            >
              {format(new Date(filters.year, filters.month, 1), "MMMM")}
              <button
                onClick={handleClearMonth}
                className="ml-0.5 hover:text-amber-900 dark:hover:text-amber-100 rounded-full"
                aria-label="Remove month filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 pr-1"
            >
              {filters.dateFrom && filters.dateTo
                ? `${filters.dateFrom} – ${filters.dateTo}`
                : filters.dateFrom
                  ? `From ${filters.dateFrom}`
                  : `Until ${filters.dateTo}`}
              <button
                onClick={handleClearDateRange}
                className="ml-0.5 hover:text-foreground rounded-full"
                aria-label="Remove date range filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          <button
            onClick={handleClearAll}
            className="text-[10px] font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors duration-200"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider ml-auto">
        <span className="text-foreground/60">Status:</span>
        <span className={cn("flex items-center gap-1.5")}>
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
          Logged
        </span>
        <span className={cn("flex items-center gap-1.5")}>
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0" />
          Unsaved
        </span>
        <span className={cn("flex items-center gap-1.5")}>
          <span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/20 shrink-0" />
          Empty
        </span>
      </div>
    </div>
  );
}
