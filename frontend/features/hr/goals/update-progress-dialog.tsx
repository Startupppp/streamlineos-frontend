"use client";

import { type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HrGoal } from "@/hooks/api/hr";

interface UpdateProgressDialogProps {
  goal: HrGoal | null;
  progressValue: number;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onRangeChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onNumberChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}

export function UpdateProgressDialog({
  goal,
  progressValue,
  isPending,
  onOpenChange,
  onRangeChange,
  onNumberChange,
  onSave,
}: UpdateProgressDialogProps) {
  return (
    <Dialog open={!!goal} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
        </DialogHeader>
        {goal && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">{goal.title}</p>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Progress: {progressValue}%
              </Label>
              <input
                type="range"
                min={0}
                max={100}
                value={progressValue}
                onChange={onRangeChange}
                className="w-full"
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={progressValue}
                onChange={onNumberChange}
              />
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <LoadingButton
              className="w-full"
              onClick={onSave}
              isPending={isPending}
              loadingText="Saving…"
            >
              Save Progress
            </LoadingButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
