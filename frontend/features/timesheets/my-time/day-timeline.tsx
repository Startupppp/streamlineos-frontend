"use client";
import { memo, useCallback, useMemo, useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { Clock, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { LogTimeSheet } from "./log-time-sheet";
import { describeDayColumn } from "./day-label";
import { useTimesheetHolidays, useVoidTimesheetEntry } from "@/hooks/api/timesheets-core";
import {
  BILLING_TYPE_LABEL,
  ENTRY_STATUS_BADGE,
  type TimesheetEntry,
} from "@/features/timesheets";

interface DayTimelineProps {
  entries: TimesheetEntry[] | undefined;
  days: string[];
  weekStart: string;
  weekEnd: string;
}

interface EntryRowProps {
  entry: TimesheetEntry;
  onEdit: (entry: TimesheetEntry) => void;
  onVoid: (entry: TimesheetEntry) => void;
}

const EntryRow = memo(function EntryRow({ entry, onEdit, onVoid }: EntryRowProps) {
  const isLocked = !!entry.lockedAt || entry.status === "APPROVED";

  const handleEdit = useCallback(() => onEdit(entry), [onEdit, entry]);
  const handleVoid = useCallback(() => onVoid(entry), [onVoid, entry]);

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold tabular-nums text-foreground">{Number(entry.hours).toFixed(2)}h</span>
          {entry.project && (
            <TruncatedText text={entry.project.name} className="text-xs text-muted-foreground" />
          )}
          {entry.ticket && (
            <span className="text-dense text-muted-foreground/70">#{entry.ticket.ticketNumber}</span>
          )}
        </div>
        {entry.description && (
          <TruncatedText text={entry.description} className="text-xs text-muted-foreground mt-0.5" />
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <Badge variant="outline" className={cn("text-micro h-4 px-1.5 border", ENTRY_STATUS_BADGE[entry.status])}>
            {entry.status.charAt(0) + entry.status.slice(1).toLowerCase()}
          </Badge>
          <Badge variant="outline" className="text-micro h-4 px-1.5 border-border text-muted-foreground">
            {BILLING_TYPE_LABEL[entry.billingType]}
          </Badge>
          {isLocked && (
            <span className="text-micro text-muted-foreground/60">Locked</span>
          )}
        </div>
      </div>
      {!isLocked && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Edit time entry" onClick={handleEdit}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <AnimatedIconButton
            icon={Trash2Icon}
            iconSize={12}
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            aria-label="Void time entry"
            onClick={handleVoid}
          />
        </div>
      )}
    </div>
  );
});

export function DayTimeline({ entries, days, weekStart, weekEnd }: DayTimelineProps) {
  /**
   * Same query key as the week grid's, so this is a cache read rather than a
   * second request. A holiday that disappears when you switch from Week to Day
   * is a holiday the org does not really have.
   */
  const { data: holidayData } = useTimesheetHolidays(weekStart, weekEnd);
  const holidayByDate = useMemo(
    () => new Map((holidayData?.holidays ?? []).map((h) => [h.date, h.name])),
    [holidayData],
  );

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultDay = days.includes(today) ? today : (days[0] ?? "");
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [logOpen, setLogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimesheetEntry | undefined>();
  const [voidEntry, setVoidEntry] = useState<TimesheetEntry | undefined>();
  const [voidOpen, setVoidOpen] = useState(false);

  const voidMutation = useVoidTimesheetEntry();

  const dayEntries = useMemo(
    () => (entries ?? []).filter((e) => e.date === selectedDay),
    [entries, selectedDay],
  );

  const dayTotal = useMemo(
    () => dayEntries.reduce((sum, e) => sum + Number(e.hours), 0),
    [dayEntries],
  );

  const handleDaySelect = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedDay(e.currentTarget.dataset.day ?? "");
  }, []);

  const handleLogOpen = useCallback(() => {
    setEditEntry(undefined);
    setLogOpen(true);
  }, []);

  const handleEdit = useCallback((entry: TimesheetEntry) => {
    setEditEntry(entry);
    setLogOpen(true);
  }, []);

  const handleVoidRequest = useCallback((entry: TimesheetEntry) => {
    setVoidEntry(entry);
    setVoidOpen(true);
  }, []);

  const handleVoidClose = useCallback(() => setVoidOpen(false), []);

  const handleVoidConfirm = useCallback(() => {
    if (!voidEntry) return;
    voidMutation.mutate(
      { entryId: voidEntry.id, reason: "Voided by user" },
      { onSuccess: () => { setVoidOpen(false); setVoidEntry(undefined); } },
    );
  }, [voidEntry, voidMutation]);

  const handleLogClose = useCallback((open: boolean) => {
    setLogOpen(open);
    if (!open) setEditEntry(undefined);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 flex-wrap">
        {days.map((d) => {
          const dayEntryCount = (entries ?? []).filter((e) => e.date === d).length;
          const active = d === selectedDay;
          const todayDay = isToday(parseISO(d));
          const holiday = holidayByDate.get(d);
          return (
            <button
              key={d}
              type="button"
              data-day={d}
              aria-pressed={active}
              aria-label={describeDayColumn(d, holiday)}
              onClick={handleDaySelect}
              className={cn(
                "flex flex-col items-center px-3 py-1.5 rounded-lg border text-xs transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary/50 hover:bg-muted/40 text-foreground",
                todayDay && !active && "border-primary/60",
                holiday && !active && "bg-muted/60",
              )}
            >
              <span className="font-medium">{format(parseISO(d), "EEE")}</span>
              <span className={cn("text-micro", active ? "text-background/70" : "text-muted-foreground")}>
                {format(parseISO(d), "d")}
              </span>
              {dayEntryCount > 0 && (
                <span className={cn("mt-0.5 h-1 w-1 rounded-full", active ? "bg-background/70" : "bg-primary")} />
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {format(parseISO(selectedDay), "EEEE, MMM d")}
            </span>
            {dayTotal > 0 && (
              <span className="text-xs font-semibold tabular-nums text-foreground">{dayTotal.toFixed(1)}h</span>
            )}
          </div>
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleLogOpen}
          >
            Log time
          </AnimatedIconButton>
        </div>

        {dayEntries.length === 0 ? (
          <EmptyState
            illustrationPreset="activity"
            title="No time logged"
            description="No entries for this day. Log your first entry."
            compact
            action={{ label: "Log time", onClick: handleLogOpen }}
          />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {dayEntries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} onEdit={handleEdit} onVoid={handleVoidRequest} />
            ))}
          </div>
        )}
      </div>

      <LogTimeSheet
        open={logOpen}
        onOpenChange={handleLogClose}
        defaultDate={selectedDay}
        entry={editEntry}
      />

      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {voidEntry ? `${Number(voidEntry.hours).toFixed(2)}h` : "the"} time entry. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleVoidClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoidConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={voidMutation.isPending}
            >
              Void entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
