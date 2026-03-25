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
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronRight, Search, Save, X, Users, Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";

export default function WorkLogsPage() {
  const { data: session } = useSession();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  const [year, setYear] = useState<number>(currentYear);
  const [quarter, setQuarter] = useState<number>(currentQuarter);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);

  const isAdminOrCeo = session?.user?.role === "CEO" || session?.user?.role === "HR" || session?.user?.role === "ADMIN";

  const { data: employees } = api.hr.getEmployees.useQuery(undefined, {
    enabled: isAdminOrCeo,
  });

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

  // Search filtering: match by keyword in description or by date
  const filterDay = useCallback(
    (date: Date) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      const dateStr = format(date, "yyyy-MM-dd");
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
    [searchTerm, logs],
  );

  const hasSearchResults = useMemo(() => {
    if (!searchTerm.trim()) return true;
    return days.some(filterDay);
  }, [days, filterDay, searchTerm]);

  return (
    <div className="space-y-3 sm:space-y-4 overflow-x-hidden">
      <PageHeader
        title="Work Logs"
        description={
          selectedUserId && employees
            ? `Viewing logs for ${employees.find((e) => e.id === selectedUserId)?.firstName ?? "employee"} ${employees.find((e) => e.id === selectedUserId)?.lastName ?? ""}.`
            : "Track your daily tasks and activities."
        }
        actions={
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {isAdminOrCeo && employees && employees.length > 0 && (
              <Select
                value={selectedUserId || "self"}
                onValueChange={(v) => setSelectedUserId(v === "self" ? undefined : v)}
              >
                <SelectTrigger className="w-[140px] sm:w-[180px] md:w-[200px] h-9" aria-label="Select employee">
                  <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">My Logs</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-[90px] sm:w-[100px] md:w-[120px] h-9" aria-label="Select year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] md:w-[180px] h-9" aria-label="Select quarter">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Q1 (Jan - Mar)</SelectItem>
                <SelectItem value="2">Q2 (Apr - Jun)</SelectItem>
                <SelectItem value="3">Q3 (Jul - Sep)</SelectItem>
                <SelectItem value="4">Q4 (Oct - Dec)</SelectItem>
              </SelectContent>
            </Select>
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
              onClick={() => {
                const reason = window.prompt("Rejection reason (optional):");
                if (reason !== null) {
                  onReject?.(reason || undefined);
                }
              }}
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
  );
}
