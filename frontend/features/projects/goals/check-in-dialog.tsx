"use client";

import { useState, type ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCheckIn, type KeyResult } from "@/hooks/api/goals";
import { formatMetricValue } from "./constants";
import { getErrorMessage } from "@/lib/get-error-message";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";

interface CheckInDialogProps {
  goalId: number;
  keyResult: KeyResult;
  onClose: () => void;
}

export function CheckInDialog({ goalId, keyResult, onClose }: CheckInDialogProps) {
  const [newValue, setNewValue] = useState(keyResult.currentValue);
  const [note, setNote] = useState("");
  const checkIn = useCheckIn(goalId);

  function handleNewValueChange(e: ChangeEvent<HTMLInputElement>) {
    setNewValue(e.target.value);
  }

  function handleNoteChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setNote(e.target.value);
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function handleSubmit() {
    const parsed = Number(newValue);
    if (Number.isNaN(parsed)) {
      toast.error("Enter a valid number");
      return;
    }
    checkIn.mutate(
      { keyResultId: keyResult.id, newValue: parsed, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Check-in recorded");
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={TEXT_ONE_LINE}>Check in — {keyResult.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="check-in-value">New current value</Label>
            <Input
              id="check-in-value"
              type="number"
              value={newValue}
              onChange={handleNewValueChange}
            />
            <p className="text-xs text-muted-foreground">
              Target:{" "}
              {formatMetricValue(keyResult.targetValue, keyResult.metricType, keyResult.unit)}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="check-in-note">Note (optional)</Label>
            <Textarea
              id="check-in-note"
              rows={2}
              className="resize-none"
              value={note}
              onChange={handleNoteChange}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton onClick={handleSubmit} isPending={checkIn.isPending} loadingText="Saving…">
            Record Check-in
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
