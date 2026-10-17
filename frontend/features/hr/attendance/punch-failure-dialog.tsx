"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { statusToneClasses } from "@/lib/design-tokens";
import { punchFailureTitle } from "./punch-failure";
import type { PunchFailure } from "./use-attendance-timer";

interface PunchFailureDialogProps {
  failure: PunchFailure | null;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onRequestWfh?: () => void;
  onRequestRegularization?: () => void;
}

export function PunchFailureDialog({
  failure,
  onOpenChange,
  onRetry,
  onRequestWfh,
  onRequestRegularization,
}: PunchFailureDialogProps) {
  const tone = statusToneClasses("danger");

  return (
    <Dialog open={failure !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {failure ? punchFailureTitle(failure.kind) : "Check-in failed"}
          </DialogTitle>
          <DialogDescription>
            Your punch was not recorded. Nothing has been saved for this attempt.
          </DialogDescription>
        </DialogHeader>

        {failure ? (
          <p
            className={`rounded-lg border p-3 text-dense ${tone.surface} ${tone.rule} ${tone.ink}`}
          >
            {failure.message}
          </p>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {failure?.kind === "geofence" && onRequestWfh ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={onRequestWfh}
            >
              Request WFH
            </Button>
          ) : null}
          {onRequestRegularization ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={onRequestRegularization}
            >
              Request regularisation
            </Button>
          ) : null}
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            onClick={onRetry}
          >
            Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
