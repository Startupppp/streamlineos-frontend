"use client";
import { useCallback, useMemo, useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { Clock, Edit2, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { LogTimeSheet } from "./log-time-sheet";
import { useVoidTimesheetEntry } from "@/hooks/api/timesheets";
import {
  BILLING_TYPE_LABEL,
  ENTRY_STATUS_BADGE,
  type TimesheetEntry,
} from "@/features/timesheets";

interface DayTimelineProps {
  entries: TimesheetEntry[] | undefined;
  days: string[];
}

interface EntryRowProps {
  entry: TimesheetEntry;
  onEdit: (entry: TimesheetEntry) => void;
  onVoid: (entry: TimesheetEntry) => void;
}

function EntryRow({ entry, onEdit, onVoid }: EntryRowProps) {
  const isLocked = !!entry.lockedAt || entry.status === "APPROVED";

  const handleEdit = useCallback(() => onEdit(entry), [onEdit, entry]);
  const handleVoid = useCallback(() => onVoid(entry), [onVoid, entry]);

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold tabular-nums text-foreground">{Number(entry.hours).toFixed(2)}h</span>
          {entry.project && (
            <span className="text-xs text-muted-foreground truncate">{entry.project.name}</span>
          )}
          {entry.ticket && (
            <span className="text-[11px] text-muted-foreground/70">#{entry.ticket.ticketNumber}</span>
          )}
        </div>
        {entry.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{entry.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border", ENTRY_STATUS_BADGE[entry.status])}>
            {entry.status.charAt(0) + entry.status.slice(1).toLowerCase()}
          </Badge>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-border text-muted-foreground">
            {BILLING_TYPE_LABEL[entry.billingType]}
          </Badge>
          {isLocked && (
            <span className="text-[10px] text-muted-foreground/60">Locked</span>
          )}
        </div>
      </div>
      {!isLocked && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEdit}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={handleVoid}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function DayTimeline({ entries, days }: DayTimelineProps) {
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
          return (
            <button
              key={d}
              data-day={d}
              onClick={handleDaySelect}
              className={cn(
                "flex flex-col items-center px-3 py-1.5 rounded-lg border text-xs transition-colors",
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border hover:border-blue-500/50 hover:bg-muted/40 text-foreground",
                todayDay && !active && "border-blue-500/60",
              )}
            >
              <span className="font-medium">{format(parseISO(d), "EEE")}</span>
              <span className={cn("text-[10px]", active ? "text-background/70" : "text-muted-foreground")}>
                {format(parseISO(d), "d")}
              </span>
              {dayEntryCount > 0 && (
                <span className={cn("mt-0.5 h-1 w-1 rounded-full", active ? "bg-background/70" : "bg-accent")} />
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
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleLogOpen}>
            <Plus className="h-3.5 w-3.5" /> Log time
          </Button>
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
