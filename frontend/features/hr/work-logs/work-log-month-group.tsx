"use client";

import { format, isWeekend, isToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDownIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { WorkLogEntryRow } from "./work-log-entry-row";
import { TruncatedText } from "@/components/ui/truncated-text";

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
  /** Managers/HR can edit already-saved entries for today */
  canEditSaved: boolean;
  approvedLeaveDates?: Set<string>;
  currentUserId?: string;
  onSave: (date: string, content: string, workLink: string) => void;
  isSaving: boolean;
}

function hasSavedContent(log: WorkLog | undefined): boolean {
  return Boolean(log?.description?.trim() || log?.workLink?.trim());
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
  canEditSaved,
  approvedLeaveDates,
  currentUserId,
  onSave,
  isSaving,
}: WorkLogMonthGroupProps) {
  const weekdays = allDays.filter((d) => !isWeekend(d)).length;
  const regionId = `month-content-${monthKey}`;
  const totalHours = filled * 8;
  const progress = weekdays > 0 ? Math.min(100, Math.round((filled / weekdays) * 100)) : 0;
  const { iconRef: chevronRef, hoverHandlers: chevronHoverHandlers } = useAnimatedIcon();

  const handleToggle = () => onToggle(monthKey);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle(monthKey);
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)]">
      <CardHeader
        className={cn(
          "sticky top-0 z-10 cursor-pointer select-none border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur-sm",
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/70">
              {isCollapsed ? (
                <ChevronRightIcon ref={chevronRef} size={16} className="text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronDownIcon ref={chevronRef} size={16} className="text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-foreground">
                <TruncatedText text={label} />
              </CardTitle>
              {!searchTerm.trim() && weekdays > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-300",
                        progress === 100 ? "bg-status-success-fill" : progress > 0 ? "bg-primary" : "bg-muted-foreground/30",
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-micro font-medium tabular-nums text-muted-foreground">
                    {progress}%
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!searchTerm.trim() && filled > 0 && (
              <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-micro font-semibold tabular-nums text-muted-foreground">
                {totalHours}h
              </span>
            )}
            <span className="rounded-md bg-muted/60 px-2 py-1 text-dense font-semibold uppercase tracking-wide text-muted-foreground">
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
          className="px-3 py-3 sm:px-4"
        >
          <div className="space-y-1.5">
            {displayDays.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const log = logs?.find((l) => l.date === dateStr);
              const isOwnLog = !log?.userId || !currentUserId || log.userId === currentUserId;
              const isLeaveDay = approvedLeaveDates?.has(dateStr) ?? false;
              const saved = hasSavedContent(log);
              const baseBlocked = readOnly || !isOwnLog || !isToday(date) || isLeaveDay;
              // Empty today → editable. Saved → only managers/HR can edit.
              const rowReadOnly = baseBlocked || (saved && !canEditSaved);

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
                  readOnly={rowReadOnly}
                  lockedSaved={saved && rowReadOnly && !baseBlocked}
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
