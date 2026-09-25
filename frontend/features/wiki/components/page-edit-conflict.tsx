"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { KbAlertCircleIcon } from "@/features/wiki/lib/kb-icons";
import type { KbPageEditConflict } from "@/features/wiki/lib/wiki-schema";
import { formatDateTime, formatRelativeTime } from "@/lib/date-utils";

interface PageEditConflictProps {
  conflict: KbPageEditConflict;
  isReloading: boolean;
  pendingFields?: readonly string[];
  onKeepMine: () => void;
  onDiscardMine: () => void;
}

function describePendingFields(fields: readonly string[]): string {
  const labels: Record<string, string> = {
    title: "title",
    content: "body",
    contentText: "body",
  };
  const unique = Array.from(
    new Set(fields.map((f) => labels[f] ?? f)),
  );
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0] ?? "";
  return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`;
}

export default function PageEditConflict({
  conflict,
  isReloading,
  pendingFields,
  onKeepMine,
  onDiscardMine,
}: PageEditConflictProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleOpenConfirm() {
    setConfirmOpen(true);
  }

  const editor = conflict.lastEditedByName ?? "Someone else";
  const when = formatRelativeTime(conflict.lastEditedAt);
  const exactly = formatDateTime(conflict.lastEditedAt);
  const localSummary =
    pendingFields && pendingFields.length > 0
      ? describePendingFields(pendingFields)
      : null;

  return (
    <>
      <div
        role="alert"
        className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-status-danger-rule bg-status-danger-surface px-3 py-2.5"
      >
        <KbAlertCircleIcon className="h-4 w-4 shrink-0 text-status-danger-ink" />
        <div className="flex-1 min-w-0 text-sm text-status-danger-ink space-y-0.5">
          <span>
            {editor} saved a newer version of this page
            {when ? (
              <>
                {" "}
                <time dateTime={conflict.lastEditedAt ?? undefined} title={exactly}>
                  {when}
                </time>
              </>
            ) : null}
            . Autosave is paused — nothing you typed has been lost or overwritten.
          </span>
          {localSummary && (
            <p className="text-xs text-status-danger-ink opacity-80">
              Your local changes: {localSummary}
            </p>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button size="sm" className="h-7" onClick={onKeepMine}>
            Keep my version
          </Button>
          <Button size="sm" variant="outline" className="h-7" onClick={handleOpenConfirm}>
            Load theirs
          </Button>
        </div>
      </div>

      <UnsavedChangesDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Load their version?"
        description={`Everything you have typed since ${editor} saved will be discarded and replaced by their version. This cannot be undone.`}
        keepEditingLabel="Keep editing"
        discardLabel="Discard mine and load theirs"
        onDiscard={onDiscardMine}
        isSaving={isReloading}
      />
    </>
  );
}
