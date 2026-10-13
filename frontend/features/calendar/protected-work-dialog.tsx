"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCalendarProtectedWork, useCalendarProtectedWorkSuggestions, useMoveCalendarProtectedWork, useRegisterCalendarProtectedWork, useUndoCalendarProtectedWork } from "@/hooks/api/calendar-protected-work";

export function ProtectedWorkDialog({
  eventId,
  eventStart,
  eventEnd,
  open,
  onClose,
}: {
  eventId: number;
  eventStart: Date;
  eventEnd: Date;
  open: boolean;
  onClose: () => void;
}) {
  const [deadline, setDeadline] = useState("");
  const [estimateMinutes, setEstimateMinutes] = useState(Math.max(15, Math.round((eventEnd.getTime() - eventStart.getTime()) / 60_000)));
  const [priority, setPriority] = useState(50);
  const [locked, setLocked] = useState(false);
  const [maxMovesPerDay, setMaxMovesPerDay] = useState(2);
  const [maxDailyMinutes, setMaxDailyMinutes] = useState(360);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const workQuery = useCalendarProtectedWork(open);
  const register = useRegisterCalendarProtectedWork();
  const move = useMoveCalendarProtectedWork();
  const undo = useUndoCalendarProtectedWork();
  const work = workQuery.data?.find((item) => item.eventId === eventId);
  const suggestions = useCalendarProtectedWorkSuggestions(work?.id ?? null, open && showSuggestions);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedDeadline = new Date(deadline);
    if (!Number.isFinite(parsedDeadline.getTime()) || parsedDeadline <= eventEnd) {
      toast.error("Choose a deadline after this work block ends");
      return;
    }
    try {
      await register.mutateAsync({
        eventId,
        deadline: parsedDeadline.toISOString(),
        estimateMinutes,
        priority,
        locked,
        maxMovesPerDay,
        maxDailyMinutes,
      });
      toast.success("Protected work registered");
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const undoLastMove = async () => {
    if (!work) return;
    try {
      await undo.mutateAsync({
        protectedWorkId: work.id,
        expectedVersion: work.version,
        expectedEventVersion: work.eventVersion,
      });
      toast.success("Previous time restored");
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const moveTo = async (start: string, end: string) => {
    if (!work) return;
    try {
      await move.mutateAsync({
        protectedWorkId: work.id,
        expectedVersion: work.version,
        expectedEventVersion: work.eventVersion,
        start,
        end,
      });
      toast.success("Protected work moved");
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Protected work</DialogTitle></DialogHeader>
        {workQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading protected work</p> :
          workQuery.isError ? <div className="space-y-2"><p className="text-sm text-destructive">{getErrorMessage(workQuery.error)}</p><Button variant="outline" onClick={() => { void workQuery.refetch(); }}>Retry</Button></div> :
          work ? <div className="space-y-3 text-sm">
            <p>Deadline: {new Date(work.deadline).toLocaleString()}</p>
            <p>Estimate: {work.estimateMinutes} minutes</p>
            <p>Priority: {work.priority}</p>
            <p>{work.locked ? "Locked in place" : `${Math.max(0, work.maxMovesPerDay - work.movesToday)} moves left today`}</p>
            <p>Daily protected work limit: {work.maxDailyMinutes} minutes</p>
            {work.moveReason && work.priorStart ? <p>Last move: {work.moveReason.replaceAll("_", " ")} from {new Date(work.priorStart).toLocaleString()}</p> : null}
            {work.undoUntil && new Date(work.undoUntil) > new Date() && work.priorStart ?
              <Button variant="outline" disabled={undo.isPending} onClick={() => { void undoLastMove(); }}>Undo last move</Button> : null}
            {!work.locked ? <Button variant="outline" onClick={() => setShowSuggestions(true)}>Find another time</Button> : null}
            {showSuggestions && suggestions.isLoading ? <p className="text-muted-foreground">Checking available times</p> : null}
            {showSuggestions && suggestions.isError ? <div className="space-y-2"><p className="text-destructive">{getErrorMessage(suggestions.error)}</p><Button variant="outline" onClick={() => { void suggestions.refetch(); }}>Retry</Button></div> : null}
            {showSuggestions && suggestions.data ? <div className="space-y-2">
              {suggestions.data.coverageState === "partial" ? <p className="text-amber-700">Some calendar sources are incomplete. Only fully checked slots appear here.</p> : null}
              {suggestions.data.slots.length === 0 ? <p>No safe time was found in the checked window.</p> : null}
              {suggestions.data.slots.map((slot) => <Button key={slot.start} variant="outline" disabled={move.isPending} className="w-full justify-start" onClick={() => { void moveTo(slot.start, slot.end); }}>Move to {new Date(slot.start).toLocaleString()}</Button>)}
              {suggestions.data.horizonTruncated ? <p className="text-muted-foreground">The search covered up to seven days or the first five available times.</p> : null}
            </div> : null}
          </div> :
          <form onSubmit={(event) => { void submit(event); }} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="protected-work-deadline">Deadline</Label><Input id="protected-work-deadline" type="datetime-local" required value={deadline} onChange={(event) => setDeadline(event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="protected-work-estimate">Estimated minutes</Label><Input id="protected-work-estimate" type="number" min={1} max={1440} required value={estimateMinutes} onChange={(event) => setEstimateMinutes(Number(event.target.value))} /></div>
            <div className="space-y-1.5"><Label htmlFor="protected-work-priority">Priority (0 to 100)</Label><Input id="protected-work-priority" type="number" min={0} max={100} required value={priority} onChange={(event) => setPriority(Number(event.target.value))} /></div>
            <div className="space-y-1.5"><Label htmlFor="protected-work-moves">Maximum moves per day</Label><Input id="protected-work-moves" type="number" min={0} max={20} required value={maxMovesPerDay} onChange={(event) => setMaxMovesPerDay(Number(event.target.value))} /></div>
            <div className="space-y-1.5"><Label htmlFor="protected-work-load">Maximum protected minutes per day</Label><Input id="protected-work-load" type="number" min={15} max={1440} required value={maxDailyMinutes} onChange={(event) => setMaxDailyMinutes(Number(event.target.value))} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={locked} onChange={(event) => setLocked(event.target.checked)} />Lock this time block</label>
            <Button type="submit" disabled={register.isPending}>Protect time</Button>
          </form>}
      </DialogContent>
    </Dialog>
  );
}
