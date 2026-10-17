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
import type { ProjectWebhook } from "@/hooks/api/build/webhooks";

export interface WebhookConflictPatch {
  url?: string;
  events?: string[];
  isActive?: boolean;
}

export interface WebhookConflictField {
  key: string;
  label: string;
  serverValue: string;
  pendingValue: string;
}

type ServerWebhook = Pick<ProjectWebhook, "url" | "events" | "isActive">;

function formatEvents(events: string[]): string {
  return events.length === 0 ? "None" : [...events].sort().join(", ");
}

function formatEnabled(isActive: boolean): string {
  return isActive ? "Enabled" : "Disabled";
}

export function diffWebhookConflictFields(
  patch: WebhookConflictPatch,
  server: ServerWebhook,
): WebhookConflictField[] {
  const fields: WebhookConflictField[] = [];
  if (patch.url !== undefined && patch.url !== server.url) {
    fields.push({
      key: "url",
      label: "Payload URL",
      serverValue: server.url,
      pendingValue: patch.url,
    });
  }
  if (
    patch.events !== undefined &&
    formatEvents(patch.events) !== formatEvents(server.events)
  ) {
    fields.push({
      key: "events",
      label: "Events",
      serverValue: formatEvents(server.events),
      pendingValue: formatEvents(patch.events),
    });
  }
  if (patch.isActive !== undefined && patch.isActive !== server.isActive) {
    fields.push({
      key: "isActive",
      label: "Active",
      serverValue: formatEnabled(server.isActive),
      pendingValue: formatEnabled(patch.isActive),
    });
  }
  return fields;
}

interface WebhookConflictDialogProps {
  open: boolean;
  fields: WebhookConflictField[];
  isReapplying: boolean;
  onKeepMine: () => void;
  onDiscard: () => void;
}

export function WebhookConflictDialog({
  open,
  fields,
  isReapplying,
  onKeepMine,
  onDiscard,
}: WebhookConflictDialogProps) {
  function handleOpenChange(next: boolean) {
    if (!next) onDiscard();
  }

  function renderField(field: WebhookConflictField) {
    return (
      <li key={field.key} className="rounded-md border border-border p-3">
        <p className="text-sm font-medium text-foreground">{field.label}</p>
        <dl className="mt-2 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <dt className="text-label text-muted-foreground">
              On the server now
            </dt>
            <dd className="break-words text-sm text-foreground">
              {field.serverValue}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-label text-muted-foreground">Your edit</dt>
            <dd className="break-words text-sm text-foreground">
              {field.pendingValue}
            </dd>
          </div>
        </dl>
      </li>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            This webhook changed while you were editing
          </DialogTitle>
          <DialogDescription>
            Your change was not saved. Compare what is on the server now with
            what you submitted, then choose which one to keep.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              The webhook was changed by someone else, but not in any field you
              submitted.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">{fields.map(renderField)}</ul>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDiscard}>
            Discard my changes
          </Button>
          <LoadingButton
            type="button"
            isPending={isReapplying}
            onClick={onKeepMine}
          >
            Keep my changes
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
