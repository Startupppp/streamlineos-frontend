"use client";

import { useCallback } from "react";
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Users, Check, ChevronDown, Filter, CalendarDays, Download } from "lucide-react";

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
  employeeSearchOpen: boolean;
  setEmployeeSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  employeeSearch: string;
  setEmployeeSearch: React.Dispatch<React.SetStateAction<string>>;
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
  employeeSearchOpen,
  setEmployeeSearchOpen,
  employeeSearch,
  setEmployeeSearch,
  onExport,
}: WorkLogFilterActionsProps) {
  const handleYearChange = useCallback((v: string) => {
    const y = parseInt(v);
    setFilters((p) => ({ ...p, year: y }));
    setDraftFilters((p) => ({ ...p, year: y }));
  }, [setFilters, setDraftFilters]);

  const handleQuarterChange = useCallback((v: string) => {
    const q = parseInt(v);
    setFilters((p) => ({ ...p, quarter: q }));
    setDraftFilters((p) => ({ ...p, quarter: q }));
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
    setDraftFilters((p) => ({ ...p, month: v ==="all" ? undefined : parseInt(v) }));
  }, [setDraftFilters]);

  const handleDraftDateFromChange = useCallback((val: string) => {
    setDraftFilters((p) => ({ ...p, dateFrom: val || undefined }));
  }, [setDraftFilters]);

  const handleDraftDateToChange = useCallback((val: string) => {
    setDraftFilters((p) => ({ ...p, dateTo: val || undefined }));
  }, [setDraftFilters]);

  const handleDraftDepartmentChange = useCallback((v: string) => {
    setDraftFilters((p) => ({
      ...p,
      departmentId: v ==="all" ? undefined : v,
      selectedUserId: v ==="all" ? p.selectedUserId : undefined,
    }));
  }, [setDraftFilters]);

  const handleSelectMyLogs = useCallback(() => {
    setDraftFilters((p) => ({ ...p, selectedUserId: undefined }));
    setEmployeeSearchOpen(false);
    setEmployeeSearch("");
  }, [setDraftFilters, setEmployeeSearchOpen, setEmployeeSearch]);

  const handleApplyFilters = useCallback(() => {
    setFilters({ ...draftFilters });
  }, [setFilters, draftFilters]);

  const handleResetDraft = useCallback(() => {
    setDraftFilters({ year: currentYear, quarter: currentQuarter });
  }, [setDraftFilters, currentYear, currentQuarter]);

  const filteredEmployees = draftFilters.departmentId
    ? (employees ?? []).filter((e) => e.departmentId?.toString() === draftFilters.departmentId)
    : (employees ?? []);

  const selectedEmployeeName = draftFilters.selectedUserId
    ? (() => {
        const emp = (employees ?? []).find((e) => e.id === draftFilters.selectedUserId);
        return emp ? `${emp.firstName} ${emp.lastName}` :"Select employee";
      })()
    :"My Logs";

  const monthOptions = (() => {
    const startMonthIdx = (draftFilters.quarter - 1) * 3;
    return [0, 1, 2].map((offset) => {
      const monthIdx = startMonthIdx + offset;
      return {
        idx: monthIdx,
        name: format(new Date(draftFilters.year, monthIdx, 1),"MMMM"),
      };
    });
  })();

  return (
    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
      <Select value={filters.year.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[90px] sm:w-[100px] h-9" aria-label="Select year">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((y) => (
            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.quarter.toString()} onValueChange={handleQuarterChange}>
        <SelectTrigger className="w-[130px] sm:w-[150px] h-9" aria-label="Select quarter">
          <SelectValue placeholder="Quarter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Q1 (Jan - Mar)</SelectItem>
          <SelectItem value="2">Q2 (Apr - Jun)</SelectItem>
          <SelectItem value="3">Q3 (Jul - Sep)</SelectItem>
          <SelectItem value="4">Q4 (Oct - Dec)</SelectItem>
        </SelectContent>
      </Select>

      {isAdminOrCeo && employees && employees.length > 0 && (
        <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={employeeSearchOpen}
              className="h-9 w-[180px] sm:w-[220px] justify-between font-normal"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {filters.selectedUserId
                  ? (() => {
                      const emp = (employees ?? []).find((e) => e.id === filters.selectedUserId);
                      return emp ? `${emp.firstName} ${emp.lastName}` :"Employee";
                    })()
                  :"My Logs"}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search employee..."
                value={employeeSearch}
                onValueChange={setEmployeeSearch}
              />
              <CommandEmpty>No employee found.</CommandEmpty>
              <CommandGroup className="max-h-60 overflow-y-auto">
                <CommandItem
                  value="My Logs"
                  onSelect={() => {
                    setFilters((p) => ({ ...p, selectedUserId: undefined }));
                    setDraftFilters((p) => ({ ...p, selectedUserId: undefined }));
                    setEmployeeSearchOpen(false);
                    setEmployeeSearch("");
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", !filters.selectedUserId ?"opacity-100" :"opacity-0")} />
                  My Logs
                </CommandItem>
                {(employees ?? []).map((emp) => (
                  <CommandItem
                    key={emp.id}
                    value={`${emp.firstName} ${emp.lastName}`}
                    onSelect={() => {
                      setFilters((p) => ({ ...p, selectedUserId: emp.id }));
                      setDraftFilters((p) => ({ ...p, selectedUserId: emp.id }));
                      setEmployeeSearchOpen(false);
                      setEmployeeSearch("");
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", filters.selectedUserId === emp.id ?"opacity-100" :"opacity-0")} />
                    {emp.firstName} {emp.lastName}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      <Sheet onOpenChange={handleSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 relative">
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-blue-500 text-white border-0">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-sm overflow-y-auto p-5">
          <SheetHeader className="pb-4">
            <SheetTitle>Advanced Filters</SheetTitle>
            <SheetDescription>Refine your work logs view</SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Year</Label>
              <Select value={draftFilters.year.toString()} onValueChange={handleDraftYearChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Quarter</Label>
              <Select value={draftFilters.quarter.toString()} onValueChange={handleDraftQuarterChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select quarter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1 (Jan - Mar)</SelectItem>
                  <SelectItem value="2">Q2 (Apr - Jun)</SelectItem>
                  <SelectItem value="3">Q3 (Jul - Sep)</SelectItem>
                  <SelectItem value="4">Q4 (Oct - Dec)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Month</Label>
              <Select
                value={draftFilters.month !== undefined ? draftFilters.month.toString() :"all"}
                onValueChange={handleDraftMonthChange}
              >
                <SelectTrigger className="w-full">
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
              <Label className="text-sm font-medium">Date Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <DatePicker
                    value={draftFilters.dateFrom ||""}
                    onChange={handleDraftDateFromChange}
                    placeholder="From date"
                    toDate={draftFilters.dateTo ? new Date(draftFilters.dateTo) : undefined}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <DatePicker
                    value={draftFilters.dateTo ||""}
                    onChange={handleDraftDateToChange}
                    placeholder="To date"
                    fromDate={draftFilters.dateFrom ? new Date(draftFilters.dateFrom) : undefined}
                  />
                </div>
              </div>
            </div>

            {isAdminOrCeo && departments && departments.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Department</Label>
                <Select value={draftFilters.departmentId ||"all"} onValueChange={handleDraftDepartmentChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="All departments" /></SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto scrollbar-thin">
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
                <Label className="text-sm font-medium">Employee</Label>
                <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={employeeSearchOpen}
                      className="w-full justify-between font-normal"
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
                        value={employeeSearch}
                        onValueChange={setEmployeeSearch}
                      />
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-y-auto">
                        <CommandItem value="My Logs" onSelect={handleSelectMyLogs}>
                          <Check className={cn("mr-2 h-4 w-4", !draftFilters.selectedUserId ?"opacity-100" :"opacity-0")} />
                          My Logs
                        </CommandItem>
                        {filteredEmployees.map((emp) => (
                          <EmployeeCommandItem
                            key={emp.id}
                            employee={emp}
                            isSelected={draftFilters.selectedUserId === emp.id}
                            onSelect={setDraftFilters}
                            onClose={setEmployeeSearchOpen}
                            onClearSearch={setEmployeeSearch}
                          />
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <SheetFooter className="flex flex-row gap-2 sm:flex-row pt-4">
            <Button variant="outline" className="flex-1" onClick={handleResetDraft}>
              Reset
            </Button>
            <SheetClose asChild>
              <Button className="flex-1" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {isAdminOrCeo && (
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      )}
    </div>
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

  return (
    <CommandItem value={`${employee.firstName} ${employee.lastName}`} onSelect={handleSelect}>
      <Check className={cn("mr-2 h-4 w-4", isSelected ?"opacity-100" :"opacity-0")} />
      {employee.firstName} {employee.lastName}
    </CommandItem>
  );
}
