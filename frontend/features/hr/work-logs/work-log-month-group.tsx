"use client";

import { format, isWeekend, isToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDownIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { WorkLogEntryRow } from "./work-log-entry-row";

interface WorkLog {
  id: number;
  userId?: string | null;
  date: string;
  description?: string | null;
  workLink?: string | null;
  status?: string | null;
  ticket?: {
    id: number;
    title: string;
    ticketNumber: number;
    project?: { id: number; name: string; key: string } | null;
  } | null;
}

interface WorkLogMonthGroupProps {
  monthKey: string;
  label: string;
  allDays: Date[];
  displayDays: Date[];
  isCollapsed: boolean;
  onToggle: (monthKey: string) => void;
  filled: number;
  searchTerm: string;
  logs: WorkLog[] | undefined;
  readOnly: boolean;
  approvedLeaveDates?: Set<string>;
  currentUserId?: string;
  onSave: (date: string, content: string, workLink: string) => void;
  isSaving: boolean;
}

export function WorkLogMonthGroup({
  monthKey,
  label,
  allDays,
  displayDays,
  isCollapsed,
  onToggle,
  filled,
  searchTerm,
  logs,
  readOnly,
  approvedLeaveDates,
  currentUserId,
  onSave,
  isSaving,
}: WorkLogMonthGroupProps) {
  const weekdays = allDays.filter((d) => !isWeekend(d)).length;
  const regionId = `month-content-${monthKey}`;
  const totalHours = filled * 8;
  const { iconRef: chevronRef, hoverHandlers: chevronHoverHandlers } = useAnimatedIcon();

  const handleToggle = () => onToggle(monthKey);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle(monthKey);
    }
  };

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardHeader
        className={cn(
          "cursor-pointer select-none sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border/60 py-3 px-4",
          !isCollapsed && "shadow-sm",
        )}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-controls={regionId}
        onKeyDown={handleKeyDown}
        {...chevronHoverHandlers}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              {isCollapsed ? (
                <ChevronRightIcon ref={chevronRef} size={16} className="text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronDownIcon ref={chevronRef} size={16} className="text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <CardTitle className="text-sm font-semibold text-foreground truncate">{label}</CardTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!searchTerm.trim() && filled > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700 font-mono tabular-nums">
                {totalHours}h
              </span>
            )}
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              {searchTerm.trim()
                ? `${displayDays.length} match${displayDays.length !== 1 ? "es" : ""}`
                : `${filled}/${weekdays} logged`}
            </span>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent
          id={regionId}
          role="region"
          aria-label={`Work logs for ${label}`}
          className="px-3 sm:px-4 py-3 sm:py-4"
        >
          <div className="space-y-2 sm:space-y-3">
            {displayDays.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const log = logs?.find((l) => l.date === dateStr);
              const isOwnLog = !log?.userId || !currentUserId || log.userId === currentUserId;
              const isLeaveDay = approvedLeaveDates?.has(dateStr) ?? false;
              return (
                <WorkLogEntryRow
                  key={dateStr}
                  date={date}
                  initialContent={log?.description ?? ""}
                  initialWorkLink={log?.workLink ?? ""}
                  ticket={log?.ticket}
                  onSave={(content, workLink) => onSave(dateStr, content, workLink)}
                  isSaving={isSaving}
                  searchTerm={searchTerm}
                  readOnly={readOnly || !isOwnLog || !isToday(date) || isLeaveDay}
                  status={log?.status ?? undefined}
                />
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
