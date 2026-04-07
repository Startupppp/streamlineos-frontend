"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { SprintData } from "./sprint-card";

interface CompleteSprintSheetProps {
  sprint: SprintData | null;
  nextPlannedSprint: SprintData | undefined;
  moveToOption: string;
  isUpdating: boolean;
  onMoveToChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CompleteSprintSheet({
  sprint,
  nextPlannedSprint,
  moveToOption,
  isUpdating,
  onMoveToChange,
  onCancel,
  onConfirm,
}: CompleteSprintSheetProps) {
  const incompleteCount = sprint
    ? (sprint.tickets || []).filter((t) => t.status !== "DONE").length
    : 0;

  return (
    <Sheet open={!!sprint} onOpenChange={(open) => !open && onCancel()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Complete Sprint: {sprint?.name}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          {incompleteCount > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {incompleteCount} ticket{incompleteCount > 1 ? "s are" : " is"} not done. Where should they go?
              </p>
              <Select value={moveToOption} onValueChange={onMoveToChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Move to Backlog</SelectItem>
                  {nextPlannedSprint && (
                    <SelectItem value="next">Move to {nextPlannedSprint.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">All tickets are done! Ready to complete this sprint.</p>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm} disabled={isUpdating}>
            {isUpdating ? "Completing..." : "Complete Sprint"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
