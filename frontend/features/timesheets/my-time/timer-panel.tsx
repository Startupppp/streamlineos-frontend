"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Play, Pause, Square, Trash2, Timer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectTicketSelect } from "./project-ticket-select";
import {
  useActiveTimer,
  useStartTimer,
  usePauseTimer,
  useResumeTimer,
  useConvertTimer,
  useDiscardTimer,
  useTimesheetEntries,
} from "@/hooks/api/timesheets";
import { BILLING_TYPE_LABEL } from "@/features/timesheets";

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

interface TimerPanelProps {
  weekStart: string;
  weekEnd: string;
}

export function TimerPanel({ weekStart, weekEnd }: TimerPanelProps) {
  const { data: timer } = useActiveTimer();
  const startTimer = useStartTimer();
  const pauseTimer = usePauseTimer();
  const resumeTimer = useResumeTimer();
  const convertTimer = useConvertTimer();
  const discardTimer = useDiscardTimer();

  const { data: weekEntries } = useTimesheetEntries({ startDate: weekStart, endDate: weekEnd });

  const [displaySeconds, setDisplaySeconds] = useState(0);
  useEffect(() => {
    const base = timer?.elapsedSeconds ?? 0;
    setDisplaySeconds(base);
    if (timer?.status !== "RUNNING") return;
    const id = setInterval(() => setDisplaySeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timer?.elapsedSeconds, timer?.status]);

  const [startProject, setStartProject] = useState<number | null>(null);
  const [startTicket, setStartTicket] = useState<number | null>(null);
  const [startDesc, setStartDesc] = useState("");
  const [startBillable, setStartBillable] = useState(true);

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertDate, setConvertDate] = useState("");
  const [convertHours, setConvertHours] = useState("");
  const [convertBillable, setConvertBillable] = useState(true);
  const [convertDesc, setConvertDesc] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);

  const recentProjects = useMemo(() => {
    const seen = new Set<number>();
    const items: { projectId: number; name: string }[] = [];
    for (const e of weekEntries ?? []) {
      if (e.projectId && !seen.has(e.projectId)) {
        seen.add(e.projectId);
        items.push({ projectId: e.projectId, name: e.project?.name ?? "Project" });
        if (items.length >= 4) break;
      }
    }
    return items;
  }, [weekEntries]);

  const handleOpenConvert = useCallback(() => {
    if (!timer) return;
    setConvertDate(format(new Date(), "yyyy-MM-dd"));
    setConvertHours((timer.elapsedSeconds / 3600).toFixed(2));
    setConvertBillable(timer.billable);
    setConvertDesc(timer.description ?? "");
    setConvertOpen(true);
  }, [timer]);

  const handleConvertConfirm = useCallback(() => {
    if (!timer) return;
    convertTimer.mutate(
      {
        timerId: timer.id,
        data: {
          date: convertDate,
          hours: parseFloat(convertHours) || undefined,
          isBillable: convertBillable,
          description: convertDesc || undefined,
        },
      },
      { onSuccess: () => setConvertOpen(false) },
    );
  }, [timer, convertTimer, convertDate, convertHours, convertBillable, convertDesc]);

  const handlePause = useCallback(() => { if (timer) pauseTimer.mutate(timer.id); }, [timer, pauseTimer]);
  const handleResume = useCallback(() => { if (timer) resumeTimer.mutate(timer.id); }, [timer, resumeTimer]);
  const handleOpenDiscard = useCallback(() => setDiscardOpen(true), []);
  const handleCloseDiscard = useCallback(() => setDiscardOpen(false), []);
  const handleCloseConvert = useCallback(() => setConvertOpen(false), []);
  const handleConfirmDiscard = useCallback(() => {
    if (!timer) return;
    discardTimer.mutate(timer.id, { onSuccess: () => setDiscardOpen(false) });
  }, [timer, discardTimer]);

  const handleStart = useCallback(() => {
    startTimer.mutate(
      { projectId: startProject ?? undefined, ticketId: startTicket ?? undefined, description: startDesc || undefined, billable: startBillable },
      { onSuccess: () => setStartDesc("") },
    );
  }, [startTimer, startProject, startTicket, startDesc, startBillable]);

  const handleStartDescChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStartDesc(e.target.value), []);
  const handleStartBillableChange = useCallback((v: boolean) => setStartBillable(v), []);
  const handleConvertDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setConvertDate(e.target.value), []);
  const handleConvertHoursChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setConvertHours(e.target.value), []);
  const handleConvertBillableChange = useCallback((v: boolean) => setConvertBillable(v), []);
  const handleConvertDescChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setConvertDesc(e.target.value), []);

  const quickStartRef = useRef(startTimer);
  quickStartRef.current = startTimer;
  const handleQuickStart = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const id = parseInt(e.currentTarget.dataset.projectId ?? "0", 10);
    if (!id) return;
    quickStartRef.current.mutate({ projectId: id, billable: true });
  }, []);

  if (timer && timer.status !== "DISCARDED" && timer.status !== "CONVERTED" && timer.status !== "STOPPED") {
    const isRunning = timer.status === "RUNNING";
    return (
      <div className="space-y-4">
        <Card className="border-blue-500/30 bg-blue-50/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground font-medium mb-0.5">
                  {timer.project?.name ?? "No project"}
                  {timer.ticket && <span className="ml-1.5 text-muted-foreground/70">· #{timer.ticket.id}</span>}
                </p>
                <p className="text-sm text-foreground truncate">{timer.description ?? "No description"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    {timer.billable ? BILLING_TYPE_LABEL.BILLABLE : BILLING_TYPE_LABEL.NON_BILLABLE}
                  </Badge>
                  <Badge variant={isRunning ? "default" : "secondary"} className="text-[10px] h-4 px-1">
                    {isRunning ? "Running" : "Paused"}
                  </Badge>
                </div>
              </div>
              <div className="text-2xl font-mono font-semibold tabular-nums text-foreground shrink-0">
                {formatDuration(displaySeconds)}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {isRunning ? (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handlePause} disabled={pauseTimer.isPending}>
                  <Pause className="h-3 w-3" /> Pause
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleResume} disabled={resumeTimer.isPending}>
                  <Play className="h-3 w-3" /> Resume
                </Button>
              )}
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleOpenConvert}>
                <Square className="h-3 w-3" /> Stop &amp; Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive ml-auto" onClick={handleOpenDiscard}>
                <Trash2 className="h-3 w-3" /> Discard
              </Button>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard timer?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the running timer without saving any time. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDiscard}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDiscard} className="bg-destructive hover:bg-destructive/90">
                {discardTimer.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Discard"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">Save time entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={convertDate} onChange={handleConvertDateChange} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hours</Label>
                <Input type="number" min="0.25" step="0.25" value={convertHours} onChange={handleConvertHoursChange} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input value={convertDesc} onChange={handleConvertDescChange} placeholder="What did you work on?" className="h-8 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={convertBillable} onCheckedChange={handleConvertBillableChange} />
                <Label className="text-xs">Billable</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={handleCloseConvert}>Cancel</Button>
              <Button size="sm" onClick={handleConvertConfirm} disabled={convertTimer.isPending}>
                {convertTimer.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save entry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Start timer</span>
          </div>
          <ProjectTicketSelect
            projectId={startProject}
            ticketId={startTicket}
            onProjectChange={setStartProject}
            onTicketChange={setStartTicket}
          />
          <Input
            value={startDesc}
            onChange={handleStartDescChange}
            placeholder="What are you working on?"
            className="h-8 text-sm"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={startBillable} onCheckedChange={handleStartBillableChange} />
              <Label className="text-xs">Billable</Label>
            </div>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleStart} disabled={startTimer.isPending}>
              {startTimer.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Start
            </Button>
          </div>
        </CardContent>
      </Card>

      {recentProjects.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground px-0.5">Recent projects</p>
          <div className="flex flex-wrap gap-1.5">
            {recentProjects.map((item) => (
              <button
                key={item.projectId}
                data-project-id={String(item.projectId)}
                onClick={handleQuickStart}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-card text-xs font-medium hover:bg-muted/50 transition-colors"
              >
                <Play className="h-2.5 w-2.5" />
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
