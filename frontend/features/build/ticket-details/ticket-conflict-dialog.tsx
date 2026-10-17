"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import type { TicketConflictFieldDiff } from "./ticket-conflict-diff";

interface TicketConflictDialogProps {
  open: boolean;
  fields: TicketConflictFieldDiff[];
  isReapplying?: boolean;
  onKeepMine: () => void;
  onDiscard: () => void;
}

export function TicketConflictDialog({
  open,
  fields,
  isReapplying = false,
  onKeepMine,
  onDiscard,
}: TicketConflictDialogProps) {
  const canUpdate = useCan("build:tickets:update");

  function handleOpenChange(next: boolean) {
    if (!next) onDiscard();
  }

  function renderField(field: TicketConflictFieldDiff) {
    return (
      <li key={field.key} className="rounded-md border border-border p-3">
        <p className="text-sm font-medium text-foreground">{field.label}</p>
        <dl className="mt-2 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <dt className="text-label text-muted-foreground">On the server now</dt>
            <dd className="break-words text-sm text-foreground">{field.serverValue}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-label text-muted-foreground">Your edit</dt>
            <dd className="break-words text-sm text-foreground">{field.pendingValue}</dd>
          </div>
        </dl>
      </li>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>This issue changed while you were editing</DialogTitle>
          <DialogDescription>
            Your edit was not saved. Compare what is on the server now with what you typed,
            then choose which one to keep.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ul className="flex flex-col gap-2">{fields.map(renderField)}</ul>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDiscard}>
            Discard my changes
          </Button>
          {canUpdate ? (
            <LoadingButton type="button" isPending={isReapplying} onClick={onKeepMine}>
              Keep my changes
            </LoadingButton>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
