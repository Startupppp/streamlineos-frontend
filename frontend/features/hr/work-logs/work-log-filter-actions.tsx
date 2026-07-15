"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
  SheetTrigger, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Users, Check, ChevronDown, SlidersHorizontal, CalendarDays, Download } from "lucide-react";

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
  isAdminOrCeo: boolean;
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
  isAdminOrCeo,
  onExport,
}: WorkLogFilterActionsProps) {
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [sheetPickerOpen, setSheetPickerOpen] = useState(false);
  const [sheetPickerSearch, setSheetPickerSearch] = useState("");

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

  const handleSheetOpen = useCallback((open: boolean) => {
    if (open) setDraftFilters({ ...filters });
  }, [filters, setDraftFilters]);

  const handleDraftYearChange = useCallback((v: string) => {
    setDraftFilters((p) => ({ ...p, year: parseInt(v) }));
  }, [setDraftFilters]);

  const handleDraftQuarterChange = useCallback((v: string) => {
    setDraftFilters((p) => ({ ...p, quarter: parseInt(v) }));
  }, [setDraftFilters]);

  const handleDraftMonthChange = useCallback((v: string) => {
    setDraftFilters((p) => ({ ...p, month: v === "all" ? undefined : parseInt(v) }));
  }, [setDraftFilters]);

  const handleDraftDateFromChange = useCallback((val: string) => {
    setDraftFilters((p) => ({ ...p, dateFrom: val || undefined }));
  }, [setDraftFilters]);

  const handleDraftDateToChange = useCallback((val: string) => {
    setDraftFilters((p) => ({ ...p, dateTo: val || undefined }));
  }, [setDraftFilters]);

  const handleDraftDepartmentChange = useCallback((v: string) => {
    setDraftFilters((p) => {
      const newDeptId = v === "all" ? undefined : v;
      const empStillInDept =
        !newDeptId ||
        !p.selectedUserId ||
        (employees ?? []).some(
          (e) => e.id === p.selectedUserId && e.departmentId?.toString() === newDeptId
        );
      return {
        ...p,
        departmentId: newDeptId,
        selectedUserId: empStillInDept ? p.selectedUserId : undefined,
      };
    });
  }, [setDraftFilters, employees]);

  const handleSelectMyLogs = useCallback(() => {
    setDraftFilters((p) => ({ ...p, selectedUserId: undefined }));
    setSheetPickerOpen(false);
    setSheetPickerSearch("");
  }, [setDraftFilters]);

  const handleApplyFilters = useCallback(() => {
    setFilters({ ...draftFilters });
  }, [setFilters, draftFilters]);

  const handleResetDraft = useCallback(() => {
    setDraftFilters({ year: currentYear, quarter: currentQuarter });
  }, [setDraftFilters, currentYear, currentQuarter]);

  const handleMyLogsSelect = useCallback(() => {
    setFilters((p) => ({ ...p, selectedUserId: undefined }));
    setDraftFilters((p) => ({ ...p, selectedUserId: undefined }));
    setEmployeeSearchOpen(false);
    setEmployeeSearch("");
  }, [setFilters, setDraftFilters]);

  const filteredEmployees = draftFilters.departmentId
    ? (employees ?? []).filter((e) => e.departmentId?.toString() === draftFilters.departmentId)
    : (employees ?? []);

  const selectedEmployeeName = draftFilters.selectedUserId
    ? (() => {
        const emp = (employees ?? []).find((e) => e.id === draftFilters.selectedUserId);
        return emp ? ([emp.firstName, emp.lastName].filter(Boolean).join(" ") || "Unknown") : "Select employee";
      })()
    : "My Logs";

  const monthOptions = (() => {
    const startMonthIdx = (draftFilters.quarter - 1) * 3;
    return [0, 1, 2].map((offset) => {
      const monthIdx = startMonthIdx + offset;
      return {
        idx: monthIdx,
        name: format(new Date(draftFilters.year, monthIdx, 1), "MMMM"),
      };
    });
  })();

  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0 w-full sm:w-auto">
      <Select value={filters.year.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="h-9 w-[84px] text-xs" aria-label="Select year">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)]">
          {availableYears.map((y) => (
            <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.quarter.toString()} onValueChange={handleQuarterChange}>
        <SelectTrigger className="h-9 w-[130px] text-xs" aria-label="Select quarter">
          <SelectValue placeholder="Quarter" />
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)]">
          <SelectItem value="1" className="text-xs">Q1 (Jan – Mar)</SelectItem>
          <SelectItem value="2" className="text-xs">Q2 (Apr – Jun)</SelectItem>
          <SelectItem value="3" className="text-xs">Q3 (Jul – Sep)</SelectItem>
          <SelectItem value="4" className="text-xs">Q4 (Oct – Dec)</SelectItem>
        </SelectContent>
      </Select>

      {isAdminOrCeo && employees && employees.length > 0 && (
        <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
          <PopoverTrigger asChild>
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
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
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
                  {(employees ?? []).map((emp) => {
                    const empName = [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "Unknown";
                    return (
                      <EmployeeDropdownItem
                        key={emp.id}
                        employee={emp}
                        empName={empName}
                        isSelected={filters.selectedUserId === emp.id}
                        setFilters={setFilters}
                        setDraftFilters={setDraftFilters}
                        setOpen={setEmployeeSearchOpen}
                        setSearch={setEmployeeSearch}
                      />
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      <Sheet onOpenChange={handleSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative gap-1.5 text-xs">
            <SlidersHorizontal className="h-3 w-3" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground border-0 font-bold">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-sm overflow-y-auto p-0">
          <SheetHeader className="p-5 pb-4 border-b border-border">
            <SheetTitle className="text-sm font-semibold">Advanced Filters</SheetTitle>
            <SheetDescription className="text-xs">Refine your work logs view</SheetDescription>
          </SheetHeader>

          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">Year</Label>
              <Select value={draftFilters.year.toString()} onValueChange={handleDraftYearChange}>
                <SelectTrigger className="w-full text-sm"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">Quarter</Label>
              <Select value={draftFilters.quarter.toString()} onValueChange={handleDraftQuarterChange}>
                <SelectTrigger className="w-full text-sm"><SelectValue placeholder="Select quarter" /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="1">Q1 (Jan – Mar)</SelectItem>
                  <SelectItem value="2">Q2 (Apr – Jun)</SelectItem>
                  <SelectItem value="3">Q3 (Jul – Sep)</SelectItem>
                  <SelectItem value="4">Q4 (Oct – Dec)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">Month</Label>
              <Select
                value={draftFilters.month !== undefined ? draftFilters.month.toString() : "all"}
                onValueChange={handleDraftMonthChange}
              >
                <SelectTrigger className="w-full text-sm">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  <SelectItem value="all">All Months</SelectItem>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.idx} value={m.idx.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground font-medium">From</Label>
                  <DatePicker
                    value={draftFilters.dateFrom || ""}
                    onChange={handleDraftDateFromChange}
                    placeholder="From date"
                    toDate={draftFilters.dateTo ? new Date(draftFilters.dateTo) : undefined}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground font-medium">To</Label>
                  <DatePicker
                    value={draftFilters.dateTo || ""}
                    onChange={handleDraftDateToChange}
                    placeholder="To date"
                    fromDate={draftFilters.dateFrom ? new Date(draftFilters.dateFrom) : undefined}
                  />
                </div>
              </div>
            </div>

            {isAdminOrCeo && departments && departments.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">Department</Label>
                <Select value={draftFilters.departmentId || "all"} onValueChange={handleDraftDepartmentChange}>
                  <SelectTrigger className="w-full text-sm"><SelectValue placeholder="All departments" /></SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAdminOrCeo && employees && employees.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">Employee</Label>
                <Popover open={sheetPickerOpen} onOpenChange={setSheetPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={sheetPickerOpen}
                      className="w-full justify-between rounded-md border border-input bg-card px-3 font-normal text-sm shadow-xs"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {selectedEmployeeName}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search employee..."
                        value={sheetPickerSearch}
                        onValueChange={setSheetPickerSearch}
                        className="text-xs"
                      />
                      <CommandList>
                        <CommandEmpty className="text-xs py-3">No employee found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="My Logs" onSelect={handleSelectMyLogs} className="text-xs">
                            <Check className={cn("mr-2 h-3.5 w-3.5", !draftFilters.selectedUserId ? "opacity-100" : "opacity-0")} />
                            My Logs
                          </CommandItem>
                          {filteredEmployees.map((emp) => (
                            <EmployeeCommandItem
                              key={emp.id}
                              employee={emp}
                              isSelected={draftFilters.selectedUserId === emp.id}
                              onSelect={setDraftFilters}
                              onClose={setSheetPickerOpen}
                              onClearSearch={setSheetPickerSearch}
                            />
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <SheetFooter className="flex flex-row gap-2 p-5 pt-0 border-t border-border">
            <Button variant="outline" className="flex-1 h-9" onClick={handleResetDraft}>
              Reset
            </Button>
            <SheetClose asChild>
              <Button className="flex-1 h-9" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {isAdminOrCeo && (
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onExport}>
          <Download className="h-3 w-3" />
          <span className="hidden sm:inline">Export</span>
        </Button>
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

function EmployeeCommandItem({
  employee,
  isSelected,
  onSelect,
  onClose,
  onClearSearch,
}: {
  employee: WorkLogFilterEmployee;
  isSelected: boolean;
  onSelect: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  onClose: React.Dispatch<React.SetStateAction<boolean>>;
  onClearSearch: React.Dispatch<React.SetStateAction<string>>;
}) {
  const handleSelect = useCallback(() => {
    onSelect((p) => ({ ...p, selectedUserId: employee.id }));
    onClose(false);
    onClearSearch("");
  }, [employee.id, onSelect, onClose, onClearSearch]);

  const empName = [employee.firstName, employee.lastName].filter(Boolean).join(" ") || "Unknown";

  return (
    <CommandItem value={empName} onSelect={handleSelect} className="text-xs">
      <Check className={cn("mr-2 h-3.5 w-3.5", isSelected ? "opacity-100" : "opacity-0")} />
      {empName}
    </CommandItem>
  );
}
