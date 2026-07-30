"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format, eachDayOfInterval, parse, isValid } from "date-fns";
import { useGetWorkLogs, useUpsertWorkLog, useHrMyLeaveRequests } from "@/hooks/api/hr";
import { useHrEmployees, useLegacyHrDepartments, unwrapEmployees } from "@/hooks/api/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import {
  WorkLogFilterActions,
  WorkLogFiltersPanel,
  type WorkLogFilters,
} from "@/features/hr/work-logs/work-log-filters";
import { WorkLogMonthGroup } from "@/features/hr/work-logs/work-log-month-group";
import {
  WorkLogDeptPromptCard,
  WorkLogLoadingCard,
  WorkLogErrorCard,
  WorkLogNoResultsCard,
  WorkLogTotalHoursCard,
} from "@/features/hr/work-logs/work-log-state-cards";
import { exportWorkLogsToXlsx } from "@/features/hr/work-logs/work-log-export";
import { useCan } from "@/hooks/api/access";

export default function WorkLogsPage() {
  const { data: session } = useSession();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const filters = useMemo<WorkLogFilters>(() => {
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
    (update: WorkLogFilters | ((prev: WorkLogFilters) => WorkLogFilters)) => {
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

  const [draftFilters, setDraftFilters] = useState<WorkLogFilters>(() => {
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

  const { year, quarter, selectedUserId } = filters;

  const canManageEmployees = useCan("hr:employees:manage");
  const canEditSavedWorkLogs = useCan("hr:attendance:manage");

  const { data: employeesRaw } = useHrEmployees({ limit: 100 });
  const { data: departments } = useLegacyHrDepartments();

  const allEmployees = useMemo(
    () => (canManageEmployees ? unwrapEmployees(employeesRaw) : []),
    [employeesRaw, canManageEmployees],
  );

  const employees = useMemo(
    () => allEmployees.filter((e) => e.id !== session?.user?.id && e.isActive !== false),
    [allEmployees, session?.user?.id],
  );

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
    const targetId = draftFilters.selectedUserId || session?.user?.id;
    const emp = allEmployees.find((e) => e.id === targetId);
    if (emp?.joiningDate) return new Date(emp.joiningDate).getFullYear();
    return currentYear;
  }, [allEmployees, draftFilters.selectedUserId, session?.user?.id, currentYear]);

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

  const { data: myLeaveData } = useHrMyLeaveRequests();

  const approvedLeaveDates = useMemo<Set<string>>(() => {
    const dateSet = new Set<string>();
    const requests =
      (myLeaveData as { requests?: { status: string; startDate: string; endDate: string }[] } | undefined)?.requests ?? [];
    const todayStr = format(new Date(), "yyyy-MM-dd");
    for (const req of requests) {
      if (req.status !== "APPROVED") continue;
      if (req.startDate <= todayStr && req.endDate >= todayStr) {
        dateSet.add(todayStr);
      }
    }
    return dateSet;
  }, [myLeaveData]);

  const { data: logs, isLoading, isError, refetch } = useGetWorkLogs({
    year,
    quarter,
    ...(selectedUserId ? { userId: selectedUserId } : {}),
    ...(filters.month !== undefined ? { month: filters.month } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
  });

  const upsertLog = useUpsertWorkLog({
    onSuccess: () => { toast.success("Work log saved successfully"); },
    onError: () => { toast.error("Failed to save log"); },
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

  const totalHours = useMemo(
    () => Object.values(filledCounts).reduce((sum, count) => sum + count * 8, 0),
    [filledCounts],
  );

  const filterDay = useCallback(
    (date: Date) => {
      if (filters.month !== undefined && date.getMonth() !== filters.month) return false;
      const dateStr = format(date, "yyyy-MM-dd");
      if (filters.dateFrom && dateStr < filters.dateFrom) return false;
      if (filters.dateTo && dateStr > filters.dateTo) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      const log = logs?.find((l) => l.date === dateStr);
      const dateDisplay = format(date, "dd MMM yyyy EEEE").toLowerCase();
      if (dateDisplay.includes(term)) return true;
      const dateFormats = ["d MMM yyyy", "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "d MMMM yyyy"];
      for (const fmt of dateFormats) {
        const parsed = parse(term, fmt, new Date());
        if (isValid(parsed) && format(parsed, "yyyy-MM-dd") === dateStr) return true;
      }
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
    const leaveRequests = (
      (myLeaveData as { requests?: { status: string; startDate: string; endDate: string; reason?: string | null; leaveType?: { name: string } | null }[] } | undefined)?.requests ?? []
    ).filter((r) => r.status === "APPROVED");

    await exportWorkLogsToXlsx({
      days,
      logs,
      leaveRequests,
      selectedUserId,
      allEmployees,
      quarter,
      year,
      filterDay,
    });
  }, [days, logs, myLeaveData, selectedUserId, allEmployees, quarter, year, filterDay]);

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
    canManageEmployees,
  };

  const handleSaveLog = useCallback(
    (date: string, content: string, workLink: string) => {
      upsertLog.mutate({ date, description: content, workLink });
    },
    [upsertLog],
  );

  function handleRetryWorkLogs() {
    void refetch();
  }

  const handleClearSearch = useCallback(() => setSearchTerm(""), []);

  const subtitle = selectedUserId
    ? (() => {
        const emp = allEmployees.find((e) => e.id === selectedUserId);
        return emp
          ? `Viewing logs for ${emp.firstName ?? ""} ${emp.lastName ?? ""}.`.trim()
          : "Track your daily tasks and activities.";
      })()
    : "Track your daily tasks and activities.";

  return (
    <PageWrapper
      title="Work Logs"
      subtitle={subtitle}
      variant="display"
      actions={
        <WorkLogFilterActions {...sharedFilterProps} onExport={handleExportWorkLogs} />
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
        {filters.departmentId && !filters.selectedUserId ? (
          <WorkLogDeptPromptCard />
        ) : isLoading ? (
          <WorkLogLoadingCard />
        ) : isError ? (
          <WorkLogErrorCard onRetry={handleRetryWorkLogs} />
        ) : !hasSearchResults ? (
          <WorkLogNoResultsCard searchTerm={searchTerm} onClear={handleClearSearch} />
        ) : (
          <div className="space-y-3">
            {!isLoading && logs && totalHours > 0 && (
              <WorkLogTotalHoursCard totalHours={totalHours} quarter={quarter} year={year} />
            )}
            {monthGroups.map((group) => {
              const filteredDays = group.days.filter(filterDay);
              const hasActiveFilter =
                !!searchTerm.trim() ||
                filters.month !== undefined ||
                !!filters.dateFrom ||
                !!filters.dateTo;
              if (hasActiveFilter && filteredDays.length === 0) return null;

              const isCollapsed = collapsedMonths.has(group.monthKey);
              const filled = filledCounts[group.monthKey] ?? 0;
              const displayDays = hasActiveFilter ? filteredDays : group.days;

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
                  currentUserId={session?.user?.id}
                  readOnly={!!selectedUserId && selectedUserId !== session?.user?.id}
                  canEditSaved={canEditSavedWorkLogs}
                  approvedLeaveDates={approvedLeaveDates}
                  onSave={handleSaveLog}
                  isSaving={upsertLog.isPending}
                />
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
