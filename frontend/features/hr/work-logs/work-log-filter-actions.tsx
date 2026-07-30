"use client";

import { useCallback, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { cn } from "@/lib/utils";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { Users, Check, ChevronDown } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DownloadIcon } from "@animateicons/react/lucide";
import { WorkLogAdvancedFiltersSheet } from "./work-log-advanced-filters-sheet";

export interface WorkLogFilters {
  year: number;
  quarter: number;
  selectedUserId?: string;
  departmentId?: string;
  month?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface WorkLogFilterEmployee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  departmentId?: number | null;
  joiningDate?: string | Date | null;
}

export interface WorkLogFilterDepartment {
  id: number;
  name: string;
}

export interface SharedFilterProps {
  filters: WorkLogFilters;
  setFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  draftFilters: WorkLogFilters;
  setDraftFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  activeFilterCount: number;
  availableYears: number[];
  currentYear: number;
  currentQuarter: number;
  employees: WorkLogFilterEmployee[] | undefined;
  departments: WorkLogFilterDepartment[] | undefined;
  canManageEmployees: boolean;
}

interface WorkLogFilterActionsProps extends SharedFilterProps {
  onExport: () => void;
}

export function WorkLogFilterActions({
  filters,
  setFilters,
  draftFilters,
  setDraftFilters,
  activeFilterCount,
  availableYears,
  currentYear,
  currentQuarter,
  employees,
  departments,
  canManageEmployees,
  onExport,
}: WorkLogFilterActionsProps) {
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const handleYearChange = useCallback((v: string) => {
    const y = parseInt(v);
    setFilters((p) => ({ ...p, year: y }));
    setDraftFilters((p) => ({ ...p, year: y }));
  }, [setFilters, setDraftFilters]);

  const handleQuarterChange = useCallback((v: string) => {
    const q = parseInt(v);
    const quarterStartMonth = (q - 1) * 3;
    const quarterMonths = [quarterStartMonth, quarterStartMonth + 1, quarterStartMonth + 2];
    setFilters((p) => ({
      ...p,
      quarter: q,
      month: p.month !== undefined && !quarterMonths.includes(p.month) ? undefined : p.month,
    }));
    setDraftFilters((p) => ({
      ...p,
      quarter: q,
      month: p.month !== undefined && !quarterMonths.includes(p.month) ? undefined : p.month,
    }));
  }, [setFilters, setDraftFilters]);

  const handleMyLogsSelect = useCallback(() => {
    setFilters((p) => ({ ...p, selectedUserId: undefined }));
    setDraftFilters((p) => ({ ...p, selectedUserId: undefined }));
    setEmployeeSearchOpen(false);
    setEmployeeSearch("");
  }, [setFilters, setDraftFilters]);

  const handleApplyDraft = useCallback((draft: WorkLogFilters) => {
    setFilters({ ...draft });
  }, [setFilters]);

  return (
    <div className={cn(FILTER_TOOLBAR_ROW, "w-full sm:w-auto")}>
      <Select value={filters.year.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="h-9 w-[84px]" aria-label="Select year">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          {availableYears.map((y) => (
            <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.quarter.toString()} onValueChange={handleQuarterChange}>
        <SelectTrigger className="h-9 w-[130px]" aria-label="Select quarter">
          <SelectValue placeholder="Quarter" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="1" className="text-xs">Q1 (Jan – Mar)</SelectItem>
          <SelectItem value="2" className="text-xs">Q2 (Apr – Jun)</SelectItem>
          <SelectItem value="3" className="text-xs">Q3 (Jul – Sep)</SelectItem>
          <SelectItem value="4" className="text-xs">Q4 (Oct – Dec)</SelectItem>
        </SelectContent>
      </Select>

      {canManageEmployees && employees && employees.length > 0 && (
        <ResponsivePopover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
          <ResponsivePopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={employeeSearchOpen}
              className="w-[170px] justify-between text-xs font-normal"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                {filters.selectedUserId
                  ? (() => {
                      const emp = (employees ?? []).find((e) => e.id === filters.selectedUserId);
                      return emp ? ([emp.firstName, emp.lastName].filter(Boolean).join(" ") || "Employee") : "Employee";
                    })()
                  : "My Logs"}
              </span>
              <ChevronDown className="ml-1.5 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </ResponsivePopoverTrigger>
          <ResponsivePopoverContent className="w-[240px] p-0" align="start" title="Select employee">
            <Command>
              <CommandInput
                placeholder="Search employee..."
                value={employeeSearch}
                onValueChange={setEmployeeSearch}
                className="text-xs"
              />
              <CommandList>
                <CommandEmpty className="text-xs py-3">No employee found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="My Logs"
                    onSelect={handleMyLogsSelect}
                    className="text-xs"
                  >
                    <Check className={cn("mr-2 h-3.5 w-3.5", !filters.selectedUserId ? "opacity-100" : "opacity-0")} />
                    My Logs
                  </CommandItem>
                  {(employees ?? []).map((emp) => (
                    <EmployeeDropdownItem
                      key={emp.id}
                      employee={emp}
                      empName={[emp.firstName, emp.lastName].filter(Boolean).join(" ") || "Unknown"}
                      isSelected={filters.selectedUserId === emp.id}
                      setFilters={setFilters}
                      setDraftFilters={setDraftFilters}
                      setOpen={setEmployeeSearchOpen}
                      setSearch={setEmployeeSearch}
                    />
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </ResponsivePopoverContent>
        </ResponsivePopover>
      )}

      <WorkLogAdvancedFiltersSheet
        filters={filters}
        setFilters={setFilters}
        draftFilters={draftFilters}
        setDraftFilters={setDraftFilters}
        activeFilterCount={activeFilterCount}
        availableYears={availableYears}
        currentYear={currentYear}
        currentQuarter={currentQuarter}
        employees={employees}
        departments={departments}
        canManageEmployees={canManageEmployees}
        onApply={handleApplyDraft}
      />

      {canManageEmployees && (
        <AnimatedIconButton icon={DownloadIcon} iconSize={12} iconClassName="mr-0" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onExport}>
          <span className="hidden sm:inline">Export</span>
        </AnimatedIconButton>
      )}
    </div>
  );
}

function EmployeeDropdownItem({
  employee,
  empName,
  isSelected,
  setFilters,
  setDraftFilters,
  setOpen,
  setSearch,
}: {
  employee: WorkLogFilterEmployee;
  empName: string;
  isSelected: boolean;
  setFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  setDraftFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
}) {
  const handleSelect = useCallback(() => {
    setFilters((p) => ({ ...p, selectedUserId: employee.id }));
    setDraftFilters((p) => ({ ...p, selectedUserId: employee.id }));
    setOpen(false);
    setSearch("");
  }, [employee.id, setFilters, setDraftFilters, setOpen, setSearch]);

  return (
    <CommandItem value={empName} onSelect={handleSelect} className="text-xs">
      <Check className={cn("mr-2 h-3.5 w-3.5", isSelected ? "opacity-100" : "opacity-0")} />
      {empName}
    </CommandItem>
  );
}
