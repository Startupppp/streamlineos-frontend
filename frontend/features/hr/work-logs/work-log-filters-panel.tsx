"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
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
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, [setSearchTerm]);

  const handleClearSearch = useCallback(() => setSearchTerm(""), [setSearchTerm]);

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
    const reset: WorkLogFilters = { year: currentYear, quarter: currentQuarter };
    setFilters(reset);
    setDraftFilters(reset);
  }, [currentYear, currentQuarter, setFilters, setDraftFilters]);

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <div className="relative w-full sm:w-auto sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Search by date or keyword..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-8 pr-8 h-8 text-xs border-border bg-muted/50 focus-visible:bg-background"
          aria-label="Search work logs"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filters:</span>
          {filters.departmentId && departments && (
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 pr-1"
            >
              {departments.find((d) => d.id.toString() === filters.departmentId)?.name ?? "Dept"}
              <button
                onClick={handleClearDepartment}
                className="ml-0.5 hover:text-blue-900 dark:hover:text-blue-100 rounded-full"
                aria-label="Remove department filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {filters.selectedUserId && employees && (
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-violet-200 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800 pr-1"
            >
              {(() => {
                const e = employees.find((emp) => emp.id === filters.selectedUserId);
                return e ? ([e.firstName, e.lastName].filter(Boolean).join(" ") || "Selected") : "Selected";
              })()}
              <button
                onClick={handleClearEmployee}
                className="ml-0.5 hover:text-violet-900 dark:hover:text-violet-100 rounded-full"
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
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 pr-1"
            >
              {filters.dateFrom && filters.dateTo
                ? `${filters.dateFrom} – ${filters.dateTo}`
                : filters.dateFrom
                  ? `From ${filters.dateFrom}`
                  : `Until ${filters.dateTo}`}
              <button
                onClick={handleClearDateRange}
                className="ml-0.5 hover:text-slate-900 dark:hover:text-slate-100 rounded-full"
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
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-700 shrink-0" />
          Empty
        </span>
      </div>
    </div>
  );
}
