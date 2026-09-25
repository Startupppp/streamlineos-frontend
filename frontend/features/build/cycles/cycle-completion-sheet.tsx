"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Cycle, Ticket } from "@/types/projects";

interface CycleCompletionSheetProps {
  cycle: Cycle | null;
  nextCycle?: Cycle;
  tickets: Ticket[];
  moveTo: "backlog" | "next";
  isPending: boolean;
  onMoveToChange: (value: "backlog" | "next") => void;
  onCancel: () => void;
  onConfirm: (targetCycleId: number | null) => void;
}

export function CycleCompletionSheet({ cycle, nextCycle, tickets, moveTo, isPending, onMoveToChange, onCancel, onConfirm }: CycleCompletionSheetProps) {
  const incompleteCount = cycle ? tickets.filter((ticket) => ticket.cycleId === cycle.id && ticket.status !== "DONE").length : 0;

  return (
    <Sheet open={cycle !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <SheetContent className="flex flex-col overflow-hidden p-0">
        <SheetHeader className="shrink-0 border-b px-6 py-5">
          <SheetTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-status-warning-ink" />Complete {cycle?.name ?? "cycle"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-4">
          {incompleteCount > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{incompleteCount} unfinished ticket{incompleteCount === 1 ? " remains" : "s remain"}. Choose where to move them before completing this cycle.</p>
              <Select value={moveTo} onValueChange={(value) => onMoveToChange(value as "backlog" | "next")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Move to backlog</SelectItem>
                  {nextCycle ? <SelectItem value="next">Move to {nextCycle.name}</SelectItem> : null}
                </SelectContent>
              </Select>
            </div>
          ) : <p className="text-sm text-muted-foreground">All tickets are complete. This cycle is ready to close.</p>}
        </SheetBody>
        <SheetFooter className="grid shrink-0 grid-cols-2 gap-2 border-t px-6 py-3">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <LoadingButton type="button" onClick={() => onConfirm(incompleteCount > 0 && moveTo === "next" ? nextCycle?.id ?? null : null)} isPending={isPending} loadingText="Completing...">Complete cycle</LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
