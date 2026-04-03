"use client";

import { useState, useMemo, useCallback } from "react";
import { format, eachDayOfInterval, isWeekend, parse, isValid } from "date-fns";
import { useGetWorkLogs, useUpsertWorkLog, useUpdateWorkLogStatus } from "@/lib/hooks/trpc-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
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
import {
  Dialog, DialogContent, DialogHeader as DlgHeader, DialogTitle as DlgTitle, DialogFooter as DlgFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronRight, Search, Save, X, Users, Check, XCircle, Download, Filter, CalendarDays } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";

/* ─── Filter state type ─── */
interface WorkLogFilters {
  year: number;
  quarter: number;
  selectedUserId?: string;
  departmentId?: string;
  month?: number; // 0-11
  dateFrom?: string; // yyyy-MM-dd
  dateTo?: string; // yyyy-MM-dd
}

export default function WorkLogsPage() {
  const { data: session } = useSession();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  const [filters, setFilters] = useState<WorkLogFilters>({
    year: currentYear,
    quarter: currentQuarter,
  });
  // Draft state for the filter sheet (applied on "Apply")
  const [draftFilters, setDraftFilters] = useState<WorkLogFilters>({
    year: currentYear,
    quarter: currentQuarter,
  });

  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Keep backward-compatible aliases
  const year = filters.year;
  const quarter = filters.quarter;
  const selectedUserId = filters.selectedUserId;

  const isAdminOrCeo = session?.user?.role === "CEO" || session?.user?.role === "HR" || session?.user?.role === "ADMIN";

  const { data: employees } = api.hr.getEmployees.useQuery(undefined, {
    enabled: isAdminOrCeo,
  });

  const { data: departments } = api.hr.getDepartments.useQuery(undefined, {
    enabled: isAdminOrCeo,
  });

  /* ─── Count active filters (beyond defaults) ─── */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.selectedUserId) count++;
    if (filters.departmentId) count++;
    if (filters.month !== undefined) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.year !== currentYear) count++;
    if (filters.quarter !== currentQuarter) count++;
    return count;
  }, [filters, currentYear, currentQuarter]);

  /* ─── Filtered employee list by department ─── */
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (!filters.departmentId) return employees;
    return employees.filter((e) => e.departmentId?.toString() === filters.departmentId);
  }, [employees, filters.departmentId]);

  const joiningYear = useMemo(() => {
    if (!employees) return currentYear;
    const targetId = draftFilters.selectedUserId || session?.user?.id;
    const emp = employees.find(e => e.id === targetId);
    if (emp?.joiningDate) return new Date(emp.joiningDate).getFullYear();
    return currentYear;
  }, [employees, draftFilters.selectedUserId, session?.user?.id, currentYear]);

  const availableYears = useMemo(() => {
    const years = [];
    for (let y = joiningYear; y <= currentYear; y++) years.push(y);
    return years.length > 0 ? years : [currentYear];
  }, [joiningYear, currentYear]);

  const toggleMonth = useCallback((monthKey: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }, []);

  const { data: logs, isLoading } = useGetWorkLogs({
    year,
    quarter,
    ...(selectedUserId ? { userId: selectedUserId } : {}),
  });

  const upsertLog = useUpsertWorkLog({
    onSuccess: () => {
      toast.success("Work log saved successfully");
    },
    onError: () => {
      toast.error("Failed to save log");
    },
  });

  const updateStatus = useUpdateWorkLogStatus({
    onSuccess: () => {
      toast.success("Work log status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const days = useMemo(() => {
    const startMonthIndex = (quarter - 1) * 3;
    const startDate = new Date(year, startMonthIndex, 1);
    const endDate = new Date(year, startMonthIndex + 3, 0);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [year, quarter]);

  const monthGroups = useMemo(() => {
    const groups: { monthKey: string; label: string; days: Date[] }[] = [];
    let currentGroup: (typeof groups)[number] | null = null;

    for (const date of days) {
      const monthKey = format(date, "yyyy-MM");
      const label = format(date, "MMMM yyyy");
      if (!currentGroup || currentGroup.monthKey !== monthKey) {
        currentGroup = { monthKey, label, days: [] };
        groups.push(currentGroup);
      }
      currentGroup.days.push(date);
    }
    return groups;
  }, [days]);

  const filledCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!logs) return counts;
    for (const group of monthGroups) {
      counts[group.monthKey] = group.days.filter((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        return logs.some((l) => l.date === dateStr && l.description);
      }).length;
    }
    return counts;
  }, [logs, monthGroups]);

  // Filtering: month, date range, and search keyword
  const filterDay = useCallback(
    (date: Date) => {
      // Month filter
      if (filters.month !== undefined && date.getMonth() !== filters.month) return false;

      // Date range filter
      const dateStr = format(date, "yyyy-MM-dd");
      if (filters.dateFrom && dateStr < filters.dateFrom) return false;
      if (filters.dateTo && dateStr > filters.dateTo) return false;

      // Search term filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      const log = logs?.find((l) => l.date === dateStr);

      // Check if search term matches the date display
      const dateDisplay = format(date, "dd MMM yyyy EEEE").toLowerCase();
      if (dateDisplay.includes(term)) return true;

      // Try parsing as a date (e.g., "15 Jan 2026", "2026-01-15", "15/01/2026")
      const dateFormats = ["d MMM yyyy", "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "d MMMM yyyy"];
      for (const fmt of dateFormats) {
        const parsed = parse(term, fmt, new Date());
        if (isValid(parsed) && format(parsed, "yyyy-MM-dd") === dateStr) return true;
      }

      // Check keyword in description
      if (log?.description?.toLowerCase().includes(term)) return true;

      return false;
    },
    [searchTerm, logs, filters.month, filters.dateFrom, filters.dateTo],
  );

  const hasSearchResults = useMemo(() => {
    if (!searchTerm.trim()) return true;
    return days.some(filterDay);
  }, [days, filterDay, searchTerm]);

  const handleExportWorkLogs = useCallback(async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Work Logs");

      const employeeName = selectedUserId && employees
        ? `${employees.find((e) => e.id === selectedUserId)?.firstName ?? ""} ${employees.find((e) => e.id === selectedUserId)?.lastName ?? ""}`.trim()
        : "My";

      sheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Day", key: "day", width: 12 },
        { header: "Description", key: "description", width: 50 },
        { header: "Status", key: "status", width: 12 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

      for (const date of days) {
        const dateStr = format(date, "yyyy-MM-dd");
        const log = logs?.find((l) => l.date === dateStr);
        sheet.addRow({
          date: format(date, "dd MMM yyyy"),
          day: format(date, "EEEE"),
          description: log?.description || "",
          status: log?.status || (log?.description ? "PENDING" : ""),
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `work-logs-${employeeName}-Q${quarter}-${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Work logs exported successfully");
    } catch {
      toast.error("Failed to export work logs");
    }
  }, [days, logs, selectedUserId, employees, quarter, year]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm pb-3 space-y-3 sm:space-y-4 pt-1 border-b border-border/40 shadow-sm overflow-x-hidden">
      <PageHeader
        title="Work Logs"
        description={
          selectedUserId && employees
            ? `Viewing logs for ${employees.find((e) => e.id === selectedUserId)?.firstName ?? "employee"} ${employees.find((e) => e.id === selectedUserId)?.lastName ?? ""}.`
            : "Track your daily tasks and activities."
        }
        actions={
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* Quick quarter/year selectors stay visible */}
            <Select value={year.toString()} onValueChange={(v) => { const y = parseInt(v); setFilters(p => ({ ...p, year: y })); setDraftFilters(p => ({ ...p, year: y })); }}>
              <SelectTrigger className="w-[90px] sm:w-[100px] h-9" aria-label="Select year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={quarter.toString()} onValueChange={(v) => { const q = parseInt(v); setFilters(p => ({ ...p, quarter: q })); setDraftFilters(p => ({ ...p, quarter: q })); }}>
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
                    <Select value={draftFilters.year.toString()} onValueChange={(v) => setDraftFilters(p => ({ ...p, year: parseInt(v) }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((y) => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quarter */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Quarter</Label>
                    <Select value={draftFilters.quarter.toString()} onValueChange={(v) => setDraftFilters(p => ({ ...p, quarter: parseInt(v) }))}>
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
                      onValueChange={(v) => setDraftFilters(p => ({ ...p, month: v === "all" ? undefined : parseInt(v) }))}
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
                            setDraftFilters(p => ({ ...p, dateFrom: val || undefined }));
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
                            setDraftFilters(p => ({ ...p, dateTo: val || undefined }));
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
                        onValueChange={(v) => setDraftFilters(p => ({
                          ...p,
                          departmentId: v === "all" ? undefined : v,
                          // Clear employee selection when department changes
                          selectedUserId: v === "all" ? p.selectedUserId : undefined,
                        }))}
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

                  {/* Assignees / Employee (admin only) */}
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
                                  setDraftFilters(p => ({ ...p, selectedUserId: undefined }));
                                  setEmployeeSearchOpen(false);
                                  setEmployeeSearch("");
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", !draftFilters.selectedUserId ? "opacity-100" : "opacity-0")} />
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
                                    setDraftFilters(p => ({ ...p, selectedUserId: emp.id }));
                                    setEmployeeSearchOpen(false);
                                    setEmployeeSearch("");
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", draftFilters.selectedUserId === emp.id ? "opacity-100" : "opacity-0")} />
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
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExportWorkLogs}>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Search Bar */}
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

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Active filters:</span>
          {filters.departmentId && departments && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              Dept: {departments.find((d) => d.id.toString() === filters.departmentId)?.name ?? "Unknown"}
              <button onClick={() => { setFilters(p => ({ ...p, departmentId: undefined })); setDraftFilters(p => ({ ...p, departmentId: undefined })); }} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filters.selectedUserId && employees && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              Employee: {employees.find((e) => e.id === filters.selectedUserId)?.firstName ?? "Selected"}
              <button onClick={() => { setFilters(p => ({ ...p, selectedUserId: undefined })); setDraftFilters(p => ({ ...p, selectedUserId: undefined })); }} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filters.month !== undefined && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              Month: {format(new Date(filters.year, filters.month, 1), "MMMM")}
              <button onClick={() => { setFilters(p => ({ ...p, month: undefined })); setDraftFilters(p => ({ ...p, month: undefined })); }} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              {filters.dateFrom && filters.dateTo
                ? `${filters.dateFrom} — ${filters.dateTo}`
                : filters.dateFrom
                  ? `From ${filters.dateFrom}`
                  : `Until ${filters.dateTo}`}
              <button onClick={() => { setFilters(p => ({ ...p, dateFrom: undefined, dateTo: undefined })); setDraftFilters(p => ({ ...p, dateFrom: undefined, dateTo: undefined })); }} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
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

      {/* Status Legend */}
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
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center" role="status" aria-label="Loading work logs">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      ) : !hasSearchResults ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Search className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-medium text-foreground">No results found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No work logs match &ldquo;{searchTerm}&rdquo;. Try a different keyword or date.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {monthGroups.map((group) => {
            const filteredDays = group.days.filter(filterDay);
            if (searchTerm.trim() && filteredDays.length === 0) return null;

            const isCollapsed = collapsedMonths.has(group.monthKey);
            const filled = filledCounts[group.monthKey] ?? 0;
            const weekdays = group.days.filter((d) => !isWeekend(d)).length;
            const regionId = `month-content-${group.monthKey}`;
            const displayDays = searchTerm.trim() ? filteredDays : group.days;

            return (
              <Card key={group.monthKey}>
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => toggleMonth(group.monthKey)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={!isCollapsed}
                  aria-controls={regionId}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleMonth(group.monthKey);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      )}
                      <CardTitle className="text-base sm:text-lg truncate">{group.label}</CardTitle>
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap shrink-0">
                      {searchTerm.trim() ? `${filteredDays.length} match${filteredDays.length !== 1 ? "es" : ""}` : `${filled}/${weekdays} logged`}
                    </span>
                  </div>
                </CardHeader>
                {!isCollapsed && (
                  <CardContent id={regionId} role="region" aria-label={`Work logs for ${group.label}`} className="px-3 sm:px-6">
                    <div className="space-y-2 sm:space-y-4">
                      {displayDays.map((date) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        const log = logs?.find((l) => l.date === dateStr);
                        const isViewingOther = !!selectedUserId;
                        return (
                          <DayLogEntry
                            key={dateStr}
                            date={date}
                            initialContent={log?.description ?? ""}
                            onSave={(content) => upsertLog.mutate({ date, description: content })}
                            isSaving={upsertLog.isPending}
                            searchTerm={searchTerm}
                            readOnly={isViewingOther}
                            status={log?.status ?? undefined}
                            showApprovalActions={isViewingOther && isAdminOrCeo && log?.status === "PENDING" && !!log?.description}
                            onApprove={log ? () => updateStatus.mutate({ id: log.id, status: "APPROVED" }) : undefined}
                            onReject={log ? (reason) => updateStatus.mutate({ id: log.id, status: "REJECTED", rejectionReason: reason }) : undefined}
                            isUpdatingStatus={updateStatus.isPending}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DayLogEntry({
  date,
  initialContent,
  onSave,
  isSaving,
  searchTerm,
  readOnly = false,
  status,
  showApprovalActions = false,
  onApprove,
  onReject,
  isUpdatingStatus = false,
}: {
  date: Date;
  initialContent: string;
  onSave: (c: string) => void;
  isSaving: boolean;
  searchTerm: string;
  readOnly?: boolean;
  status?: string;
  showApprovalActions?: boolean;
  onApprove?: () => void;
  onReject?: (reason?: string) => void;
  isUpdatingStatus?: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [prevInitial, setPrevInitial] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (initialContent !== prevInitial) {
    setPrevInitial(initialContent);
    if (!isDirty) {
      setContent(initialContent);
    }
  }

  const hasUnsavedChanges = content !== initialContent;

  const handleSave = () => {
    if (hasUnsavedChanges) {
      onSave(content);
      setIsDirty(false);
    }
  };

  const handleDiscard = () => {
    setContent(initialContent);
    setIsDirty(false);
  };

  const isWeekendDay = isWeekend(date);
  const dateLabel = format(date, "EEEE, MMMM d");
  const statusLabel = hasUnsavedChanges
    ? "Unsaved draft — click Save to submit"
    : content
      ? "Logged — entry saved"
      : "Empty — no entry yet";

  // Highlight matching text in description
  const highlightMatch = (text: string) => {
    if (!searchTerm.trim() || !text) return null;
    const term = searchTerm.trim();
    const splitRegex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const testRegex = new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const parts = text.split(splitRegex);
    if (parts.length === 1) return null;
    return parts.map((part, i) =>
      testRegex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  const highlighted = highlightMatch(content);

  return (
    <>
    <div
      title={statusLabel}
      className={cn(
        "flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border shadow-sm hover:shadow-md transition-all",
        isWeekendDay ? "bg-[#bd882c]/[0.03] dark:bg-[#bd882c]/[0.05]" : "bg-card",
        hasUnsavedChanges
          ? "border-l-4 border-l-amber-500"
          : content
            ? "border-l-4 border-l-green-500"
            : "border-l-4 border-l-slate-200 dark:border-l-slate-700",
      )}
    >
      <div className="sm:w-32 md:w-36 flex-shrink-0 flex sm:flex-col items-center sm:items-start gap-1.5">
        <span className="font-bold text-lg sm:text-xl text-foreground leading-none">{format(date, "dd")}</span>
        <span className="text-muted-foreground text-xs font-medium">{format(date, "MMM, EEEE")}</span>
        <div className="flex items-center gap-1.5">
          {isWeekendDay && (
            <span className="text-[10px] bg-[#bd882c]/10 dark:bg-[#bd882c]/20 px-1.5 py-0.5 rounded font-medium text-[#bd882c] dark:text-[#d4a84a] inline-block">
              Weekend
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-medium text-amber-700 dark:text-amber-400 inline-block">
              Draft
            </span>
          )}
          {status === "PENDING" && initialContent && (
            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-medium text-amber-700 dark:text-amber-400 inline-block">
              Pending
            </span>
          )}
          {status === "APPROVED" && (
            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded font-medium text-green-700 dark:text-green-400 inline-block">
              Approved
            </span>
          )}
          {status === "REJECTED" && (
            <span className="text-[10px] bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded font-medium text-red-700 dark:text-red-400 inline-block">
              Rejected
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <Textarea
          value={content}
          onChange={(e) => {
            if (readOnly) return;
            setContent(e.target.value);
            setIsDirty(true);
          }}
          readOnly={readOnly}
          placeholder={isWeekendDay ? "Weekend..." : readOnly ? "No entry" : "What did you work on today?"}
          aria-label={`Work log for ${dateLabel}`}
          className={cn(
            "resize-none focus-visible:ring-1 focus-visible:ring-offset-0 text-sm",
            isWeekendDay && !content ? "min-h-[36px] opacity-50" : "min-h-[60px]",
            readOnly && "cursor-default opacity-75",
          )}
        />
        {/* Highlighted search match preview */}
        {highlighted && !hasUnsavedChanges && (
          <p className="text-xs text-muted-foreground px-1 truncate">
            {highlighted}
          </p>
        )}
        {/* Approve / Reject buttons for admin viewing other's logs */}
        {showApprovalActions && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              onClick={onApprove}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs gap-1.5"
              onClick={() => { setRejectReason(""); setRejectDialogOpen(true); }}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              Reject
            </Button>
          </div>
        )}
        {/* Save / Discard buttons */}
        {hasUnsavedChanges && !readOnly && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              onClick={handleDiscard}
              disabled={isSaving}
            >
              Discard
            </Button>
          </div>
        )}
      </div>
    </div>
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DlgHeader>
            <DlgTitle>Rejection reason</DlgTitle>
          </DlgHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[80px]"
          />
          <DlgFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { setRejectDialogOpen(false); onReject?.(rejectReason || undefined); }}
            >
              Reject
            </Button>
          </DlgFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
