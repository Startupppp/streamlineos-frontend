"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format, eachDayOfInterval, parse, isValid } from "date-fns";
import { useGetWorkLogs, useUpsertWorkLog, useUpdateWorkLogStatus } from "@/lib/hooks/trpc-hooks";
import { useHrEmployees, useHrDepartments } from "@/lib/api/hooks/hr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import type { Employee } from "@/types/hr";

import {
  WorkLogFilterActions,
  WorkLogFiltersPanel,
  type WorkLogFilters as WorkLogFiltersType,
} from "@/features/hr/work-logs/work-log-filters";
import { WorkLogMonthGroup } from "@/features/hr/work-logs/work-log-month-group";

export default function WorkLogsPage() {
  const { data: session } = useSession();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const filters = useMemo<WorkLogFiltersType>(() => {
    const monthParam = searchParams.get("month");
    return {
      year: parseInt(searchParams.get("year") ?? "") || currentYear,
      quarter: parseInt(searchParams.get("quarter") ?? "") || currentQuarter,
      selectedUserId: searchParams.get("user") ?? undefined,
      departmentId: searchParams.get("dept") ?? undefined,
      month: monthParam !== null ? parseInt(monthParam) : undefined,
      dateFrom: searchParams.get("from") ?? undefined,
      dateTo: searchParams.get("to") ?? undefined,
    };
  }, [searchParams, currentYear, currentQuarter]);

  const setFilters = useCallback(
    (update: WorkLogFiltersType | ((prev: WorkLogFiltersType) => WorkLogFiltersType)) => {
      const newFilters = typeof update === "function" ? update(filters) : update;
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (newFilters.year !== currentYear) params.set("year", String(newFilters.year));
        else params.delete("year");
        if (newFilters.quarter !== currentQuarter) params.set("quarter", String(newFilters.quarter));
        else params.delete("quarter");
        if (newFilters.selectedUserId) params.set("user", newFilters.selectedUserId);
        else params.delete("user");
        if (newFilters.departmentId) params.set("dept", newFilters.departmentId);
        else params.delete("dept");
        if (newFilters.month != null) params.set("month", String(newFilters.month));
        else params.delete("month");
        if (newFilters.dateFrom) params.set("from", newFilters.dateFrom);
        else params.delete("from");
        if (newFilters.dateTo) params.set("to", newFilters.dateTo);
        else params.delete("to");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [filters, searchParams, pathname, router, currentYear, currentQuarter],
  );

  // Draft state for the filter sheet (applied on "Apply")
  const [draftFilters, setDraftFilters] = useState<WorkLogFiltersType>(() => {
    const monthParam = searchParams.get("month");
    return {
      year: parseInt(searchParams.get("year") ?? "") || currentYear,
      quarter: parseInt(searchParams.get("quarter") ?? "") || currentQuarter,
      selectedUserId: searchParams.get("user") ?? undefined,
      departmentId: searchParams.get("dept") ?? undefined,
      month: monthParam !== null ? parseInt(monthParam) : undefined,
      dateFrom: searchParams.get("from") ?? undefined,
      dateTo: searchParams.get("to") ?? undefined,
    };
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

  const { data: employeesRaw } = useHrEmployees(isAdminOrCeo ? undefined : undefined);
  const { data: departments } = useHrDepartments();

  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );

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

  const joiningYear = useMemo(() => {
    if (!employees.length) return currentYear;
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

      const employeeName = selectedUserId && employees.length
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

  /* ─── Shared filter props passed to both filter components ─── */
  const sharedFilterProps = {
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
  };

  return (
    <PageWrapper
      title="Work Logs"
      subtitle={
        selectedUserId && employees.length
          ? `Viewing logs for ${employees.find((e) => e.id === selectedUserId)?.firstName ?? "employee"} ${employees.find((e) => e.id === selectedUserId)?.lastName ?? ""}.`
          : "Track your daily tasks and activities."
      }
      actions={
        <WorkLogFilterActions
          {...sharedFilterProps}
          onExport={handleExportWorkLogs}
        />
      }
      filters={
        <WorkLogFiltersPanel
          {...sharedFilterProps}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      }
    >
      <div className="space-y-4">
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
              const displayDays = searchTerm.trim() ? filteredDays : group.days;

              return (
                <WorkLogMonthGroup
                  key={group.monthKey}
                  monthKey={group.monthKey}
                  label={group.label}
                  allDays={group.days}
                  displayDays={displayDays}
                  isCollapsed={isCollapsed}
                  onToggle={toggleMonth}
                  filled={filled}
                  searchTerm={searchTerm}
                  logs={logs}
                  selectedUserId={selectedUserId}
                  isAdminOrCeo={isAdminOrCeo}
                  onSave={(date, content) => upsertLog.mutate({ date, description: content })}
                  isSaving={upsertLog.isPending}
                  onApprove={(logId) => updateStatus.mutate({ id: logId, status: "APPROVED" })}
                  onReject={(logId, reason) => updateStatus.mutate({ id: logId, status: "REJECTED", rejectionReason: reason })}
                  isUpdatingStatus={updateStatus.isPending}
                />
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
