"use client";

import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Search, X, Users, Check, ChevronDown, Filter, CalendarDays, Download } from "lucide-react";

/* ─── Filter state type ─── */
export interface WorkLogFilters {
  year: number;
  quarter: number;
  selectedUserId?: string;
  departmentId?: string;
  month?: number; // 0-11
  dateFrom?: string; // yyyy-MM-dd
  dateTo?: string; // yyyy-MM-dd
}

interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  departmentId?: number | null;
  joiningDate?: string | Date | null;
}

interface Department {
  id: number;
  name: string;
}

/* ─── Shared props used by both components ─── */
interface SharedFilterProps {
  filters: WorkLogFilters;
  setFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  draftFilters: WorkLogFilters;
  setDraftFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  activeFilterCount: number;
  availableYears: number[];
  currentYear: number;
  currentQuarter: number;
  employees: Employee[] | undefined;
  departments: Department[] | undefined;
  isAdminOrCeo: boolean;
  employeeSearchOpen: boolean;
  setEmployeeSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  employeeSearch: string;
  setEmployeeSearch: React.Dispatch<React.SetStateAction<string>>;
}

/* ─────────────────────────────────────────────────────────────
   WorkLogFilterActions
   Renders the year/quarter quick selectors, the Advanced Filters
   Sheet, and the Export button. Intended for PageHeader's `actions` prop.
   ───────────────────────────────────────────────────────────── */
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
  const year = filters.year;
  const quarter = filters.quarter;

  return (
    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
      {/* Quick year selector */}
      <Select
        value={year.toString()}
        onValueChange={(v) => {
          const y = parseInt(v);
          setFilters((p) => ({ ...p, year: y }));
          setDraftFilters((p) => ({ ...p, year: y }));
        }}
      >
        <SelectTrigger className="w-[90px] sm:w-[100px] h-9" aria-label="Select year">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Quick quarter selector */}
      <Select
        value={quarter.toString()}
        onValueChange={(v) => {
          const q = parseInt(v);
          setFilters((p) => ({ ...p, quarter: q }));
          setDraftFilters((p) => ({ ...p, quarter: q }));
        }}
      >
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

      {/* Advanced Filters Sheet */}
      <Sheet onOpenChange={(open) => { if (open) setDraftFilters({ ...filters }); }}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 relative">
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-gold text-white border-0">
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
            {/* Year */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Year</Label>
              <Select
                value={draftFilters.year.toString()}
                onValueChange={(v) => setDraftFilters((p) => ({ ...p, year: parseInt(v) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quarter */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Quarter</Label>
              <Select
                value={draftFilters.quarter.toString()}
                onValueChange={(v) => setDraftFilters((p) => ({ ...p, quarter: parseInt(v) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1 (Jan - Mar)</SelectItem>
                  <SelectItem value="2">Q2 (Apr - Jun)</SelectItem>
                  <SelectItem value="3">Q3 (Jul - Sep)</SelectItem>
                  <SelectItem value="4">Q4 (Oct - Dec)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Month (within selected quarter) */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Month</Label>
              <Select
                value={draftFilters.month !== undefined ? draftFilters.month.toString() : "all"}
                onValueChange={(v) =>
                  setDraftFilters((p) => ({ ...p, month: v === "all" ? undefined : parseInt(v) }))
                }
              >
                <SelectTrigger className="w-full">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {(() => {
                    const startMonthIdx = (draftFilters.quarter - 1) * 3;
                    return [0, 1, 2].map((offset) => {
                      const monthIdx = startMonthIdx + offset;
                      const monthName = format(new Date(draftFilters.year, monthIdx, 1), "MMMM");
                      return (
                        <SelectItem key={monthIdx} value={monthIdx.toString()}>
                          {monthName}
                        </SelectItem>
                      );
                    });
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={draftFilters.dateFrom || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && new Date(val).getFullYear() > 2100) return;
                      setDraftFilters((p) => ({ ...p, dateFrom: val || undefined }));
                    }}
                    max={draftFilters.dateTo || new Date().toISOString().slice(0, 10)}
                    onKeyDown={(e) => e.preventDefault()}
                    className="text-sm cursor-pointer"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={draftFilters.dateTo || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && new Date(val).getFullYear() > 2100) return;
                      setDraftFilters((p) => ({ ...p, dateTo: val || undefined }));
                    }}
                    min={draftFilters.dateFrom || undefined}
                    max={new Date().toISOString().slice(0, 10)}
                    onKeyDown={(e) => e.preventDefault()}
                    className="text-sm cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Department (admin only) */}
            {isAdminOrCeo && departments && departments.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Department</Label>
                <Select
                  value={draftFilters.departmentId || "all"}
                  onValueChange={(v) =>
                    setDraftFilters((p) => ({
                      ...p,
                      departmentId: v === "all" ? undefined : v,
                      // Clear employee selection when department changes
                      selectedUserId: v === "all" ? p.selectedUserId : undefined,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Employee (admin only) */}
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
                        {draftFilters.selectedUserId
                          ? (() => {
                              const emp = employees.find((e) => e.id === draftFilters.selectedUserId);
                              return emp ? `${emp.firstName} ${emp.lastName}` : "Select employee";
                            })()
                          : "My Logs"}
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
                        <CommandItem
                          value="My Logs"
                          onSelect={() => {
                            setDraftFilters((p) => ({ ...p, selectedUserId: undefined }));
                            setEmployeeSearchOpen(false);
                            setEmployeeSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !draftFilters.selectedUserId ? "opacity-100" : "opacity-0",
                            )}
                          />
                          My Logs
                        </CommandItem>
                        {(draftFilters.departmentId
                          ? employees.filter((e) => e.departmentId?.toString() === draftFilters.departmentId)
                          : employees
                        ).map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={`${emp.firstName} ${emp.lastName}`}
                            onSelect={() => {
                              setDraftFilters((p) => ({ ...p, selectedUserId: emp.id }));
                              setEmployeeSearchOpen(false);
                              setEmployeeSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                draftFilters.selectedUserId === emp.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {emp.firstName} {emp.lastName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <SheetFooter className="flex flex-row gap-2 sm:flex-row pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const reset: WorkLogFilters = { year: currentYear, quarter: currentQuarter };
                setDraftFilters(reset);
              }}
            >
              Reset
            </Button>
            <SheetClose asChild>
              <Button
                className="flex-1 bg-gold hover:bg-gold/90 text-white"
                onClick={() => setFilters({ ...draftFilters })}
              >
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

/* ─────────────────────────────────────────────────────────────
   WorkLogFilters
   Renders the search bar, active filter chips, and status legend.
   Intended as a sibling of PageHeader inside the sticky header div.
   ───────────────────────────────────────────────────────────── */
interface WorkLogFiltersProps extends SharedFilterProps {
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
}: WorkLogFiltersProps) {
  return (
    <>
      {/* ── Search Bar ── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Search by date or keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-9 h-9 border-border bg-muted/50 focus-visible:bg-background"
          aria-label="Search work logs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Active Filter Chips ── */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Active filters:</span>
          {filters.departmentId && departments && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              Dept: {departments.find((d) => d.id.toString() === filters.departmentId)?.name ?? "Unknown"}
              <button
                onClick={() => {
                  setFilters((p) => ({ ...p, departmentId: undefined }));
                  setDraftFilters((p) => ({ ...p, departmentId: undefined }));
                }}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.selectedUserId && employees && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              Employee: {employees.find((e) => e.id === filters.selectedUserId)?.firstName ?? "Selected"}
              <button
                onClick={() => {
                  setFilters((p) => ({ ...p, selectedUserId: undefined }));
                  setDraftFilters((p) => ({ ...p, selectedUserId: undefined }));
                }}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.month !== undefined && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              Month: {format(new Date(filters.year, filters.month, 1), "MMMM")}
              <button
                onClick={() => {
                  setFilters((p) => ({ ...p, month: undefined }));
                  setDraftFilters((p) => ({ ...p, month: undefined }));
                }}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              {filters.dateFrom && filters.dateTo
                ? `${filters.dateFrom} — ${filters.dateTo}`
                : filters.dateFrom
                  ? `From ${filters.dateFrom}`
                  : `Until ${filters.dateTo}`}
              <button
                onClick={() => {
                  setFilters((p) => ({ ...p, dateFrom: undefined, dateTo: undefined }));
                  setDraftFilters((p) => ({ ...p, dateFrom: undefined, dateTo: undefined }));
                }}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={() => {
              const reset: WorkLogFilters = { year: currentYear, quarter: currentQuarter };
              setFilters(reset);
              setDraftFilters(reset);
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Status Legend ── */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Status:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500 shrink-0" />
          Logged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500 shrink-0" />
          Unsaved Draft
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700 shrink-0" />
          Empty
        </span>
      </div>
    </>
  );
}
